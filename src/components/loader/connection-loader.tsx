import React, { useEffect, useState } from 'react';
import './connection-loader.scss';

const STEPS = [
    'Connecting to server…',
    'Initialising workspace…',
    'Loading Deriv Bot…',
    'Almost ready…',
];

// ── Orbit definitions ────────────────────────────────────────────────────────

const INNER_ORBIT = ['$', '€', '£', '¥'];

const MID_ORBIT = ['EUR/USD', 'GBP/JPY', 'XAU/USD', 'BTC/USD'];

const OUTER_ORBIT = ['↗', '₿', '📈', '↘', '⚡'];

// ── Mini candlestick SVG ─────────────────────────────────────────────────────
const BullCandle = () => (
    <svg width='14' height='18' viewBox='0 0 14 18' fill='none'>
        <line x1='7' y1='0' x2='7' y2='3' stroke='#06b6d4' strokeWidth='1.5' strokeLinecap='round' />
        <rect x='3' y='3' width='8' height='10' rx='1' fill='#06b6d4' />
        <line x1='7' y1='13' x2='7' y2='18' stroke='#06b6d4' strokeWidth='1.5' strokeLinecap='round' />
    </svg>
);

const BearCandle = () => (
    <svg width='14' height='18' viewBox='0 0 14 18' fill='none'>
        <line x1='7' y1='0' x2='7' y2='3' stroke='#ef4444' strokeWidth='1.5' strokeLinecap='round' />
        <rect x='3' y='3' width='8' height='10' rx='1' fill='#ef4444' />
        <line x1='7' y1='13' x2='7' y2='18' stroke='#ef4444' strokeWidth='1.5' strokeLinecap='round' />
    </svg>
);

// ── Component ────────────────────────────────────────────────────────────────

const ConnectionLoader = () => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setStep(s => (s < STEPS.length - 1 ? s + 1 : s));
        }, 3500);
        return () => clearInterval(id);
    }, []);

    return (
        <div className='conn-loader'>
            {/* ── blurred logo background ── */}
            <div
                className='conn-loader__bg-img'
                aria-hidden='true'
                style={{ backgroundImage: "url('/logo-loader.jpeg')" }}
            />

            {/* ── full-screen ambient glow ── */}
            <div className='conn-loader__bg-glow' aria-hidden='true' />

            {/* ── lightning bolts ── */}
            <div className='conn-loader__lightning' aria-hidden='true' />

            {/* ── rising particles ── */}
            <div className='conn-loader__particles' aria-hidden='true'>
                {Array.from({ length: 22 }).map((_, i) => (
                    <span
                        key={i}
                        className='conn-loader__particle'
                        style={{ '--pi': i } as React.CSSProperties}
                    />
                ))}
            </div>

            {/* ── compact card ── */}
            <div className='conn-loader__card'>
                {/* shine sweep on card top edge */}
                <div className='conn-loader__card-shine' aria-hidden='true' />

                {/* ── orbital system ── */}
                <div className='conn-loader__orbital'>

                    {/* decorative dashed ring tracks */}
                    <div className='conn-loader__track conn-loader__track--1' />
                    <div className='conn-loader__track conn-loader__track--2' />
                    <div className='conn-loader__track conn-loader__track--3' />

                    {/* ── center logo ── */}
                    <div className='conn-loader__logo-wrap'>
                        <img
                            src='/logo-loader.jpeg'
                            className='conn-loader__logo'
                            alt='FrostydBot'
                        />
                        <div className='conn-loader__logo-pulse' />
                        <div className='conn-loader__logo-pulse conn-loader__logo-pulse--2' />
                        <div className='conn-loader__logo-pulse conn-loader__logo-pulse--3' />
                    </div>

                    {/* ── inner orbit — currency symbols ── */}
                    {INNER_ORBIT.map((sym, i) => (
                        <div
                            key={sym}
                            className='conn-loader__sat conn-loader__sat--inner'
                            style={{
                                '--angle': `${(i / INNER_ORBIT.length) * 360}deg`,
                                '--dur': '7s',
                            } as React.CSSProperties}
                        >
                            <span className='conn-loader__sat-icon conn-loader__sat-icon--currency'>
                                {sym}
                            </span>
                        </div>
                    ))}

                    {/* ── mid orbit — forex pairs (cyan accent track) ── */}
                    {MID_ORBIT.map((pair, i) => (
                        <div
                            key={pair}
                            className='conn-loader__sat conn-loader__sat--mid'
                            style={{
                                '--angle': `${(i / MID_ORBIT.length) * 360}deg`,
                                '--dur': '14s',
                            } as React.CSSProperties}
                        >
                            <span className='conn-loader__sat-icon conn-loader__sat-icon--pair conn-loader__sat-icon--pair-cyan'>
                                {pair}
                            </span>
                        </div>
                    ))}

                    {/* ── outer orbit — trends + candles ── */}
                    {OUTER_ORBIT.map((item, i) => (
                        <div
                            key={i}
                            className='conn-loader__sat conn-loader__sat--outer'
                            style={{
                                '--angle': `${(i / OUTER_ORBIT.length) * 360}deg`,
                                '--dur': '22s',
                            } as React.CSSProperties}
                        >
                            <span className='conn-loader__sat-icon conn-loader__sat-icon--trend'>
                                {i === 1 ? <BullCandle /> : i === 3 ? <BearCandle /> : item}
                            </span>
                        </div>
                    ))}
                </div>

                {/* ── brand tagline ── */}
                <p className='conn-loader__brand'>TRADE. INVEST. PROFIT.</p>

                {/* ── animated status text ── */}
                <p key={step} className='conn-loader__status'>
                    {STEPS[step]}
                </p>

                {/* ── progress dots ── */}
                <div className='conn-loader__dots'>
                    {STEPS.map((_, i) => (
                        <span
                            key={i}
                            className={`conn-loader__dot${i <= step ? ' conn-loader__dot--active' : ''}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ConnectionLoader;
