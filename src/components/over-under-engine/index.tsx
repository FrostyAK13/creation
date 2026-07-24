import React, { useState, useRef, useCallback, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import './over-under-engine.scss';

// ─── constants ────────────────────────────────────────────────────────────────

const OVER_BARRIER  = '5';
const UNDER_BARRIER = '4';
const MAX_DIGITS    = 30;

/** Digits that act as entry triggers */
const ENTRY_DIGITS = new Set([4, 5]);

interface Market { symbol: string; label: string; short: string; }

const MARKETS: Market[] = [
    { symbol: '1HZ10V',  label: 'Volatility 10 (1s)',  short: 'V10 (1s)'  },
    { symbol: '1HZ25V',  label: 'Volatility 25 (1s)',  short: 'V25 (1s)'  },
    { symbol: '1HZ50V',  label: 'Volatility 50 (1s)',  short: 'V50 (1s)'  },
    { symbol: '1HZ75V',  label: 'Volatility 75 (1s)',  short: 'V75 (1s)'  },
    { symbol: '1HZ100V', label: 'Volatility 100 (1s)', short: 'V100 (1s)' },
    { symbol: 'R_10',    label: 'Volatility 10',        short: 'V10'       },
    { symbol: 'R_25',    label: 'Volatility 25',        short: 'V25'       },
    { symbol: 'R_50',    label: 'Volatility 50',        short: 'V50'       },
    { symbol: 'R_75',    label: 'Volatility 75',        short: 'V75'       },
    { symbol: 'R_100',   label: 'Volatility 100',       short: 'V100'      },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function getLastDigit(quote: number | string): number {
    const s = String(quote);
    return parseInt(s[s.length - 1], 10);
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

function nowTime(): string {
    return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

// ─── types ────────────────────────────────────────────────────────────────────

export interface TradeRecord {
    id:           number;
    time:         string;
    entryDigit:   number | null;   // digit that triggered this round (null = no entry mode)
    overResult:   'won' | 'lost';
    overStake:    number;
    overProfit:   number;          // signed (positive = won, negative = lost)
    underResult:  'won' | 'lost';
    underStake:   number;
    underProfit:  number;
    roundPnl:     number;          // overProfit + underProfit
    runningTotal: number;
}

interface EngineState {
    running:              boolean;
    baseStake:            number;
    martingale:           number;
    takeProfit:           number;
    stopLoss:             number;
    overStake:            number;
    underStake:           number;
    totalProfit:          number;
    overWins:             number;
    overLosses:           number;
    underWins:            number;
    underLosses:          number;
    overContractId:       number | null;
    underContractId:      number | null;
    overSettled:          boolean;
    underSettled:         boolean;
    overSubId:            string | null;
    underSubId:           string | null;
    tickSubId:            string | null;
    roundInFlight:        boolean;
    // entry-point
    useEntryMode:         boolean;
    waitingForEntry:      boolean;
    entryDigit:           number | null;
    // per-round profit tracking
    currentRoundOverStake:  number;
    currentRoundUnderStake: number;
    overRoundProfit:        number | null;
    underRoundProfit:       number | null;
    roundCounter:           number;
}

function makeInitState(
    stake: number,
    martingale: number,
    tp: number,
    sl: number,
    useEntry: boolean,
): EngineState {
    return {
        running: false,
        baseStake: stake,
        martingale,
        takeProfit: tp,
        stopLoss: sl,
        overStake: stake,
        underStake: stake,
        totalProfit: 0,
        overWins: 0,
        overLosses: 0,
        underWins: 0,
        underLosses: 0,
        overContractId: null,
        underContractId: null,
        overSettled: true,
        underSettled: true,
        overSubId: null,
        underSubId: null,
        tickSubId: null,
        roundInFlight: false,
        useEntryMode: useEntry,
        waitingForEntry: useEntry,
        entryDigit: null,
        currentRoundOverStake: stake,
        currentRoundUnderStake: stake,
        overRoundProfit: null,
        underRoundProfit: null,
        roundCounter: 0,
    };
}

// ─── component ────────────────────────────────────────────────────────────────

const OverUnderEngine: React.FC = observer(() => {
    const { client } = useStore();

    // Config
    const [stake, setStake]           = useState(0.35);
    const [martingale, setMartingale] = useState(2);
    const [takeProfit, setTakeProfit] = useState(5);
    const [stopLoss, setStopLoss]     = useState(5);
    const [symbol, setSymbol]         = useState('1HZ10V');
    const [marketOpen, setMarketOpen] = useState(false);
    const [entryMode, setEntryMode]   = useState(true);

    // Display state
    const [isRunning, setIsRunning]                       = useState(false);
    const [statusMsg, setStatusMsg]                       = useState('Ready to trade');
    const [digits, setDigits]                             = useState<number[]>([]);
    const [prices, setPrices]                             = useState<string[]>([]);
    const [totalProfit, setTotalProfit]                   = useState(0);
    const [overWins, setOverWins]                         = useState(0);
    const [overLosses, setOverLosses]                     = useState(0);
    const [underWins, setUnderWins]                       = useState(0);
    const [underLosses, setUnderLosses]                   = useState(0);
    const [overCurrentStake, setOverCurrentStake]         = useState(0.35);
    const [underCurrentStake, setUnderCurrentStake]       = useState(0.35);
    const [lastOverResult, setLastOverResult]             = useState<'won' | 'lost' | null>(null);
    const [lastUnderResult, setLastUnderResult]           = useState<'won' | 'lost' | null>(null);
    const [isWaitingEntry, setIsWaitingEntry]             = useState(false);
    const [lastEntryDigit, setLastEntryDigit]             = useState<number | null>(null);
    const [tradeHistory, setTradeHistory]                 = useState<TradeRecord[]>([]);

    const eng           = useRef<EngineState>(makeInitState(stake, martingale, takeProfit, stopLoss, entryMode));
    const msgSub        = useRef<{ unsubscribe: () => void } | null>(null);
    const passiveSub    = useRef<{ unsubscribe: () => void } | null>(null);
    const passiveTickId = useRef<string | null>(null);
    const fireRoundRef  = useRef<() => void>(() => {});
    const symbolRef     = useRef(symbol);
    useEffect(() => { symbolRef.current = symbol; }, [symbol]);

    // ── cleanup ───────────────────────────────────────────────────────────────

    const forgetId = useCallback((id: string | null) => {
        if (id && api_base.api) {
            try { (api_base.api as any).send({ forget: id }); } catch { /* ignore */ }
        }
    }, []);

    // ── passive tick subscription (always on when API ready) ─────────────────

    const stopPassiveSub = useCallback(() => {
        if (passiveTickId.current && api_base.api) {
            try { (api_base.api as any).send({ forget: passiveTickId.current }); } catch { /* ignore */ }
            passiveTickId.current = null;
        }
        if (passiveSub.current) { passiveSub.current.unsubscribe(); passiveSub.current = null; }
    }, []);

    const cleanupSubs = useCallback(() => {
        const e = eng.current;
        forgetId(e.overSubId);
        forgetId(e.underSubId);
        e.overSubId  = null;
        e.underSubId = null;
        if (msgSub.current) { msgSub.current.unsubscribe(); msgSub.current = null; }
    }, [forgetId]);

    // ── stop ──────────────────────────────────────────────────────────────────

    const stopEngine = useCallback((reason: string) => {
        eng.current.running       = false;
        eng.current.roundInFlight = false;
        eng.current.waitingForEntry = false;
        cleanupSubs();
        setIsRunning(false);
        setIsWaitingEntry(false);
        setStatusMsg(reason);
    }, [cleanupSubs]);

    // ── limits ────────────────────────────────────────────────────────────────

    const checkLimits = useCallback((): boolean => {
        const { totalProfit: profit, takeProfit: tp, stopLoss: sl } = eng.current;
        if (profit >= tp) { stopEngine(`✅ Take Profit hit (+${profit.toFixed(2)})`); return true; }
        if (profit <= -sl) { stopEngine(`🛑 Stop Loss hit (${profit.toFixed(2)})`); return true; }
        return false;
    }, [stopEngine]);

    // ── fire a round ──────────────────────────────────────────────────────────

    const fireRound = useCallback(async () => {
        const e = eng.current;
        if (!e.running || e.roundInFlight) return;

        e.roundInFlight = true;
        e.overSettled   = false;
        e.underSettled  = false;
        e.overRoundProfit  = null;
        e.underRoundProfit = null;
        // Snapshot stakes at fire time for history record
        e.currentRoundOverStake  = e.overStake;
        e.currentRoundUnderStake = e.underStake;

        setIsWaitingEntry(false);

        const currency = (api_base as any).account_info?.currency
            || (client as any).currency
            || 'USD';

        const makeBuy = (contract_type: string, barrier: string, amount: number) => ({
            buy: '1',
            price: amount,
            parameters: {
                amount,
                basis: 'stake',
                contract_type,
                currency,
                duration: 1,
                duration_unit: 't',
                barrier,
                underlying_symbol: symbolRef.current,
            },
        });

        const entryLabel = e.entryDigit !== null ? ` [entry: ${e.entryDigit}]` : '';
        setStatusMsg(`⚡ Placing Over 5 + Under 4${entryLabel}…`);

        try {
            const api = api_base.api as any;
            const [overRes, underRes] = await Promise.all([
                api.send(makeBuy('DIGITOVER',  OVER_BARRIER,  e.overStake)),
                api.send(makeBuy('DIGITUNDER', UNDER_BARRIER, e.underStake)),
            ]);

            e.overContractId  = overRes?.buy?.contract_id  ?? null;
            e.underContractId = underRes?.buy?.contract_id ?? null;

            if (e.overContractId) {
                const r = await api.send({ proposal_open_contract: 1, contract_id: e.overContractId, subscribe: 1 });
                e.overSubId = r?.subscription?.id ?? null;
            } else {
                e.overSettled = true;
            }
            if (e.underContractId) {
                const r = await api.send({ proposal_open_contract: 1, contract_id: e.underContractId, subscribe: 1 });
                e.underSubId = r?.subscription?.id ?? null;
            } else {
                e.underSettled = true;
            }

            setStatusMsg('Running — waiting for results…');
        } catch (err: any) {
            const msg = err?.error?.message || err?.message || 'Buy failed';
            e.overSettled  = true;
            e.underSettled = true;
            e.roundInFlight = false;
            setStatusMsg(`⚠ ${msg}`);
            setTimeout(() => { if (eng.current.running) fireRound(); }, 1500);
        }
    }, [client]); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep fireRoundRef in sync so passiveSub's closure always calls the latest version
    useEffect(() => { fireRoundRef.current = fireRound; }, [fireRound]);

    // ── settle ────────────────────────────────────────────────────────────────

    const onSettled = useCallback((contractId: number, won: boolean, profit: number) => {
        const e = eng.current;
        const isOver  = contractId === e.overContractId;
        const isUnder = contractId === e.underContractId;
        if (!isOver && !isUnder) return;

        e.totalProfit = round2(e.totalProfit + profit);
        setTotalProfit(e.totalProfit);

        if (isOver) {
            e.overSettled     = true;
            e.overRoundProfit = profit;
            if (won) { e.overWins++;   e.overStake = e.baseStake;                setLastOverResult('won'); }
            else     { e.overLosses++; e.overStake = round2(e.overStake * e.martingale); setLastOverResult('lost'); }
            setOverWins(e.overWins);
            setOverLosses(e.overLosses);
            setOverCurrentStake(e.overStake);
        }

        if (isUnder) {
            e.underSettled     = true;
            e.underRoundProfit = profit;
            if (won) { e.underWins++;   e.underStake = e.baseStake;                   setLastUnderResult('won'); }
            else     { e.underLosses++; e.underStake = round2(e.underStake * e.martingale); setLastUnderResult('lost'); }
            setUnderWins(e.underWins);
            setUnderLosses(e.underLosses);
            setUnderCurrentStake(e.underStake);
        }

        // Both sides done — log history, decide next step
        if (e.overSettled && e.underSettled) {
            e.roundCounter++;
            const overP   = e.overRoundProfit  ?? 0;
            const underP  = e.underRoundProfit ?? 0;
            const roundPnl = round2(overP + underP);

            const record: TradeRecord = {
                id:           e.roundCounter,
                time:         nowTime(),
                entryDigit:   e.useEntryMode ? e.entryDigit : null,
                overResult:   overP  >= 0 ? 'won' : 'lost',
                overStake:    e.currentRoundOverStake,
                overProfit:   overP,
                underResult:  underP >= 0 ? 'won' : 'lost',
                underStake:   e.currentRoundUnderStake,
                underProfit:  underP,
                roundPnl,
                runningTotal: e.totalProfit,
            };

            setTradeHistory(prev => [record, ...prev]);

            e.roundInFlight = false;
            e.entryDigit    = null;

            // Stop after every trade — check limits first, then stop with round result
            if (!checkLimits() && e.running) {
                const sign = roundPnl >= 0 ? '+' : '';
                stopEngine(`✅ Round complete — P&L: ${sign}${roundPnl.toFixed(2)} | Total: ${sign}${e.totalProfit.toFixed(2)}`);
            }
        }
    }, [checkLimits, fireRound]);

    // ── passive subscription: stream ticks as soon as a market is chosen ─────

    const startPassiveSub = useCallback(async (sym: string) => {
        if (!api_base.api) return;
        stopPassiveSub();
        setDigits([]);
        setPrices([]);

        passiveSub.current = (api_base.api as any).onMessage().subscribe((msg: any) => {
            if (msg?.tick?.quote !== undefined) {
                const d        = getLastDigit(msg.tick.quote);
                const priceStr = String(msg.tick.quote);
                setDigits(prev  => { const n = [...prev,  d];        return n.length > MAX_DIGITS ? n.slice(-MAX_DIGITS) : n; });
                setPrices(prev  => { const n = [...prev,  priceStr]; return n.length > MAX_DIGITS ? n.slice(-MAX_DIGITS) : n; });

                // Entry-point trigger (only active while engine is running)
                const e = eng.current;
                if (e.running && e.useEntryMode && e.waitingForEntry && !e.roundInFlight) {
                    if (ENTRY_DIGITS.has(d)) {
                        e.waitingForEntry = false;
                        e.entryDigit      = d;
                        setLastEntryDigit(d);
                        setIsWaitingEntry(false);
                        fireRoundRef.current();
                    }
                }
            }
        });

        try {
            const r = await (api_base.api as any).send({ ticks: sym, subscribe: 1 });
            passiveTickId.current = r?.subscription?.id ?? null;
        } catch { /* ignore — digits simply won't stream */ }
    }, [stopPassiveSub]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── start ─────────────────────────────────────────────────────────────────

    const startEngine = useCallback(async () => {
        if (eng.current.running) return;
        if (!api_base.api) { setStatusMsg('⚠ Not connected — please log in first'); return; }

        eng.current = makeInitState(stake, martingale, takeProfit, stopLoss, entryMode);
        eng.current.running = true;

        setIsRunning(true);
        setTotalProfit(0);
        setOverWins(0); setOverLosses(0);
        setUnderWins(0); setUnderLosses(0);
        setOverCurrentStake(stake);
        setUnderCurrentStake(stake);
        setLastOverResult(null);
        setLastUnderResult(null);
        setLastEntryDigit(null);
        setDigits([]);
        setPrices([]);
        setIsWaitingEntry(entryMode);
        setStatusMsg(entryMode ? '👀 Watching for entry digit 4 or 5…' : 'Connecting…');

        // Restart passive ticks so digit history is clean for this run
        await startPassiveSub(symbolRef.current);

        // msgSub handles contract results only — ticks are in passiveSub
        if (msgSub.current) msgSub.current.unsubscribe();
        msgSub.current = (api_base.api as any).onMessage().subscribe((msg: any) => {
            if (msg?.proposal_open_contract) {
                const poc = msg.proposal_open_contract;
                if (poc.status === 'won' || poc.status === 'lost') {
                    onSettled(poc.contract_id, poc.status === 'won', parseFloat(poc.profit ?? '0'));
                }
            }
        });

        try {
            if (!entryMode) {
                setStatusMsg('Connected — firing first round…');
                await fireRound();
            }
        } catch (err: any) {
            stopEngine(`⚠ ${err?.error?.message || err?.message || 'Failed to start'}`);
        }
    }, [stake, martingale, takeProfit, stopLoss, entryMode, fireRound, onSettled, startPassiveSub, stopEngine]);

    // Start passive ticks whenever the selected symbol changes (or on first mount)
    useEffect(() => {
        startPassiveSub(symbol);
    }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

    // Teardown on unmount — kill everything including the passive subscription
    useEffect(() => () => {
        eng.current.running = false;
        cleanupSubs();
        stopPassiveSub();
    }, [cleanupSubs, stopPassiveSub]);

    // ── render ────────────────────────────────────────────────────────────────

    const currency    = (client as any)?.currency || 'USD';
    const totalRounds = Math.max(overWins + overLosses, underWins + underLosses);
    const latestPrice = prices.length > 0 ? prices[prices.length - 1] : null;
    const latestPriceBody = latestPrice ? latestPrice.slice(0, -1) : '';
    const latestPriceDigit = latestPrice ? latestPrice.slice(-1) : '';
    const profitPct   = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;
    const activeMarket = MARKETS.find(m => m.symbol === symbol) ?? MARKETS[0];

    return (
        <div className='oue'>

            {/* ── digit strip ── */}
            <div className='oue__header'>
                <div className='oue__title'>
                    <span className='oue__title-icon'>⚡</span>
                    <span>OVER 5 / UNDER 4 ENGINE</span>

                    {/* entry-mode indicator badge */}
                    {entryMode && (
                        <span className='oue__entry-badge'>
                            Entry: <strong>4</strong> or <strong>5</strong>
                            {isWaitingEntry && <span className='oue__entry-pulse' />}
                        </span>
                    )}

                    {/* market selector */}
                    <div className={`oue__market-selector oue__market-selector--header${marketOpen ? ' oue__market-selector--open' : ''}`}>
                        <button
                            className='oue__market-trigger oue__market-trigger--header'
                            onClick={() => !isRunning && setMarketOpen(o => !o)}
                            disabled={isRunning}
                            type='button'
                            title='Change market'
                        >
                            <span className='oue__market-trigger-short'>
                                {MARKETS.find(m => m.symbol === symbol)?.short ?? symbol}
                            </span>
                            <span className={`oue__market-chevron${marketOpen ? ' oue__market-chevron--open' : ''}`}>▼</span>
                        </button>
                        {marketOpen && (
                            <div className='oue__market-dropdown'>
                                <div className='oue__market-grid'>
                                    {MARKETS.map(m => (
                                        <button
                                            key={m.symbol}
                                            className={`oue__market-btn${symbol === m.symbol ? ' oue__market-btn--active' : ''}`}
                                            onClick={() => { setSymbol(m.symbol); setMarketOpen(false); }}
                                            disabled={isRunning}
                                            title={m.label}
                                            type='button'
                                        >
                                            {m.short}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* digit row */}
                <div className='oue__digits'>
                    {digits.length === 0 ? (
                        <span className='oue__digit-empty'>{api_base.api ? 'Connecting to market…' : 'Log in to see live digits'}</span>
                    ) : digits.map((d, i) => {
                        const isLast    = i === digits.length - 1;
                        const isEntry   = ENTRY_DIGITS.has(d);
                        let cls = 'oue__digit';
                        if (d > 5)        cls += ' oue__digit--over';
                        else if (d < 4)   cls += ' oue__digit--under';
                        else              cls += ' oue__digit--neutral';
                        if (isLast)       cls += ' oue__digit--last';
                        if (isEntry && entryMode) cls += ' oue__digit--entry';
                        const price = prices[i] ?? '';
                        // Highlight the last digit within the price string
                        const priceBody = price.slice(0, -1);
                        const priceLastChar = price.slice(-1);
                        return (
                            <span key={i} className={`oue__tick${isLast ? ' oue__tick--last' : ''}`}>
                                <span className='oue__tick-price'>
                                    <span className='oue__tick-price-body'>{priceBody}</span>
                                    <span className={`oue__tick-price-digit${isLast ? ' oue__tick-price-digit--last' : ''}`}>{priceLastChar}</span>
                                </span>
                                <span className={cls}>{d}</span>
                            </span>
                        );
                    })}
                </div>

                <div className='oue__digit-legend'>
                    <span className='oue__legend-dot oue__legend-dot--over'/>Over 5 (6–9)
                    {entryMode && <><span className='oue__legend-dot oue__legend-dot--entry'/>Entry (4–5)</>}
                    <span className='oue__legend-dot oue__legend-dot--neutral'/>Neutral
                    <span className='oue__legend-dot oue__legend-dot--under'/>Under 4 (0–3)
                </div>

                {/* waiting-for-entry status */}
                {isWaitingEntry && (
                    <div className='oue__entry-waiting'>
                        <span className='oue__entry-waiting-dot' />
                        Watching for digit <strong>4</strong> or <strong>5</strong> to trigger next trade…
                        {lastEntryDigit !== null && (
                            <span className='oue__entry-last'>Last entry: <strong>{lastEntryDigit}</strong></span>
                        )}
                    </div>
                )}
            </div>

            {/* ── two side panels ── */}
            <div className='oue__panels'>
                <div className={`oue__panel oue__panel--over${lastOverResult ? ` oue__panel--${lastOverResult}` : ''}`}>
                    <div className='oue__panel-top'>
                        <span className='oue__panel-name'>OVER 5</span>
                        <span className='oue__panel-win-pct'>{profitPct(overWins, overWins + overLosses)}% win</span>
                    </div>
                    <div className='oue__panel-subtitle'>Digit must be 6, 7, 8, or 9</div>
                    <div className='oue__panel-stats'>
                        <div className='oue__stat'><span className='oue__stat-label'>Stake</span><span className='oue__stat-val'>{overCurrentStake.toFixed(2)}</span></div>
                        <div className='oue__stat oue__stat--win'><span className='oue__stat-label'>Wins</span><span className='oue__stat-val'>{overWins}</span></div>
                        <div className='oue__stat oue__stat--loss'><span className='oue__stat-label'>Losses</span><span className='oue__stat-val'>{overLosses}</span></div>
                    </div>
                    {lastOverResult && <div className={`oue__badge oue__badge--${lastOverResult}`}>{lastOverResult === 'won' ? '✓ WIN' : '✗ LOSS'}</div>}
                </div>

                <div className={`oue__panel oue__panel--under${lastUnderResult ? ` oue__panel--${lastUnderResult}` : ''}`}>
                    <div className='oue__panel-top'>
                        <span className='oue__panel-name'>UNDER 4</span>
                        <span className='oue__panel-win-pct'>{profitPct(underWins, underWins + underLosses)}% win</span>
                    </div>
                    <div className='oue__panel-subtitle'>Digit must be 0, 1, 2, or 3</div>
                    <div className='oue__panel-stats'>
                        <div className='oue__stat'><span className='oue__stat-label'>Stake</span><span className='oue__stat-val'>{underCurrentStake.toFixed(2)}</span></div>
                        <div className='oue__stat oue__stat--win'><span className='oue__stat-label'>Wins</span><span className='oue__stat-val'>{underWins}</span></div>
                        <div className='oue__stat oue__stat--loss'><span className='oue__stat-label'>Losses</span><span className='oue__stat-val'>{underLosses}</span></div>
                    </div>
                    {lastUnderResult && <div className={`oue__badge oue__badge--${lastUnderResult}`}>{lastUnderResult === 'won' ? '✓ WIN' : '✗ LOSS'}</div>}
                </div>
            </div>

            {/* ── summary bar ── */}
            <div className='oue__summary'>
                <div className='oue__pnl'>
                    <span className='oue__pnl-label'>Total P&amp;L</span>
                    <span className={`oue__pnl-val${totalProfit > 0 ? ' oue__pnl-val--pos' : totalProfit < 0 ? ' oue__pnl-val--neg' : ''}`}>
                        {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} {currency}
                    </span>
                </div>

                <div className='oue__live-price'>
                    <span className='oue__live-price-label'>Live Price</span>
                    {latestPrice ? (
                        <span className='oue__live-price-val'>
                            <span className='oue__live-price-body'>{latestPriceBody}</span>
                            <span className='oue__live-price-digit'>{latestPriceDigit}</span>
                        </span>
                    ) : (
                        <span className='oue__live-price-empty'>—</span>
                    )}
                </div>

                <div className='oue__rounds'><span className='oue__rounds-label'>Rounds</span><span className='oue__rounds-val'>{totalRounds}</span></div>
                <div className='oue__rounds'><span className='oue__rounds-label'>Market</span><span className='oue__rounds-val' style={{ fontSize: '1.1rem' }}>{activeMarket.short}</span></div>
            </div>

            {/* ── TP/SL bars ── */}
            <div className='oue__bars'>
                <div className='oue__bar'>
                    <span className='oue__bar-label oue__bar-label--tp'>TP&nbsp;<strong>+{takeProfit}</strong></span>
                    <div className='oue__bar-track'>
                        <div className='oue__bar-fill oue__bar-fill--tp' style={{ width: `${Math.min(100, Math.max(0, (totalProfit / takeProfit) * 100))}%` }} />
                    </div>
                    <span className='oue__bar-pct'>{Math.min(100, Math.max(0, Math.round((totalProfit / takeProfit) * 100)))}%</span>
                </div>
                <div className='oue__bar'>
                    <span className='oue__bar-label oue__bar-label--sl'>SL&nbsp;<strong>-{stopLoss}</strong></span>
                    <div className='oue__bar-track'>
                        <div className='oue__bar-fill oue__bar-fill--sl' style={{ width: `${Math.min(100, Math.max(0, (-totalProfit / stopLoss) * 100))}%` }} />
                    </div>
                    <span className='oue__bar-pct'>{Math.min(100, Math.max(0, Math.round((-totalProfit / stopLoss) * 100)))}%</span>
                </div>
            </div>

            {/* ── controls ── */}
            <div className='oue__controls'>
                <div className='oue__config'>
                    <label className='oue__field'>
                        <span>Stake ({currency})</span>
                        <input type='number' min='0.35' step='0.05' value={stake} onChange={e => setStake(parseFloat(e.target.value) || 0.35)} disabled={isRunning} className='oue__input' />
                    </label>
                    <label className='oue__field'>
                        <span>Martingale ×</span>
                        <input type='number' min='1' max='10' step='0.5' value={martingale} onChange={e => setMartingale(parseFloat(e.target.value) || 2)} disabled={isRunning} className='oue__input' />
                    </label>
                    <label className='oue__field'>
                        <span>Take Profit</span>
                        <input type='number' min='0.5' step='0.5' value={takeProfit} onChange={e => setTakeProfit(parseFloat(e.target.value) || 5)} disabled={isRunning} className='oue__input' />
                    </label>
                    <label className='oue__field'>
                        <span>Stop Loss</span>
                        <input type='number' min='0.5' step='0.5' value={stopLoss} onChange={e => setStopLoss(parseFloat(e.target.value) || 5)} disabled={isRunning} className='oue__input' />
                    </label>
                </div>

                {/* entry mode toggle */}
                <label className='oue__entry-toggle'>
                    <span className='oue__entry-toggle-label'>
                        Entry point mode
                        <span className='oue__entry-toggle-hint'>Fire only when digit 4 or 5 appears</span>
                    </span>
                    <div
                        className={`oue__toggle${entryMode ? ' oue__toggle--on' : ''}`}
                        onClick={() => !isRunning && setEntryMode(v => !v)}
                        role='switch'
                        aria-checked={entryMode}
                        aria-disabled={isRunning}
                        tabIndex={0}
                        onKeyDown={e => { if (!isRunning && (e.key === ' ' || e.key === 'Enter')) setEntryMode(v => !v); }}
                    >
                        <div className='oue__toggle-thumb' />
                    </div>
                </label>

                <div className='oue__action'>
                    <div className={`oue__status${isRunning ? ' oue__status--running' : ''}`}>
                        {isRunning && <span className='oue__pulse' />}
                        {statusMsg}
                    </div>
                    {!isRunning ? (
                        <button className='oue__btn oue__btn--start' onClick={startEngine}>▶&nbsp;START ENGINE</button>
                    ) : (
                        <button className='oue__btn oue__btn--stop' onClick={() => stopEngine('Stopped by user')}>■&nbsp;STOP</button>
                    )}
                </div>
            </div>

            {/* ── trade history ── */}
            <div className='oue__history'>
                <div className='oue__history-header'>
                    <span className='oue__history-title'>📋 Trade History</span>
                    <span className='oue__history-count'>{tradeHistory.length} trade{tradeHistory.length !== 1 ? 's' : ''}</span>
                    <button
                        className='oue__history-reset'
                        onClick={() => setTradeHistory([])}
                        disabled={tradeHistory.length === 0}
                        type='button'
                    >
                        ↺ Reset
                    </button>
                </div>

                {tradeHistory.length === 0 ? (
                    <div className='oue__history-empty'>
                        No trades yet — start the engine to record history
                    </div>
                ) : (
                    <div className='oue__history-scroll'>
                        <table className='oue__history-table'>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Time</th>
                                    {tradeHistory.some(r => r.entryDigit !== null) && <th>Entry</th>}
                                    <th>Over 5</th>
                                    <th>O. Stake</th>
                                    <th>O. P&amp;L</th>
                                    <th>Under 4</th>
                                    <th>U. Stake</th>
                                    <th>U. P&amp;L</th>
                                    <th>Round</th>
                                    <th>Running</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tradeHistory.map(r => {
                                    const showEntry = tradeHistory.some(h => h.entryDigit !== null);
                                    return (
                                        <tr key={r.id} className={r.roundPnl >= 0 ? 'oue__history-row--pos' : 'oue__history-row--neg'}>
                                            <td className='oue__history-id'>{r.id}</td>
                                            <td className='oue__history-time'>{r.time}</td>
                                            {showEntry && (
                                                <td>
                                                    {r.entryDigit !== null
                                                        ? <span className='oue__history-entry-digit'>{r.entryDigit}</span>
                                                        : <span className='oue__history-na'>—</span>}
                                                </td>
                                            )}
                                            <td><span className={`oue__history-result oue__history-result--${r.overResult}`}>{r.overResult === 'won' ? '✓ W' : '✗ L'}</span></td>
                                            <td className='oue__history-num'>{r.overStake.toFixed(2)}</td>
                                            <td className={`oue__history-num ${r.overProfit >= 0 ? 'oue__history-pos' : 'oue__history-neg'}`}>
                                                {r.overProfit >= 0 ? '+' : ''}{r.overProfit.toFixed(2)}
                                            </td>
                                            <td><span className={`oue__history-result oue__history-result--${r.underResult}`}>{r.underResult === 'won' ? '✓ W' : '✗ L'}</span></td>
                                            <td className='oue__history-num'>{r.underStake.toFixed(2)}</td>
                                            <td className={`oue__history-num ${r.underProfit >= 0 ? 'oue__history-pos' : 'oue__history-neg'}`}>
                                                {r.underProfit >= 0 ? '+' : ''}{r.underProfit.toFixed(2)}
                                            </td>
                                            <td className={`oue__history-num oue__history-round ${r.roundPnl >= 0 ? 'oue__history-pos' : 'oue__history-neg'}`}>
                                                {r.roundPnl >= 0 ? '+' : ''}{r.roundPnl.toFixed(2)}
                                            </td>
                                            <td className={`oue__history-num ${r.runningTotal >= 0 ? 'oue__history-pos' : 'oue__history-neg'}`}>
                                                {r.runningTotal >= 0 ? '+' : ''}{r.runningTotal.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
});

export default OverUnderEngine;
