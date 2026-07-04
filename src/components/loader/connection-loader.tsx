import React, { useEffect, useState } from 'react';
import './connection-loader.scss';

const STEPS = [
    'Please wait as we connect to the server…',
    'Initialising workspace…',
    'Almost ready…',
];

const ConnectionLoader = () => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setStep(s => (s < STEPS.length - 1 ? s + 1 : s));
        }, 2400);
        return () => clearInterval(id);
    }, []);

    return (
        <div className='conn-loader' style={{ backgroundImage: "url('/logo-loader.jpeg')" }}>
            {/* dark overlay so text/spinner stay readable over the logo */}
            <div className='conn-loader__overlay' />

            {/* spinner */}
            <div className='conn-loader__spinner-wrap'>
                <div className='conn-loader__ring' />
                <div className='conn-loader__ring conn-loader__ring--2' />
            </div>

            {/* progress dots */}
            <div className='conn-loader__dots'>
                {STEPS.map((_, i) => (
                    <span
                        key={i}
                        className={`conn-loader__dot${i <= step ? ' conn-loader__dot--active' : ''}`}
                    />
                ))}
            </div>

            {/* status text */}
            <p key={step} className='conn-loader__status'>{STEPS[step]}</p>
        </div>
    );
};

export default ConnectionLoader;
