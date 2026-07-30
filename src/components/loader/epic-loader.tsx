import React, { useEffect, useState, useRef } from 'react';
import './epic-loader.scss';
import { createMarketTicker } from '@/services/market-ticker.service';

type Pair = { pair: string; price: number; change: number };

const START_PAIRS: Pair[] = [
    { pair: 'EUR/USD', price: 1.0762, change: 0.0 },
    { pair: 'GBP/JPY', price: 187.22, change: 0.0 },
    { pair: 'AUD/USD', price: 0.6431, change: 0.0 },
    { pair: 'USD/JPY', price: 148.03, change: 0.0 },
    { pair: 'BTC/USD', price: 46832, change: 0.0 },
];

const QUOTES = [
    'Trade with discipline — the rest follows.',
    'Small edges compound into big wins.',
    'Patience beats impulse every time.',
    'Markets reward preparation, not luck.',
    'Focus on process, profit follows.',
];

const rnd = (v: number) => (Math.random() * 2 - 1) * v;

const EpicLoader: React.FC<{ phrase?: string }> = ({ phrase = 'Starting up…' }) => {
    const [pairs, setPairs] = useState<Pair[]>(START_PAIRS);
    const [quoteIndex, setQuoteIndex] = useState(0);

    const rootRef = useRef<HTMLDivElement | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        const el = document.getElementById('epic-loader-aria');
        if (el) el.textContent = phrase;
    }, [phrase]);

    useEffect(() => {
        // Try live market data first; fallback to internal sim handled by service
        const pairNames = pairs.map(p => p.pair);
        const ticker = createMarketTicker(pairNames, updates => {
            setPairs(prev => {
                return prev.map(p => {
                    const upd = updates.find(u => u.pair === p.pair);
                    if (!upd) return p;
                    const change = +(upd.price - p.price);
                    return { ...p, price: upd.price, change };
                });
            });
            // Detect significant moves and trigger micro-interaction
            updates.forEach(u => {
                const prev = pairs.find(x => x.pair === u.pair);
                const diff = prev ? Math.abs(u.price - prev.price) : 0;
                const threshold = /BTC\//i.test(u.pair) ? Math.max(50, Math.abs(u.price) * 0.002) : Math.max(0.001, Math.abs(u.price) * 0.0008);
                if (diff >= threshold) {
                    // flash
                    const el = rootRef.current;
                    if (el) {
                        el.classList.add('epic-loader--alert');
                        setTimeout(() => el.classList.remove('epic-loader--alert'), 700);
                    }
                    // play sound
                    try {
                        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const ctx = audioCtxRef.current;
                        const o = ctx.createOscillator();
                        const g = ctx.createGain();
                        o.type = 'sine';
                        o.frequency.value = /BTC\//i.test(u.pair) ? 260 : 420;
                        g.gain.value = 0.0008;
                        o.connect(g);
                        g.connect(ctx.destination);
                        o.start();
                        g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.35);
                        o.stop(ctx.currentTime + 0.36);
                    } catch (e) {
                        // ignore audio errors
                    }
                }
            });
        }, 3000);

        return () => ticker.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const q = setInterval(() => setQuoteIndex(i => (i + 1) % QUOTES.length), 4000);
        return () => clearInterval(q);
    }, []);

    return (
        <div className='epic-loader' role='status' aria-live='polite'>
            <span id='epic-loader-aria' className='visually-hidden' />

            <div className='epic-loader__backdrop' aria-hidden='true' />

            <div className='epic-loader__waves' aria-hidden='true'>
                {[0, 1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`epic-loader__wave epic-loader__wave--${i}`} />
                ))}
            </div>

            <div className='epic-loader__centre'>
                <div className='epic-loader__live-core'>
                    <img src='/logo-loader.jpeg' alt='App logo' className='epic-loader__logo' />
                    <div className='epic-loader__pulse' />
                </div>

                <div className='epic-loader__phrase'>{phrase}</div>
                <div className='epic-loader__quote'>“{QUOTES[quoteIndex]}”</div>
            </div>

            <div className='epic-loader__ticker' aria-hidden='true'>
                <div className='epic-loader__ticker-track' style={{ '--n': pairs.length } as React.CSSProperties}>
                    {pairs.map(p => (
                        <div key={p.pair} className='epic-loader__ticker-item'>
                            <span className='epic-loader__pair'>{p.pair}</span>
                            <span className='epic-loader__price'>{p.pair.includes('BTC') ? p.price.toLocaleString() : p.price.toFixed(4)}</span>
                            <span className={`epic-loader__chg ${p.change >= 0 ? 'up' : 'down'}`}>
                                {p.change >= 0 ? '+' : ''}{p.change}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className='epic-loader__sparks' aria-hidden='true'>
                {Array.from({ length: 14 }).map((_, i) => (
                    <span key={i} className={`epic-loader__spark s-${i}`} />
                ))}
            </div>
        </div>
    );
};

export default EpicLoader;
