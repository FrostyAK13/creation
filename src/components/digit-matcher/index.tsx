import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api_base } from '@/external/bot-skeleton';
import { localize } from '@deriv-com/translations';
import './digit-matcher.scss';

const DIGITS = Array.from({ length: 10 }, (_, i) => i);
const MAX_DIGITS = 30;

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
    const [symbol, setSymbol] = useState('1HZ10V');
    const [marketOpen, setMarketOpen] = useState(false);
    const [digits, setDigits] = useState<number[]>([]);
    const [prices, setPrices] = useState<string[]>([]);
    const [selectedDigits, setSelectedDigits] = useState<Set<number>>(new Set([4, 5]));
    const [statusMsg, setStatusMsg] = useState(localize('Waiting for live ticks…'));

    const passiveSub = useRef<{ unsubscribe: () => void } | null>(null);
    const passiveTickId = useRef<string | null>(null);
    const passiveApiRef = useRef<any>(null);
    const pendingForget = useRef<boolean>(false);
    const marketTriggerRef = useRef<HTMLButtonElement>(null);
    const marketDropdownRef = useRef<HTMLDivElement>(null);

    const activeMarket = MARKETS.find((m) => m.symbol === symbol) ?? MARKETS[0];

    const openMarket = useCallback(() => {
        setMarketOpen((open) => !open);
    }, []);

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
            } catch {
                // ignore
            }
        }
    }, []);

    const stopPassiveSub = useCallback(() => {
        if (passiveTickId.current && api_base.api) {
            try {
                (api_base.api as any).send({ forget: passiveTickId.current });
            } catch {
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
            setStatusMsg(localize('Live tick stream active'));
        });

        try {
            const response = await (api_base.api as any).send({ ticks: sym, subscribe: 1 });
            if (pendingForget.current && response?.subscription?.id) {
                forgetId(response.subscription.id);
            } else if (response?.subscription?.id) {
                passiveTickId.current = response.subscription.id;
            }
        } catch {
            setStatusMsg(localize('Unable to subscribe to ticks.')); 
        }
    }, [forgetId]);

    useEffect(() => {
        if (!api_base.api) {
            setStatusMsg(localize('Log in to see live digits'));
            return;
        }
        startPassiveSub(symbol);
        return () => stopPassiveSub();
    }, [symbol, startPassiveSub, stopPassiveSub]);

    useEffect(() => {
        const check = () => {
            if (api_base.api && passiveApiRef.current !== api_base.api) {
                startPassiveSub(symbol);
            }
        };
        const interval = window.setInterval(check, 3000);
        return () => window.clearInterval(interval);
    }, [startPassiveSub, symbol]);

    useEffect(() => () => stopPassiveSub(), [stopPassiveSub]);

    const toggleDigit = useCallback((digit: number) => {
        setSelectedDigits((current) => {
            const next = new Set(current);
            if (next.has(digit)) next.delete(digit);
            else next.add(digit);
            return next;
        });
    }, []);

    const selectedList = useMemo(() => Array.from(selectedDigits).sort((a, b) => a - b), [selectedDigits]);
    const matchedCount = useMemo(
        () => digits.filter((digit) => selectedDigits.has(digit)).length,
        [digits, selectedDigits],
    );

    return (
        <div className='dm'>
            <div className='dm__header'>
                <div className='dm__title'>{localize('Digit Matcher')}</div>
                <div className='dm__description'>
                    {localize('Select one or more digits and compare them against the most recent live tick stream.')}
                </div>
                <div className='dm__status'>{statusMsg}</div>
            </div>

            <div className='dm__row'>
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
            </div>

            <div className='dm__digit-grid'>
                {DIGITS.map((digit) => {
                    const isSelected = selectedDigits.has(digit);
                    return (
                        <button
                            key={digit}
                            type='button'
                            className={`dm__digit-button${isSelected ? ' dm__digit-button--selected' : ''}`}
                            onClick={() => toggleDigit(digit)}
                        >
                            {digit}
                        </button>
                    );
                })}
            </div>

            <div className='dm__results'>
                <div className='dm__results-title'>{localize('Recent Tick Digits')}</div>
                <div className='dm__results-grid'>
                    {digits.length === 0 ? (
                        <div className='dm__placeholder'>{localize('No ticks yet')}</div>
                    ) : digits.map((digit, index) => {
                        const isSelected = selectedDigits.has(digit);
                        const price = prices[index] ?? '';
                        return (
                            <div key={`${digit}-${index}`} className={`dm__result-card${isSelected ? ' dm__result-card--match' : ''}`}>
                                <span className='dm__result-digit'>{digit}</span>
                                <span className='dm__result-price'>{price}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default DigitMatcher;
