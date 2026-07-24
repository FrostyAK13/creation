import React, { useState, useRef, useEffect } from 'react';
import './trading-view.scss';

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

const TradingViewComponent = () => {
    const [symbol, setSymbol]         = useState('1HZ10V');
    const [marketOpen, setMarketOpen] = useState(false);
    const dropdownRef                 = useRef<HTMLDivElement>(null);

    const activeMarket = MARKETS.find(m => m.symbol === symbol) ?? MARKETS[0];
    const chartSrc     = `https://www.tradingview.com/chart/?symbol=DERIV%3A${symbol}`;

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setMarketOpen(false);
            }
        };
        if (marketOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [marketOpen]);

    return (
        <div className='tv'>
            {/* ── market selector bar ── */}
            <div className='tv__toolbar'>
                <span className='tv__toolbar-label'>Market</span>

                <div className={`tv__market-selector${marketOpen ? ' tv__market-selector--open' : ''}`} ref={dropdownRef}>
                    <button
                        className='tv__market-trigger'
                        onClick={() => setMarketOpen(o => !o)}
                        type='button'
                        title='Change market'
                    >
                        <span className='tv__market-trigger-short'>{activeMarket.short}</span>
                        <span className={`tv__market-chevron${marketOpen ? ' tv__market-chevron--open' : ''}`}>▼</span>
                    </button>

                    {marketOpen && (
                        <div className='tv__market-dropdown'>
                            <div className='tv__market-grid'>
                                {MARKETS.map(m => (
                                    <button
                                        key={m.symbol}
                                        className={`tv__market-btn${symbol === m.symbol ? ' tv__market-btn--active' : ''}`}
                                        onClick={() => { setSymbol(m.symbol); setMarketOpen(false); }}
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

                <span className='tv__toolbar-market-label'>{activeMarket.label}</span>
            </div>

            {/* ── chart iframe ── */}
            <iframe
                key={chartSrc}
                id='trading-view-iframe'
                className='tv__iframe'
                src={chartSrc}
                title={`TradingView — ${activeMarket.label}`}
                allowFullScreen
            />
        </div>
    );
};

export default TradingViewComponent;
