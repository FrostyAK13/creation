import React, { useEffect, useMemo, useRef, useState } from 'react';
import './devtools-guard.scss';

const DETECTION_INTERVAL = 800;
const DIMENSION_THRESHOLD = 160;

function detectDevToolsOpen() {
    if (typeof window === 'undefined') return false;

    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    const isLarge = widthDiff > DIMENSION_THRESHOLD || heightDiff > DIMENSION_THRESHOLD;

    let isOpened = isLarge;

    try {
        const start = performance.now();
        // eslint-disable-next-line no-debugger
        debugger;
        const end = performance.now();
        if (end - start > 100) isOpened = true;
    } catch {
        // ignore
    }

    return isOpened;
}

const DevToolsGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [devtoolsOpen, setDevtoolsOpen] = useState(false);
    const wasOpen = useRef(false);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const check = () => {
            const open = detectDevToolsOpen();
            if (open && !devtoolsOpen) {
                setDevtoolsOpen(true);
            }
            if (!open && wasOpen.current) {
                window.location.reload();
            }
            wasOpen.current = open;
        };

        const intervalId = window.setInterval(check, DETECTION_INTERVAL);
        check();

        const handleKeyDown = (event: KeyboardEvent) => {
            const keys = [
                'F12',
                'I',
                'J',
                'C',
                'U',
            ];
            const lowerKey = event.key.toUpperCase();
            if (
                event.key === 'F12' ||
                ((event.ctrlKey || event.metaKey) && event.shiftKey && keys.includes(lowerKey)) ||
                ((event.ctrlKey || event.metaKey) && lowerKey === 'U')
            ) {
                event.preventDefault();
                setDevtoolsOpen(true);
            }
        };

        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
            setDevtoolsOpen(true);
        };

        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('contextmenu', handleContextMenu, true);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('contextmenu', handleContextMenu, true);
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        };
    }, [devtoolsOpen]);

    const overlay = useMemo(
        () => (
            <div className='devtools-guard'>
                <div className='devtools-guard__inner'>
                    <div className='devtools-guard__logo' />
                    <h1>Warning</h1>
                    <p>Developer tools has been detected. The site is locked to protect the content.</p>
                    <p>Please close DevTools and reload the page to continue.</p>
                    <div className='devtools-guard__contact'>
                        Contact the site owner for support if this is a mistake.
                    </div>
                </div>
            </div>
        ),
        []
    );

    return <>{devtoolsOpen ? overlay : children}</>;
};

export default DevToolsGuard;
