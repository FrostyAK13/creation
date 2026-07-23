import { lazy, Suspense } from 'react';

const App = lazy(() => import('./App'));

export const AuthWrapper = () => (
    <Suspense fallback={null}>
        <App />
    </Suspense>
);
