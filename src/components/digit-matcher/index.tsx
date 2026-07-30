import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api_base } from '@/external/bot-skeleton';
import { localize } from '@deriv-com/translations';
import { useStore } from '@/hooks/useStore';
import { contract_stages } from '@/constants/contract-stage';
import './digit-matcher.scss';

const DIGITS = Array.from({ length: 10 }, (_, i) => i);
const MAX_DIGITS = 1000;

interface Market { symbol: string; label: string; short: string; code: string; }
const MARKETS: Market[] = [
    { symbol: '1HZ10V', label: 'Volatility 10 (1s) Index', short: 'V10 (1s)', code: '10\n(1s)' },
    { symbol: '1HZ25V', label: 'Volatility 25 (1s) Index', short: 'V25 (1s)', code: '25\n(1s)' },
    { symbol: '1HZ50V', label: 'Volatility 50 (1s) Index', short: 'V50 (1s)', code: '50\n(1s)' },
    { symbol: '1HZ75V', label: 'Volatility 75 (1s) Index', short: 'V75 (1s)', code: '75\n(1s)' },
    { symbol: '1HZ100V', label: 'Volatility 100 (1s) Index', short: 'V100 (1s)', code: '100\n(1s)' },
    { symbol: 'R_10', label: 'Volatility 10 Index', short: 'V10', code: '10' },
    { symbol: 'R_25', label: 'Volatility 25 Index', short: 'V25', code: '25' },
    { symbol: 'R_50', label: 'Volatility 50 Index', short: 'V50', code: '50' },
    { symbol: 'R_75', label: 'Volatility 75 Index', short: 'V75', code: '75' },
    { symbol: 'R_100', label: 'Volatility 100 Index', short: 'V100', code: '100' },
];

function getDecimalPlaces(pipSize: number): number {
    if (!Number.isFinite(pipSize) || pipSize <= 0) return 0;
    if (Number.isInteger(pipSize) && pipSize >= 1) return pipSize;
    const asString = pipSize.toString();
    if (asString.includes('e-')) return Number(asString.split('e-')[1]);
    return asString.split('.')[1]?.length ?? 0;
}

function formatQuote(quote: number | string, pipSize?: number): string {
    const rawQuote = String(quote).trim();
    const value = Number(rawQuote);
    if (!Number.isFinite(value)) return rawQuote;

    const decimalPlaces = getDecimalPlaces(Number(pipSize));
    if (decimalPlaces === 0) return rawQuote;

    const [integerPart, decimalPart = ''] = rawQuote.split('.');
    if (decimalPart.length >= decimalPlaces) return rawQuote;
    return `${integerPart}.${decimalPart.padEnd(decimalPlaces, '0')}`;
}

function getLastDigit(quote: number | string, pipSize?: number): number | null {
    const s = formatQuote(quote, pipSize);
    const lastChar = s[s.length - 1];
    const digit = Number(lastChar);
    return Number.isInteger(digit) && digit >= 0 && digit <= 9 ? digit : null;
}


const DigitMatcher: React.FC = () => {
    const { client, transactions, run_panel, summary_card, ui } = useStore();
    const [symbol, setSymbol] = useState('1HZ10V');
    const [marketOpen, setMarketOpen] = useState(false);
    const [digits, setDigits] = useState<number[]>([]);
    const [prices, setPrices] = useState<string[]>([]);
    const [latestPrice, setLatestPrice] = useState<string | null>(null);
    const [currentDigit, setCurrentDigit] = useState<number | null>(null);
    const [selectedDigits, setSelectedDigits] = useState<Set<number>>(new Set(DIGITS));
    const [statusMsg, setStatusMsg] = useState(localize('Markets live. Click Start Engine to trade.'));
    const [isRunning, setIsRunning] = useState(false);
    const [stake, setStake] = useState<number>(0.5);
    const [recentTrades, setRecentTrades] = useState<any[]>([]);
    const windowSize = MAX_DIGITS;

    const selectedDigitsRef = useRef(selectedDigits);
    const isRunningRef = useRef(isRunning);
    const stakeRef = useRef(stake);
    const passiveSub = useRef<{ unsubscribe: () => void } | null>(null);
    const passiveTickId = useRef<string | null>(null);
    const passiveApiRef = useRef<any>(null);
    const pendingForget = useRef<boolean>(false);
    const msgSub = useRef<{ unsubscribe: () => void } | null>(null);
    const lastBuyTickRef = useRef<number | null>(null);
    const tradePlacedRef = useRef(false);
    const marketTriggerRef = useRef<HTMLButtonElement>(null);
    const marketDropdownRef = useRef<HTMLDivElement>(null);

    const activeMarket = MARKETS.find((m) => m.symbol === symbol) ?? MARKETS[0];

    const openMarket = useCallback(() => {
        setMarketOpen((open) => !open);
    }, []);

    useEffect(() => {
        selectedDigitsRef.current = selectedDigits;
    }, [selectedDigits]);

    useEffect(() => {
        isRunningRef.current = isRunning;
    }, [isRunning]);

    useEffect(() => {
        stakeRef.current = stake;
    }, [stake]);

    useEffect(() => {
        if (!marketOpen) return;
        const handler = (event: MouseEvent) => {
            const target = event.target as Node;
            const inTrigger = marketTriggerRef.current?.contains(target);
            const inDropdown = marketDropdownRef.current?.contains(target);
            if (!inTrigger && !inDropdown) setMarketOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [marketOpen]);

    const forgetId = useCallback((id: string | null) => {
        if (id && api_base.api) {
            try {
                (api_base.api as any).send({ forget: id });
            } catch (_e) {
                // ignore
            }
        }
    }, []);

    const stopPassiveSub = useCallback(() => {
        if (passiveTickId.current && api_base.api) {
            try {
                (api_base.api as any).send({ forget: passiveTickId.current });
            } catch (_e) {
                // ignore
            }
            passiveTickId.current = null;
        } else {
            pendingForget.current = true;
        }
        if (passiveSub.current) {
            passiveSub.current.unsubscribe();
            passiveSub.current = null;
        }
    }, []);

    const startPassiveSub = useCallback(async (sym: string) => {
        if (!api_base.api) return;
        pendingForget.current = false;
        passiveApiRef.current = api_base.api;

        passiveSub.current = (api_base.api as any).onMessage().subscribe((message: any) => {
            const msg = message?.data ?? message;
            const tick = msg?.msg_type === 'tick' ? msg.tick : msg?.tick;
            if (!tick || tick.quote === undefined || (tick.symbol && tick.symbol !== sym)) return;

            const pipSize = Number(tick.pip_size ?? (api_base as any).pip_sizes?.[sym]);
            const quote = formatQuote(tick.quote, pipSize);
            const digit = getLastDigit(quote, pipSize);
            if (digit === null) return;

            setDigits((current) => [digit, ...current].slice(0, MAX_DIGITS));
            setPrices((current) => [quote, ...current].slice(0, MAX_DIGITS));
            setLatestPrice(quote);
            setCurrentDigit(digit);
            setStatusMsg(localize('Live tick stream active'));

            // Auto-place a buy once per engine start when running and the digit matches selection
            try {
                if (isRunningRef.current && !tradePlacedRef.current && selectedDigitsRef.current.has(digit) && api_base.api) {
                    tradePlacedRef.current = true;
                    lastBuyTickRef.current = tick.epoch ?? tick.time ?? Date.now();
                    const api = api_base.api as any;
                    const currency = (api_base as any).account_info?.currency || (client as any)?.currency || 'USD';
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
                            underlying_symbol: sym,
                        },
                    });

                    api.send(makeBuy('DIGITMATCH', String(digit), stakeRef.current)).then((res: any) => {
                            const buy = res?.buy;
                            if (!buy?.contract_id) return;
                            transactions.onBotContractEvent({
                                ...buy,
                                contract_id: buy.contract_id,
                                contract_type: 'DIGITMATCH',
                                barrier: String(digit),
                                underlying_symbol: sym,
                                currency: buy.currency ?? currency,
                                buy_price: buy.buy_price ?? stake,
                                date_start: buy.date_start ?? buy.purchase_time ?? Math.floor(Date.now() / 1000),
                                status: 'open',
                                profit: 0,
                                transaction_ids: {
                                    ...(buy.transaction_ids ?? {}),
                                    buy: buy.transaction_id ?? buy.transaction_ids?.buy ?? buy.contract_id,
                                },
                            } as any);
                            // Add to local recent trades list
                            try {
                                setRecentTrades((prev) => [{
                                    contract_id: buy.contract_id,
                                    barrier: String(digit),
                                    buy_price: buy.buy_price ?? stake,
                                    status: 'open',
                                    date_start: buy.date_start ?? Math.floor(Date.now() / 1000),
                                }, ...prev].slice(0, 5));
                            } catch (_e) {
                                // ignore
                            }
                            try {
                                run_panel.setContractStage(contract_stages.PURCHASE_SENT);
                            } catch (_e) {
                                // ignore when store not present
                            }
                        }).catch(() => {
                            // ignore buy failure
                        });
                    }
                }
            } catch (_e) {
                // defensive: swallow errors to avoid breaking tick stream
            }
        });

        try {
            const response = await (api_base.api as any).send({ ticks: sym, subscribe: 1 });
            if (pendingForget.current && response?.subscription?.id) {
                forgetId(response.subscription.id);
            } else if (response?.subscription?.id) {
                passiveTickId.current = response.subscription.id;
            }
        } catch (_e) {
            setStatusMsg(localize('Unable to subscribe to ticks.')); 
        }
    }, [forgetId]);

    useEffect(() => {
        if (!api_base.api) {
            setStatusMsg(localize('Log in to see live digits'));
            return undefined;
        }

        startPassiveSub(symbol);

        return () => stopPassiveSub();
    }, [symbol, startPassiveSub, stopPassiveSub]);

    useEffect(() => {
        const check = () => {
             const apiChanged = api_base.api && passiveApiRef.current !== api_base.api;
             if (apiChanged) {
                 startPassiveSub(symbol);
             }
         };
         const interval = window.setInterval(check, 3000);
         return () => window.clearInterval(interval);
     }, [startPassiveSub, symbol]);

    useEffect(() => {
        return () => {
            try {
                stopPassiveSub();
                if (msgSub.current) msgSub.current.unsubscribe();
                run_panel?.setIsRunning(false);
                run_panel?.setContractStage(contract_stages.NOT_RUNNING);
                (ui as any)?.setPromptHandler?.(false);
            } catch (_e) {
                // ignore cleanup errors
            }
        };
    }, [stopPassiveSub, run_panel, ui]);

    const toggleDigit = useCallback((digit: number) => {
        setSelectedDigits((current) => {
            const next = new Set(current);
            if (next.has(digit)) next.delete(digit);
            else next.add(digit);
            return next;
        });
    }, []);

    const toggleRunning = useCallback(() => {
        if (isRunning) {
            // keep market subscription active; stop only trading and update run panel
            try {
                // open run panel drawer and switch to Transactions
                run_panel.toggleDrawer(true);
                run_panel.setActiveTabIndex(1);
                // invoke store stop which handles clearing/stop flow
                if (typeof run_panel.onStopBotClick === 'function') run_panel.onStopBotClick();
            } catch (_e) {
                // ignore store stop failures
            }
            setIsRunning(false);
            setStatusMsg(localize('Markets live. Click Start Engine to trade.'));
            return;
        }

        if (!api_base.api) {
            setStatusMsg(localize('Log in and refresh to start the analyzer.'));
            return;
        }

        // Mirror run-panel start: activate global running state and open drawer
        try {
            run_panel.run_id = `run-${Date.now()}`;
            summary_card.clear();
            run_panel.setIsRunning(true);
            run_panel.setContractStage(contract_stages.STARTING);
            run_panel.toggleDrawer(true);
            (ui as any)?.setAccountSwitcherDisabledMessage?.(
                localize('Account switching is disabled while your bot is running. Please stop your bot before switching accounts.')
            );
            (ui as any)?.setPromptHandler?.(true);
} catch (_e) {
            // ignore when stores are not available
        }

        tradePlacedRef.current = false;
        setIsRunning(true);
        setStatusMsg(localize('Analyzer running... awaiting trade signal.'));

        // Listen for settled contract events and push to transactions
        if (msgSub.current) {
            msgSub.current.unsubscribe();
            msgSub.current = null;
        }
        if ((api_base as any).onMessage) {
            msgSub.current = (api_base.api as any).onMessage().subscribe((m: any) => {
                const data = m?.data ?? m;
                if (data?.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
                    const poc = data.proposal_open_contract;
                    // Push settled contract into the shared Transactions widget
                    if (poc.status === 'won' || poc.status === 'lost') {
                        transactions.onBotContractEvent(poc);
                        // update recent trades
                        try {
                            setRecentTrades((prev) => {
                                return prev.map((t) => (t.contract_id === poc.contract_id ? { ...t, status: poc.status, profit: poc.profit } : t));
                            });
                            run_panel.setContractStage(contract_stages.CONTRACT_CLOSED);
                        } catch (_e) {
                            // ignore
                        }
                    }
                }
            });
        }
    }, [isRunning, stopPassiveSub, run_panel, summary_card, ui, transactions]);

    const selectedList = useMemo<number[]>(
        () => [...selectedDigits].sort((a, b) => a - b),
        [selectedDigits],
    );
    const matchedCount = useMemo(
        () => digits.filter((digit) => selectedDigits.has(digit)).length,
        [digits, selectedDigits],
    );
    const loadedTickCount = Math.min(digits.length, windowSize);
    const digitCounts = useMemo(() => {
        const counts = Array.from({ length: 10 }, () => 0);
        const slice = digits.slice(0, windowSize);
        slice.forEach((digit) => { counts[digit] += 1; });
        return counts;
    }, [digits, windowSize]);
    const digitPercents = useMemo(
        () => loadedTickCount ? digitCounts.map((count) => Math.round((count / loadedTickCount) * 1000) / 10) : Array(10).fill(0),
        [digitCounts, loadedTickCount],
    );
    const digitRanks = useMemo(() => {
        const items = DIGITS.map((digit) => ({ digit, count: digitCounts[digit] }));
        const sortedAsc = [...items].sort((a, b) => a.count - b.count || a.digit - b.digit);
        const sortedDesc = [...items].sort((a, b) => b.count - a.count || a.digit - b.digit);
        const least = sortedAsc[0]?.digit ?? 0;
        const secondLeast = sortedAsc[1]?.digit ?? sortedAsc[0]?.digit ?? 0;
        const most = sortedDesc[0]?.digit ?? 0;
        const secondMost = sortedDesc[1]?.digit ?? sortedDesc[0]?.digit ?? 0;
        return DIGITS.reduce<Record<number, string>>((acc, digit) => {
            acc[digit] =
                digit === most ? 'top1' :
                digit === secondMost ? 'top2' :
                digit === secondLeast ? 'bottom2' :
                digit === least ? 'bottom1' :
                'normal';
            return acc;
        }, {} as Record<number, string>);
    }, [digitCounts]);

    return (
        <div className='dm'>
            <div className='dm__header'>
                <div className='dm__title'>{localize('Digit Matcher')}</div>
                <div className='dm__description'>
                    {localize('Select digits and watch the cursor move to the digit formed by the latest ticks.')}
                </div>
                <div className='dm__status'>{statusMsg}</div>
            </div>

            <div className='dm__content'>
                <aside className='dm__sidebar'>
                    <div className='dm__hero dm__hero--sidebar'>
                        <div className='dm__hero-market'>{activeMarket.short}</div>
                        <div className='dm__hero-price'>{latestPrice ?? '—'}</div>
                        <div className='dm__hero-meta'>
                            <span>{localize('Engine status')}</span>
                            <strong>{isRunning ? localize('Running') : localize('Stopped')}</strong>
                        </div>
                    </div>
                    <div className='dm__control-panel'>
                        <button
                            type='button'
                            className={`dm__run-button${isRunning ? ' dm__run-button--active' : ''}`}
                            onClick={toggleRunning}
                        >
                            {isRunning ? localize('Stop Engine') : localize('Start Engine')}
                        </button>
                        <label className='dm__panel-field'>
                            <span className='dm__panel-label'>{localize('Stake')}</span>
                            <input
                                type='number'
                                min='0'
                                step='0.01'
                                className='dm__stake-input'
                                value={stake}
                                onChange={(e) => setStake(Number(e.target.value) || 0)}
                                aria-label={localize('Stake')}
                            />
                        </label>
                        <div className='dm__panel-item'>
                            <span>{localize('Current digit')}</span>
                            <strong>{currentDigit !== null ? currentDigit : '—'}</strong>
                        </div>
                        <div className='dm__panel-item'>
                            <span>{localize('Default digits')}</span>
                            <strong>{localize('All ready')}</strong>
                        </div>
                        <div className='dm__panel-item'>
                            <span>{localize('Selected digits')}</span>
                            <strong>{selectedList.length > 0 ? selectedList.join(', ') : localize('None')}</strong>
                        </div>
                        <div className='dm__legend'>
                            <div className='dm__legend-item dm__legend-item--top1'>
                                <span className='dm__legend-swatch' />
                                {localize('Most frequent')}
                            </div>
                            <div className='dm__legend-item dm__legend-item--top2'>
                                <span className='dm__legend-swatch' />
                                {localize('Second most frequent')}
                            </div>
                            <div className='dm__legend-item dm__legend-item--bottom2'>
                                <span className='dm__legend-swatch' />
                                {localize('Second least frequent')}
                            </div>
                            <div className='dm__legend-item dm__legend-item--bottom1'>
                                <span className='dm__legend-swatch' />
                                {localize('Least frequent')}
                            </div>
                        </div>
                        <div className='dm__recent-trades'>
                            <div className='dm__recent-trades-title'>
                                {localize('Recent trades')}
                            </div>
                            <div className='dm__recent-trades-list'>
                                {recentTrades.length === 0 && (
                                    <div className='dm__placeholder'>{localize('No recent trades')}</div>
                                )}
                                {recentTrades.map((t) => (
                                    <div key={t.contract_id} className='dm__recent-trade'>
                                        <div className='dm__recent-trade-line'>
                                            <span className='dm__recent-trade-barrier'>{t.barrier}</span>
                                            <span className='dm__recent-trade-price'>{t.buy_price}</span>
                                        </div>
                                        <div className='dm__recent-trade-status'>{t.status}{t.profit ? ` • ${t.profit}` : ''}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className='dm__digit-grid dm__digit-grid--sidebar'>
                            {DIGITS.map((digit) => {
                                const isSelected = selectedDigits.has(digit);
                                const percent = digitPercents[digit];
                                const isCurrent = currentDigit === digit;
                                const rankClass = digitRanks[digit] ? ` dm__digit-button--${digitRanks[digit]}` : '';
                                return (
                                    <button
                                        key={digit}
                                        type='button'
                                        className={`dm__digit-button${isSelected ? ' dm__digit-button--selected' : ''}${isCurrent ? ' dm__digit-button--current' : ''}${rankClass}`}
                                        onClick={() => toggleDigit(digit)}
                                    >
                                        {isCurrent && <span className='dm__digit-cursor'>▼</span>}
                                        <span className='dm__digit-grid-number'>{digit}</span>
                                        <span className='dm__digit-grid-percent'>{percent.toFixed(1)}%</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>
                <section className='dm__main'>
                    <div className='dm__market-selector'>
                        <button
                            ref={marketTriggerRef}
                            type='button'
                            className='dm__market-trigger'
                            onClick={openMarket}
                        >
                            <span>{activeMarket.short}</span>
                            <span className='dm__market-chevron'>▼</span>
                        </button>
                        {marketOpen && (
                            <div className='dm__market-dropdown' ref={marketDropdownRef}>
                                <div className='dm__market-category'>{localize('CONTINUOUS INDICES')}</div>
                                <div className='dm__market-list'>
                                    {MARKETS.map((market) => {
                                        const isActive = market.symbol === symbol;
                                        const [codeMain, codeSub] = market.code.split('\n');
                                        return (
                                            <button
                                                key={market.symbol}
                                                type='button'
                                                className={`dm__market-row${isActive ? ' dm__market-row--active' : ''}`}
                                                onClick={() => {
                                                    setSymbol(market.symbol);
                                                    setMarketOpen(false);
                                                }}
                                            >
                                                <span className='dm__market-code'>
                                                    <span className='dm__market-code-main'>{codeMain}</span>
                                                    {codeSub && <span className='dm__market-code-sub'>{codeSub}</span>}
                                                </span>
                                                <span className='dm__market-name'>{market.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className='dm__summary'>
                        <div className='dm__summary-card'>
                            <span className='dm__summary-label'>{localize('Selected')}</span>
                            <span className='dm__summary-value'>{selectedList.length}</span>
                        </div>
                        <div className='dm__summary-card'>
                            <span className='dm__summary-label'>{localize('Matches')}</span>
                            <span className='dm__summary-value'>{matchedCount}</span>
                        </div>
                    </div>
                    {/* digit grid moved to sidebar for left-fixed layout */}

                    <div className='dm__selected-line'>
                        <span>{localize('Selected digits:')}</span>
                        <strong>{selectedList.length > 0 ? selectedList.join(', ') : localize('None')}</strong>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default DigitMatcher;
