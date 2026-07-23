import { useCallback, useEffect, useRef, useState } from 'react';
import { generateOAuthURL } from '@/components/shared/utils/config/config';
import './LandingPage.scss';

/* ── Types ─────────────────────────────────────────────── */
interface TickItem {
    symbol: string;
    display: string;
    price: string;
    change: number;
    pct: string;
}

interface Testimonial {
    initials: string;
    name: string;
    role: string;
    location: string;
    text: string;
    stars: number;
    color: string;
}

/* ── Constants ──────────────────────────────────────────── */
const SYMBOLS: { symbol: string; display: string }[] = [
    { symbol: 'BOOM1000', display: 'Boom 1000' },
    { symbol: 'CRASH500', display: 'Crash 500' },
    { symbol: 'stpind', display: 'Step Index' },
    { symbol: 'R_75', display: 'Volatility 75' },
    { symbol: 'R_100', display: 'Volatility 100' },
    { symbol: 'BOOM500', display: 'Boom 500' },
    { symbol: 'CRASH300', display: 'Crash 300' },
    { symbol: 'R_50', display: 'Volatility 50' },
];

const SIGNUP_URL = 'https://track.deriv.com/_6B2BFQC0E1f1hit6RV3zsGNd7ZgqdRLk/1/';

const TESTIMONIALS: Testimonial[] = [
    {
        initials: 'AM',
        name: 'Amina Musa',
        role: 'Synthetic Trader',
        location: 'Nigeria',
        text: 'The market tools are focused, quick, and easy to understand.',
        stars: 5,
        color: '#8b5cf6',
    },
    {
        initials: 'PK',
        name: 'Peter Kamau',
        role: 'Volatility Trader',
        location: 'Kenya',
        text: 'Fast tools, clean execution, and bots that are simple to launch.',
        stars: 4,
        color: '#ef4444',
    },
    {
        initials: 'GN',
        name: 'Grace Nkosi',
        role: 'Bot Builder',
        location: 'South Africa',
        text: 'I built my first strategy in minutes. The drag-and-drop editor is brilliant.',
        stars: 5,
        color: '#0ea5e9',
    },
    {
        initials: 'JO',
        name: 'James Osei',
        role: 'Index Trader',
        location: 'Ghana',
        text: 'Real-time charts and automated bots in one workspace. Exactly what I needed.',
        stars: 5,
        color: '#10b981',
    },
    {
        initials: 'FD',
        name: 'Fatou Diallo',
        role: 'Algo Trader',
        location: 'Senegal',
        text: 'Switching strategies is seamless. The platform handles everything professionally.',
        stars: 4,
        color: '#f59e0b',
    },
    {
        initials: 'TM',
        name: 'Tinashe Moyo',
        role: 'Deriv Enthusiast',
        location: 'Zimbabwe',
        text: 'Finally a bot builder that just works without complex setup.',
        stars: 5,
        color: '#ec4899',
    },
];

/* ── Ticker hook ────────────────────────────────────────── */
function useLiveTicker(): TickItem[] {
    const [ticks, setTicks] = useState<TickItem[]>(
        SYMBOLS.map(s => ({ symbol: s.symbol, display: s.display, price: '—', change: 0, pct: '+0.00%' }))
    );
    const wsRef = useRef<WebSocket | null>(null);
    const prevPrices = useRef<Record<string, number>>({});

    useEffect(() => {
        // Use the configured app_id only if it's a valid integer; otherwise fall back
        // to Deriv's public demo app_id (1089) so the ticker always has a live connection.
        const rawId = process.env.NEXT_PUBLIC_DERIV_APP_ID || '';
        const appId = /^\d+$/.test(rawId) ? rawId : '1089';
        const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${appId}`);
        wsRef.current = ws;

        ws.onopen = () => {
            SYMBOLS.forEach(({ symbol }) => {
                ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
            });
        };

        ws.onmessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data as string);
                if (data.msg_type === 'tick' && data.tick) {
                    const { symbol, quote } = data.tick as { symbol: string; quote: number };
                    const prev = prevPrices.current[symbol];
                    const change = prev != null ? quote - prev : 0;
                    const pct = prev != null && prev !== 0 ? ((change / prev) * 100).toFixed(2) : '0.00';
                    prevPrices.current[symbol] = quote;

                    setTicks(prev =>
                        prev.map(t =>
                            t.symbol === symbol
                                ? {
                                      ...t,
                                      price: quote.toFixed(2),
                                      change,
                                      pct: `${change >= 0 ? '+' : ''}${pct}%`,
                                  }
                                : t
                        )
                    );
                }
            } catch {
                // ignore parse errors
            }
        };

        ws.onerror = () => {
            // Silently handle WebSocket errors — ticker shows stale/placeholder data
        };

        return () => {
            ws.close();
        };
    }, []);

    return ticks;
}

/* ── Sub-components ─────────────────────────────────────── */
function TickerItem({ item }: { item: TickItem }) {
    const isUp = item.change >= 0;
    return (
        <span className='landing__ticker-item'>
            <span className='landing__ticker-name'>{item.display}</span>
            <span className='landing__ticker-price'>{item.price}</span>
            <span className={`landing__ticker-change landing__ticker-change--${isUp ? 'up' : 'down'}`}>
                {item.pct}
            </span>
        </span>
    );
}

function Stars({ count }: { count: number }) {
    return (
        <div className='landing__testimonial-stars'>
            {Array.from({ length: 5 }).map((_, i) => (
                <span key={i}>{i < count ? '★' : '☆'}</span>
            ))}
        </div>
    );
}

function TestimonialCard({ t }: { t: Testimonial }) {
    return (
        <div className='landing__testimonial-card'>
            <div className='landing__testimonial-top'>
                <div
                    className='landing__testimonial-avatar'
                    style={{ background: t.color }}
                >
                    {t.initials}
                </div>
                <div className='landing__testimonial-meta'>
                    <span className='landing__testimonial-name'>{t.name}</span>
                    <span className='landing__testimonial-role'>
                        {t.role} · {t.location}
                    </span>
                </div>
            </div>
            <Stars count={t.stars} />
            <p className='landing__testimonial-text'>{t.text}</p>
        </div>
    );
}

/* ── Main component ─────────────────────────────────────── */
export default function LandingPage() {
    const ticks = useLiveTicker();
    const doubled = [...ticks, ...ticks]; // seamless loop

    const handleLogin = useCallback(async () => {
        try {
            const url = await generateOAuthURL();
            if (url) window.location.replace(url);
        } catch {
            // If no app ID configured, navigate to app directly
            window.location.href = '/app';
        }
    }, []);

    const handleSignup = useCallback(() => {
        window.open(SIGNUP_URL, '_blank', 'noopener,noreferrer');
    }, []);

    const doubledTestimonials = [...TESTIMONIALS, ...TESTIMONIALS];

    return (
        <div className='landing'>
            {/* ── Header ── */}
            <header className='landing__header'>
                <a className='landing__logo' href='/'>
                    <img src='/logo.jpeg' alt='FrostyDBot logo' />
                    <span>FrostyDBot</span>
                </a>
                <div className='landing__header-actions'>
                    <button className='landing__btn landing__btn--outline' onClick={handleLogin}>
                        Log in
                    </button>
                    <button className='landing__btn landing__btn--solid' onClick={handleSignup}>
                        Create account
                    </button>
                </div>
            </header>

            {/* ── Ticker ── */}
            <div className='landing__ticker-bar'>
                <span className='landing__ticker-label'>Live Markets</span>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div className='landing__ticker-track'>
                        {doubled.map((item, i) => (
                            <TickerItem key={`${item.symbol}-${i}`} item={item} />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Hero ── */}
            <section className='landing__hero'>
                <div className='landing__hero-badge'>Free bots, automation, and trading tools in one workspace</div>
                <h1 className='landing__hero-title'>One Workspace. Limitless Strategies.</h1>
                <p className='landing__hero-subtitle'>
                    Free trading bots and professional tools. Build, load, and run automated strategies from a focused
                    workspace made for everyday traders.
                </p>
                <div className='landing__hero-actions'>
                    <button className='landing__cta landing__cta--primary' onClick={handleLogin}>
                        <span>♥</span> Log in and trade →
                    </button>
                    <button className='landing__cta landing__cta--secondary' onClick={handleSignup}>
                        <span>⚡</span> Create free account
                    </button>
                </div>
            </section>

            {/* ── Testimonials ── */}
            <section className='landing__testimonials'>
                <div className='landing__testimonials-track'>
                    {doubledTestimonials.map((t, i) => (
                        <TestimonialCard key={`${t.initials}-${i}`} t={t} />
                    ))}
                </div>
            </section>
        </div>
    );
}
