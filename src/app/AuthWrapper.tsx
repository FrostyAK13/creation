import { lazy, Suspense } from 'react';
import LandingPage from '@/components/landing/LandingPage';

const App = lazy(() => import('./App'));

/**
 * Show the landing page to unauthenticated visitors.
 * If the user is logged in (active_loginid in localStorage) OR
 * an OAuth callback (?code=) is in progress, render the full app.
 */
function isAuthenticated(): boolean {
    // OAuth callback in flight — let App.tsx handle the code exchange
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('code')) {
        return true;
    }
    return !!localStorage.getItem('active_loginid');
}

export const AuthWrapper = () => {
    if (!isAuthenticated()) {
        return <LandingPage />;
    }

    return (
        <Suspense fallback={null}>
            <App />
        </Suspense>
    );
};
