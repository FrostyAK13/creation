import React, { useEffect } from 'react';
import './epic-loader.scss';

const EpicLoader: React.FC<{ phrase?: string }> = ({ phrase = 'Starting up…' }) => {
    useEffect(() => {
        // cheap accessibility announcement for screen readers
        const el = document.getElementById('epic-loader-aria');
        if (el) el.textContent = phrase;
    }, [phrase]);

    return (
        <div className='epic-loader' role='status' aria-live='polite'>
            <span id='epic-loader-aria' className='visually-hidden' />

            <div className='epic-loader__backdrop' aria-hidden='true' />

            <div className='epic-loader__waves' aria-hidden='true'>
                {/* Several expanding rings */}
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
