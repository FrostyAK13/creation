import { useCallback, useState } from 'react';
import { generateOAuthURL } from '@/components/shared/utils/config/config';
import './LandingPage.scss';

/* ── Types ─────────────────────────────────────────────── */
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
const SIGNUP_URL = 'https://track.deriv.com/_6B2BFQC0E1f1hit6RV3zsGNd7ZgqdRLk/1/';

const TESTIMONIALS: Testimonial[] = [
    {
        initials: 'AM', name: 'Amina Musa',    role: 'Synthetic Trader',  location: 'Nigeria',
        text: 'The market tools are focused, quick, and easy to understand.',
        stars: 5, color: '#8b5cf6',
    },
    {
        initials: 'PK', name: 'Peter Kamau',   role: 'Volatility Trader', location: 'Kenya',
        text: 'Fast tools, clean execution, and bots that are simple to launch.',
        stars: 4, color: '#ef4444',
    },
    {
        initials: 'GN', name: 'Grace Nkosi',   role: 'Bot Builder',       location: 'South Africa',
        text: 'I built my first strategy in minutes. The drag-and-drop editor is brilliant.',
        stars: 5, color: '#06b6d4',
    },
    {
        initials: 'JO', name: 'James Osei',    role: 'Index Trader',      location: 'Ghana',
        text: 'Real-time charts and automated bots in one workspace. Exactly what I needed.',
        stars: 5, color: '#10b981',
    },
    {
        initials: 'FD', name: 'Fatou Diallo',  role: 'Algo Trader',       location: 'Senegal',
        text: 'Switching strategies is seamless. The platform handles everything professionally.',
        stars: 4, color: '#f59e0b',
    },
    {
        initials: 'TM', name: 'Tinashe Moyo',  role: 'Deriv Enthusiast',  location: 'Zimbabwe',
        text: 'Finally a bot builder that just works without complex setup.',
        stars: 5, color: '#ec4899',
    },
];

const STATS = [
    { value: '10K+',   label: 'Active Traders' },
    { value: '50+',    label: 'Strategy Blocks' },
    { value: '99.9%',  label: 'Uptime' },
    { value: 'Free',   label: 'Always' },
];

/* ── Small components ───────────────────────────────────── */
function Stars({ count }: { count: number }) {
    return (
        <div className='landing__testimonial-stars'>
            {Array.from({ length: 5 }).map((_, i) => <span key={i}>{i < count ? '★' : '☆'}</span>)}
        </div>
    );
}

function TestimonialCard({ t }: { t: Testimonial }) {
    return (
        <div className='landing__testimonial-card'>
            <div className='landing__testimonial-top'>
                <div className='landing__testimonial-avatar' style={{ background: t.color }}>
                    {t.initials}
                </div>
                <div>
                    <div className='landing__testimonial-name'>{t.name}</div>
                    <div className='landing__testimonial-role'>{t.role} · {t.location}</div>
                </div>
            </div>
            <Stars count={t.stars} />
            <p className='landing__testimonial-text'>{t.text}</p>
        </div>
    );
}

/* ── Main component ─────────────────────────────────────── */
export default function LandingPage() {
    const doubledTestimonials = [...TESTIMONIALS, ...TESTIMONIALS];

    const handleLogin = useCallback(async () => {
        try {
            const url = await generateOAuthURL();
            if (url) window.location.replace(url);
        } catch { /* fall through */ }
    }, []);

    const handleSignup = useCallback(() => {
        window.open(SIGNUP_URL, '_blank', 'noopener,noreferrer');
    }, []);

    return (
        <div className='landing'>

            {/* ── Header ── */}
            <header className='landing__header'>
                <a className='landing__logo' href='/'>
                    <img src='/logo.jpeg' alt='FrostyDBot' />
                    <span>FrostyDBot</span>
                </a>
                <div className='landing__header-actions'>
                    <button className='landing__btn-login' onClick={handleLogin}>Log in</button>
                    <button className='landing__btn-signup' onClick={handleSignup}>Create account</button>
                </div>
            </header>

            {/* ── Hero ── */}
            <section className='landing__hero'>
                <div className='landing__hero-badge'>Free bots, automation, and trading tools in one workspace</div>
                <h1 className='landing__hero-title'>
                    One Workspace. <em>Limitless Strategies.</em>
                </h1>
                <p className='landing__hero-subtitle'>
                    Free trading bots and professional tools. Build, load, and run automated strategies
                    from a focused workspace made for everyday traders.
                </p>
                <div className='landing__hero-actions'>
                    <button className='landing__cta-primary' onClick={handleLogin}>
                        ♥ Log in and trade →
                    </button>
                    <button className='landing__cta-secondary' onClick={handleSignup}>
                        ⚡ Create free account
                    </button>
                </div>
            </section>

            {/* ── Stats ── */}
            <div className='landing__stats'>
                {STATS.map(s => (
                    <div className='landing__stat' key={s.label}>
                        <span className='landing__stat-value'>{s.value}</span>
                        <span className='landing__stat-label'>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Testimonials ── */}
            <section className='landing__testimonials'>
                <div className='landing__testimonials-track'>
                    {doubledTestimonials.map((t, i) => <TestimonialCard key={`${t.initials}-${i}`} t={t} />)}
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className='landing__footer'>
                <div className='landing__footer-logo'>
                    <img src='/logo.jpeg' alt='FrostyDBot' />
                    <span>FrostyDBot</span>
                </div>
                <span className='landing__footer-copy'>© {new Date().getFullYear()} FrostyDBot. All rights reserved.</span>
                <div className='landing__footer-links'>
                    <a href='https://deriv.com/tnc/binary.pdf' target='_blank' rel='noopener noreferrer'>Terms</a>
                    <a href='https://deriv.com/privacy-policy/' target='_blank' rel='noopener noreferrer'>Privacy</a>
                    <a href='https://developers.deriv.com' target='_blank' rel='noopener noreferrer'>API Docs</a>
                </div>
            </footer>

        </div>
    );
}
