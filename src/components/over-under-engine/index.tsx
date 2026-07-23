import React, { useState, useRef, useCallback, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import './over-under-engine.scss';

// ─── constants ────────────────────────────────────────────────────────────────

const OVER_BARRIER  = '5';   // Win when last digit > 5 (i.e. 6-9)
const UNDER_BARRIER = '4';   // Win when last digit < 4 (i.e. 0-3)
const MAX_DIGITS    = 30;

interface Market {
    symbol: string;
    label:  string;
    short:  string;
}

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

// ─── engine state (mutable, lives in a ref) ───────────────────────────────────

type Side = 'over' | 'under';

interface EngineState {
    running: boolean;
    baseStake: number;
    martingale: number;
    takeProfit: number;
    stopLoss: number;
    overStake: number;
    underStake: number;
    totalProfit: number;
    overWins: number;
    overLosses: number;
    underWins: number;
    underLosses: number;
    overContractId: number | null;
    underContractId: number | null;
    overSettled: boolean;
    underSettled: boolean;
    overSubId: string | null;
    underSubId: string | null;
    tickSubId: string | null;
    roundInFlight: boolean;
}

function makeInitState(stake: number, martingale: number, tp: number, sl: number): EngineState {
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
    };
}

// ─── component ────────────────────────────────────────────────────────────────

const OverUnderEngine: React.FC = observer(() => {
    const { client } = useStore();

    // Config (form inputs — only read at start)
    const [stake, setStake]           = useState(0.35);
    const [martingale, setMartingale] = useState(2);
    const [takeProfit, setTakeProfit] = useState(5);
    const [stopLoss, setStopLoss]     = useState(5);
    const [symbol, setSymbol]         = useState('1HZ10V');
    const [marketOpen, setMarketOpen] = useState(false);

    // Display state (driven by engine, synced via setState calls)
    const [isRunning, setIsRunning]             = useState(false);
    const [statusMsg, setStatusMsg]             = useState('Ready to trade');
    const [digits, setDigits]                   = useState<number[]>([]);
    const [totalProfit, setTotalProfit]         = useState(0);
    const [overWins, setOverWins]               = useState(0);
    const [overLosses, setOverLosses]           = useState(0);
    const [underWins, setUnderWins]             = useState(0);
    const [underLosses, setUnderLosses]         = useState(0);
    const [overCurrentStake, setOverCurrentStake] = useState(0.35);
    const [underCurrentStake, setUnderCurrentStake] = useState(0.35);
    const [lastOverResult, setLastOverResult]   = useState<'won' | 'lost' | null>(null);
    const [lastUnderResult, setLastUnderResult] = useState<'won' | 'lost' | null>(null);

    // Mutable engine state
    const eng = useRef<EngineState>(makeInitState(stake, martingale, takeProfit, stopLoss));
    const msgSub = useRef<{ unsubscribe: () => void } | null>(null);
    // Keep symbol accessible inside async callbacks without stale-closure issues
    const symbolRef = useRef(symbol);
    useEffect(() => { symbolRef.current = symbol; }, [symbol]);

    // ── cleanup helpers ───────────────────────────────────────────────────────

    const forgetId = useCallback((id: string | null) => {
        if (id && api_base.api) {
            try { (api_base.api as any).send({ forget: id }); } catch { /* ignore */ }
        }
    }, []);

    const cleanupSubs = useCallback(() => {
        const e = eng.current;
        forgetId(e.tickSubId);
        forgetId(e.overSubId);
        forgetId(e.underSubId);
        e.tickSubId = null;
        e.overSubId = null;
        e.underSubId = null;
        if (msgSub.current) { msgSub.current.unsubscribe(); msgSub.current = null; }
    }, [forgetId]);

    // ── stop ──────────────────────────────────────────────────────────────────

    const stopEngine = useCallback((reason: string) => {
        eng.current.running = false;
        eng.current.roundInFlight = false;
        cleanupSubs();
        setIsRunning(false);
        setStatusMsg(reason);
    }, [cleanupSubs]);

    // ── check profit limits ───────────────────────────────────────────────────

    const checkLimits = useCallback((): boolean => {
        const { totalProfit: profit, takeProfit: tp, stopLoss: sl } = eng.current;
        if (profit >= tp) {
            stopEngine(`✅ Take Profit hit (+${profit.toFixed(2)})`);
            return true;
        }
        if (profit <= -sl) {
            stopEngine(`🛑 Stop Loss hit (${profit.toFixed(2)})`);
            return true;
        }
        return false;
    }, [stopEngine]);

    // ── fire one round (both contracts) ──────────────────────────────────────

    const fireRound = useCallback(async () => {
        const e = eng.current;
        if (!e.running || e.roundInFlight) return;

        e.roundInFlight = true;
        e.overSettled   = false;
        e.underSettled  = false;

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

        setStatusMsg('⚡ Placing Over 5 + Under 4…');

        try {
            const api = api_base.api as any;

            // Place both contracts simultaneously
            const [overRes, underRes] = await Promise.all([
                api.send(makeBuy('DIGITOVER',  OVER_BARRIER,  e.overStake)),
                api.send(makeBuy('DIGITUNDER', UNDER_BARRIER, e.underStake)),
            ]);

            const overCid  = overRes?.buy?.contract_id  ?? null;
            const underCid = underRes?.buy?.contract_id ?? null;

            e.overContractId  = overCid;
            e.underContractId = underCid;

            // Subscribe to contract updates for result tracking
            if (overCid) {
                const r = await api.send({ proposal_open_contract: 1, contract_id: overCid,  subscribe: 1 });
                e.overSubId  = r?.subscription?.id ?? null;
            } else {
                e.overSettled = true;
            }
            if (underCid) {
                const r = await api.send({ proposal_open_contract: 1, contract_id: underCid, subscribe: 1 });
                e.underSubId = r?.subscription?.id ?? null;
            } else {
                e.underSettled = true;
            }

            setStatusMsg('Running — waiting for results…');
        } catch (err: any) {
            const msg = err?.error?.message || err?.message || 'Buy failed';
            e.overSettled = true;
            e.underSettled = true;
            e.roundInFlight = false;
            setStatusMsg(`⚠ ${msg}`);
            // Retry after a short pause if still running
            setTimeout(() => { if (eng.current.running) fireRound(); }, 1500);
        }
    }, [client]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── handle a settled contract ─────────────────────────────────────────────

    const onSettled = useCallback((contractId: number, won: boolean, profit: number) => {
        const e = eng.current;
        const isOver  = contractId === e.overContractId;
        const isUnder = contractId === e.underContractId;
        if (!isOver && !isUnder) return;

        e.totalProfit = round2(e.totalProfit + profit);
        setTotalProfit(e.totalProfit);

        if (isOver) {
            e.overSettled = true;
            if (won) {
                e.overWins++;
                e.overStake = e.baseStake;
                setLastOverResult('won');
            } else {
                e.overLosses++;
                e.overStake = round2(e.overStake * e.martingale);
                setLastOverResult('lost');
            }
            setOverWins(e.overWins);
            setOverLosses(e.overLosses);
            setOverCurrentStake(e.overStake);
        }

        if (isUnder) {
            e.underSettled = true;
            if (won) {
                e.underWins++;
                e.underStake = e.baseStake;
                setLastUnderResult('won');
            } else {
                e.underLosses++;
                e.underStake = round2(e.underStake * e.martingale);
                setLastUnderResult('lost');
            }
            setUnderWins(e.underWins);
            setUnderLosses(e.underLosses);
            setUnderCurrentStake(e.underStake);
        }

        // When both sides are settled, decide next action
        if (e.overSettled && e.underSettled) {
            e.roundInFlight = false;
            if (!checkLimits() && e.running) {
                setTimeout(() => { if (eng.current.running) fireRound(); }, 300);
            }
        }
    }, [checkLimits, fireRound]);

    // ── start ─────────────────────────────────────────────────────────────────

    const startEngine = useCallback(async () => {
        if (eng.current.running) return;
        if (!api_base.api) {
            setStatusMsg('⚠ Not connected — please log in first');
            return;
        }

        // Reset everything
        eng.current = makeInitState(stake, martingale, takeProfit, stopLoss);
        eng.current.running = true;

        setIsRunning(true);
        setTotalProfit(0);
        setOverWins(0); setOverLosses(0);
        setUnderWins(0); setUnderLosses(0);
        setOverCurrentStake(stake);
        setUnderCurrentStake(stake);
        setLastOverResult(null);
        setLastUnderResult(null);
        setDigits([]);
        setStatusMsg('Connecting…');

        // Global message handler
        if (msgSub.current) msgSub.current.unsubscribe();
        msgSub.current = (api_base.api as any).onMessage().subscribe((msg: any) => {
            // Live digit ticker
            if (msg?.tick?.quote !== undefined) {
                const d = getLastDigit(msg.tick.quote);
                setDigits(prev => {
                    const next = [...prev, d];
                    return next.length > MAX_DIGITS ? next.slice(-MAX_DIGITS) : next;
                });
            }

            // Contract result
            if (msg?.proposal_open_contract) {
                const poc = msg.proposal_open_contract;
                if (poc.status === 'won' || poc.status === 'lost') {
                    onSettled(poc.contract_id, poc.status === 'won', parseFloat(poc.profit ?? '0'));
                }
            }
        });

        // Subscribe to live ticks for digit display
        try {
            const api = api_base.api as any;
            const tickRes = await api.send({ ticks: symbolRef.current, subscribe: 1 });
            eng.current.tickSubId = tickRes?.subscription?.id ?? null;
            setStatusMsg('Connected — firing first round…');
            await fireRound();
        } catch (err: any) {
            const msg = err?.error?.message || err?.message || 'Failed to start';
            stopEngine(`⚠ ${msg}`);
        }
    }, [stake, martingale, takeProfit, stopLoss, fireRound, onSettled, stopEngine]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            eng.current.running = false;
            cleanupSubs();
        };
    }, [cleanupSubs]);

    // ── render ────────────────────────────────────────────────────────────────

    const currency     = (client as any)?.currency || 'USD';
    const totalRounds  = Math.max(overWins + overLosses, underWins + underLosses);
    const profitPct    = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;
    const activeMarket = MARKETS.find(m => m.symbol === symbol) ?? MARKETS[0];

    return (
        <div className='oue'>

            {/* ── live digit strip ── */}
            <div className='oue__header'>
                <div className='oue__title'>
                    <span className='oue__title-icon'>⚡</span>
                    <span>OVER 5 / UNDER 4 ENGINE</span>
                    <span className='oue__title-sym'>Vol 10 (1s)</span>
                </div>
                <div className='oue__digits'>
                    {digits.length === 0 ? (
                        <span className='oue__digit-empty'>Start engine to see live digits</span>
                    ) : digits.map((d, i) => {
                        const isLast = i === digits.length - 1;
                        let cls = 'oue__digit';
                        if (d > 5)      cls += ' oue__digit--over';
                        else if (d < 4) cls += ' oue__digit--under';
                        else            cls += ' oue__digit--neutral';
                        if (isLast)     cls += ' oue__digit--last';
                        return <span key={i} className={cls}>{d}</span>;
                    })}
                </div>
                <div className='oue__digit-legend'>
                    <span className='oue__legend-dot oue__legend-dot--over'/>Over 5 (6–9)
                    <span className='oue__legend-dot oue__legend-dot--neutral'/>Neutral (4–5)
                    <span className='oue__legend-dot oue__legend-dot--under'/>Under 4 (0–3)
                </div>
            </div>

            {/* ── two side panels ── */}
            <div className='oue__panels'>

                {/* OVER 5 */}
                <div className={`oue__panel oue__panel--over${lastOverResult ? ` oue__panel--${lastOverResult}` : ''}`}>
                    <div className='oue__panel-top'>
                        <span className='oue__panel-name'>OVER 5</span>
                        <span className='oue__panel-win-pct'>
                            {profitPct(overWins, overWins + overLosses)}% win
                        </span>
                    </div>
                    <div className='oue__panel-subtitle'>Digit must be 6, 7, 8, or 9</div>
                    <div className='oue__panel-stats'>
                        <div className='oue__stat'>
                            <span className='oue__stat-label'>Stake</span>
                            <span className='oue__stat-val'>{overCurrentStake.toFixed(2)}</span>
                        </div>
                        <div className='oue__stat oue__stat--win'>
                            <span className='oue__stat-label'>Wins</span>
                            <span className='oue__stat-val'>{overWins}</span>
                        </div>
                        <div className='oue__stat oue__stat--loss'>
                            <span className='oue__stat-label'>Losses</span>
                            <span className='oue__stat-val'>{overLosses}</span>
                        </div>
                    </div>
                    {lastOverResult && (
                        <div className={`oue__badge oue__badge--${lastOverResult}`}>
                            {lastOverResult === 'won' ? '✓ WIN' : '✗ LOSS'}
                        </div>
                    )}
                </div>

                {/* UNDER 4 */}
                <div className={`oue__panel oue__panel--under${lastUnderResult ? ` oue__panel--${lastUnderResult}` : ''}`}>
                    <div className='oue__panel-top'>
                        <span className='oue__panel-name'>UNDER 4</span>
                        <span className='oue__panel-win-pct'>
                            {profitPct(underWins, underWins + underLosses)}% win
                        </span>
                    </div>
                    <div className='oue__panel-subtitle'>Digit must be 0, 1, 2, or 3</div>
                    <div className='oue__panel-stats'>
                        <div className='oue__stat'>
                            <span className='oue__stat-label'>Stake</span>
                            <span className='oue__stat-val'>{underCurrentStake.toFixed(2)}</span>
                        </div>
                        <div className='oue__stat oue__stat--win'>
                            <span className='oue__stat-label'>Wins</span>
                            <span className='oue__stat-val'>{underWins}</span>
                        </div>
                        <div className='oue__stat oue__stat--loss'>
                            <span className='oue__stat-label'>Losses</span>
                            <span className='oue__stat-val'>{underLosses}</span>
                        </div>
                    </div>
                    {lastUnderResult && (
                        <div className={`oue__badge oue__badge--${lastUnderResult}`}>
                            {lastUnderResult === 'won' ? '✓ WIN' : '✗ LOSS'}
                        </div>
                    )}
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
                <div className='oue__rounds'>
                    <span className='oue__rounds-label'>Rounds</span>
                    <span className='oue__rounds-val'>{totalRounds}</span>
                </div>
                <div className='oue__rounds'>
                    <span className='oue__rounds-label'>Market</span>
                    <span className='oue__rounds-val' style={{ fontSize: '1.1rem' }}>{activeMarket.short}</span>
                </div>
            </div>

            {/* ── TP / SL progress ── */}
            <div className='oue__bars'>
                <div className='oue__bar'>
                    <span className='oue__bar-label oue__bar-label--tp'>
                        TP&nbsp;<strong>+{takeProfit}</strong>
                    </span>
                    <div className='oue__bar-track'>
                        <div
                            className='oue__bar-fill oue__bar-fill--tp'
                            style={{ width: `${Math.min(100, Math.max(0, (totalProfit / takeProfit) * 100))}%` }}
                        />
                    </div>
                    <span className='oue__bar-pct'>
                        {Math.min(100, Math.max(0, Math.round((totalProfit / takeProfit) * 100)))}%
                    </span>
                </div>
                <div className='oue__bar'>
                    <span className='oue__bar-label oue__bar-label--sl'>
                        SL&nbsp;<strong>-{stopLoss}</strong>
                    </span>
                    <div className='oue__bar-track'>
                        <div
                            className='oue__bar-fill oue__bar-fill--sl'
                            style={{ width: `${Math.min(100, Math.max(0, (-totalProfit / stopLoss) * 100))}%` }}
                        />
                    </div>
                    <span className='oue__bar-pct'>
                        {Math.min(100, Math.max(0, Math.round((-totalProfit / stopLoss) * 100)))}%
                    </span>
                </div>
            </div>

            {/* ── controls ── */}
            <div className='oue__controls'>
                <div className='oue__config'>
                    <label className='oue__field'>
                        <span>Stake ({currency})</span>
                        <input
                            type='number' min='0.35' step='0.05'
                            value={stake}
                            onChange={e => setStake(parseFloat(e.target.value) || 0.35)}
                            disabled={isRunning}
                            className='oue__input'
                        />
                    </label>
                    <label className='oue__field'>
                        <span>Martingale ×</span>
                        <input
                            type='number' min='1' max='10' step='0.5'
                            value={martingale}
                            onChange={e => setMartingale(parseFloat(e.target.value) || 2)}
                            disabled={isRunning}
                            className='oue__input'
                        />
                    </label>
                    <label className='oue__field'>
                        <span>Take Profit</span>
                        <input
                            type='number' min='0.5' step='0.5'
                            value={takeProfit}
                            onChange={e => setTakeProfit(parseFloat(e.target.value) || 5)}
                            disabled={isRunning}
                            className='oue__input'
                        />
                    </label>
                    <label className='oue__field'>
                        <span>Stop Loss</span>
                        <input
                            type='number' min='0.5' step='0.5'
                            value={stopLoss}
                            onChange={e => setStopLoss(parseFloat(e.target.value) || 5)}
                            disabled={isRunning}
                            className='oue__input'
                        />
                    </label>
                </div>

                {/* ── market selector (collapsible) ── */}
                <div className={`oue__market-selector${marketOpen ? ' oue__market-selector--open' : ''}${isRunning ? ' oue__market-selector--disabled' : ''}`}>
                    <button
                        className='oue__market-trigger'
                        onClick={() => !isRunning && setMarketOpen(o => !o)}
                        disabled={isRunning}
                        type='button'
                    >
                        <span className='oue__market-trigger-label'>Market</span>
                        <span className='oue__market-trigger-value'>
                            {MARKETS.find(m => m.symbol === symbol)?.label ?? symbol}
                        </span>
                        <span className={`oue__market-chevron${marketOpen ? ' oue__market-chevron--open' : ''}`}>▼</span>
                    </button>
                    <div className={`oue__market-body${marketOpen ? ' oue__market-body--open' : ''}`}>
                        <div className='oue__market-body-inner'>
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
                    </div>
                </div>

                <div className='oue__action'>
                    <div className={`oue__status${isRunning ? ' oue__status--running' : ''}`}>
                        {isRunning && <span className='oue__pulse' />}
                        {statusMsg}
                    </div>
                    {!isRunning ? (
                        <button className='oue__btn oue__btn--start' onClick={startEngine}>
                            ▶&nbsp;START ENGINE
                        </button>
                    ) : (
                        <button className='oue__btn oue__btn--stop' onClick={() => stopEngine('Stopped by user')}>
                            ■&nbsp;STOP
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
});

export default OverUnderEngine;
