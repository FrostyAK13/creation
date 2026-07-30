// Simple market ticker service: polls public APIs for pair prices.
// Falls back to simulated updates if fetches fail.
/* eslint-disable no-console */
export type PairSpec = { pair: string };

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';
const EXR_URL = 'https://api.exchangerate.host/latest';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

import createDerivWsFeed from './market-ws.service';

export function createMarketTicker(
    pairs: string[],
    onUpdate: (data: { pair: string; price: number }[]) => void,
    interval = 3000
) {
    let cancelled = false;

    // If any pair looks like a Deriv tick symbol (R_10 / R_50), prefer websocket
    const derivSymbols = pairs.filter(p => /^R_\d+/i.test(p));
    if (derivSymbols.length > 0) {
        // Use WebSocket feed for deriv symbols and keep polling for others
        const ws = createDerivWsFeed(derivSymbols, ({ symbol, price }) => {
            onUpdate([{ pair: symbol, price }]);
        });

        // Start fallback polling in background for non-deriv pairs
        const otherPairs = pairs.filter(p => !derivSymbols.includes(p));
        if (otherPairs.length === 0) {
            return {
                stop: () => {
                    cancelled = true;
                    ws.stop();
                },
            };
        }

        // If there are mixed pairs, continue with the old polling loop for them
        async function loopMixed() {
            while (!cancelled) {
                try {
                    // reuse existing fetchOnce logic by calling inner fetch with subset
                    await (async function fetchOnceSubset() {
                        const results: { pair: string; price: number }[] = [];
                        try {
                            const btcPairs = otherPairs.filter(p => /BTC\//i.test(p));
                            const fiatPairs = otherPairs.filter(p => !/BTC\//i.test(p));

                            if (btcPairs.length > 0) {
                                const ids = ['bitcoin'];
                                const vs_currencies = Array.from(new Set(btcPairs.map(p => p.split('/')[1].toLowerCase()))).join(',');
                                const url = `${COINGECKO_URL}?ids=${ids.join(',')}&vs_currencies=${vs_currencies}`;
                                const res = await fetch(url, { cache: 'no-store' });
                                if (res.ok) {
                                    const json = await res.json();
                                    btcPairs.forEach(p => {
                                        const [base, quote] = p.split('/');
                                        const v = json['bitcoin']?.[quote.toLowerCase()];
                                        if (v) results.push({ pair: p, price: +v });
                                    });
                                }
                            }

                            const byBase: Record<string, string[]> = {};
                            fiatPairs.forEach(p => {
                                const [b, q] = p.split('/');
                                byBase[b] = byBase[b] || [];
                                byBase[b].push(q);
                            });

                            for (const base of Object.keys(byBase)) {
                                const syms = Array.from(new Set(byBase[base])).join(',');
                                const url = `${EXR_URL}?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(syms)}`;
                                try {
                                    const r = await fetch(url, { cache: 'no-store' });
                                    if (r.ok) {
                                        const j = await r.json();
                                        for (const q of byBase[base]) {
                                            const rate = j?.rates?.[q];
                                            if (rate) results.push({ pair: `${base}/${q}`, price: +rate });
                                        }
                                    }
                                } catch (e) {
                                    console.warn('exr fetch error', e);
                                }
                            }

                            if (results.length === 0) throw new Error('No results');
                            onUpdate(results);
                            return true;
                        } catch (e) {
                            const sim = otherPairs.map(p => ({ pair: p, price: +(100 * (Math.random() * 1.4)).toFixed(4) }));
                            onUpdate(sim);
                            return false;
                        }
                    })();
                } catch (e) {}
                await sleep(interval);
            }
        }

        loopMixed();

        return {
            stop: () => {
                cancelled = true;
                ws.stop();
            },
        };
    }

    async function fetchOnce() {
        const results: { pair: string; price: number }[] = [];
        try {
            // Group BTC-like symbols for coingecko
            const btcPairs = pairs.filter(p => /BTC\//i.test(p));
            const fiatPairs = pairs.filter(p => !/BTC\//i.test(p));

            // Fetch BTC via CoinGecko in one call
            if (btcPairs.length > 0) {
                const ids = ['bitcoin'];
                const vs_currencies = Array.from(new Set(btcPairs.map(p => p.split('/')[1].toLowerCase()))).join(',');
                const url = `${COINGECKO_URL}?ids=${ids.join(',')}&vs_currencies=${vs_currencies}`;
                const res = await fetch(url, { cache: 'no-store' });
                if (res.ok) {
                    const json = await res.json();
                    btcPairs.forEach(p => {
                        const [base, quote] = p.split('/');
                        const v = json['bitcoin']?.[quote.toLowerCase()];
                        if (v) results.push({ pair: p, price: +v });
                    });
                }
            }

            // Fetch fiat via exchangerate.host per-base grouping to reduce calls
            const byBase: Record<string, string[]> = {};
            fiatPairs.forEach(p => {
                const [b, q] = p.split('/');
                byBase[b] = byBase[b] || [];
                byBase[b].push(q);
            });

            for (const base of Object.keys(byBase)) {
                const syms = Array.from(new Set(byBase[base])).join(',');
                const url = `${EXR_URL}?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(syms)}`;
                try {
                    const r = await fetch(url, { cache: 'no-store' });
                    if (r.ok) {
                        const j = await r.json();
                        for (const q of byBase[base]) {
                            const rate = j?.rates?.[q];
                            if (rate) results.push({ pair: `${base}/${q}`, price: +rate });
                        }
                    }
                } catch (e) {
                    console.warn('exr fetch error', e);
                }
            }

            if (results.length === 0) throw new Error('No results');
            onUpdate(results);
            return true;
        } catch (e) {
            // fallback: simulate small random movements
            try {
                const sim = pairs.map(p => ({ pair: p, price: +(100 * (Math.random() * 1.4)).toFixed(4) }));
                onUpdate(sim);
            } catch (_e) {}
            return false;
        }
    }

    async function loop() {
        while (!cancelled) {
            await fetchOnce();
            await sleep(interval);
        }
    }

    loop();

    return {
        stop: () => {
            cancelled = true;
        },
    };
}
