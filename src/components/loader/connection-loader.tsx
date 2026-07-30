import React, { useEffect, useState } from 'react';
import './connection-loader.scss';

const PHRASES = ['Initializing…', 'Syncing markets…', 'Preparing workspace…'];

const ConnectionLoader = () => {
    const [i, setI] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setI(s => (s + 1) % PHRASES.length), 2400);
        return () => clearInterval(t);
    }, []);

    return (
        <div className='conn-loader conn-loader--wow' role='status' aria-live='polite'>
            <div className='conn-loader__backdrop' aria-hidden='true' />

            <div className='conn-loader__center'>
                <div className='conn-loader__logo-shell'>
                    <div className='conn-loader__ring conn-loader__ring--neon' />
                    <div className='conn-loader__ring conn-loader__ring--sweep' />
                    <div className='conn-loader__logo-wrap'>
                        <img src='/logo-loader.jpeg' alt='App logo' className='conn-loader__logo-img' />
                    </div>
                    <div className='conn-loader__ripple conn-loader__ripple--one' />
                    <div className='conn-loader__ripple conn-loader__ripple--two' />
                </div>

                <div className='conn-loader__meta'>
                    <div className='conn-loader__phrase'>{PHRASES[i]}</div>
                    <div className='conn-loader__live'>
                        <span className='conn-loader__dot' />
                        <span className='conn-loader__dot' />
                        <span className='conn-loader__dot' />
                    </div>
                </div>
            </div>

            <div className='conn-loader__particles' aria-hidden='true'>
                {Array.from({ length: 10 }).map((_, idx) => (
                    <span key={idx} className={`conn-loader__pconn p-${idx}`} />
                ))}
            </div>
        </div>
    );
};

export default ConnectionLoader;
