/**
 * Marketing Account Virtual Balance
 *
 * Gives specific CR accounts a custom starting demo balance that tracks
 * real trade deltas — so wins/losses reflect accurately — and resets to
 * the configured default on demand.
 *
 * How it works:
 *   1. On first login we record the Deriv reference balance (what Deriv
 *      thinks the demo account has) and set our display balance to the
 *      configured default (e.g. 258.23 USD).
 *   2. Every time Deriv sends a live balance update we compute the delta
 *      (new Deriv balance − stored reference) and apply it to our display
 *      balance.  Both the display balance and the reference are then
 *      persisted to localStorage so they survive a page reload.
 *   3. Reset: store the current Deriv balance as the new reference and
 *      reset the display balance to the configured default.
 *
 * To add more marketing accounts, extend MARKETING_ACCOUNTS below.
 */

// ── Configuration ─────────────────────────────────────────────────────────────

export interface MarketingAccountConfig {
    /** Balance the demo account starts at (and resets to). */
    defaultBalance: number;
    /** ISO currency code, used for display formatting. */
    currency: string;
    /** Human-readable label shown on the reset button. */
    label?: string;
}

/** Map of real CR loginids → their marketing demo balance config. */
export const MARKETING_ACCOUNTS: Record<string, MarketingAccountConfig> = {
    CR00287661: {
        defaultBalance: 258.23,
        currency: 'USD',
        label: 'Marketing Demo',
    },
};

// ── Storage helpers ───────────────────────────────────────────────────────────

/** localStorage key for the tracked display balance (keyed by demo loginid). */
const balKey = (demoLoginid: string) => `mktbal_v1_${demoLoginid}`;

/** localStorage key for the Deriv reference balance (keyed by demo loginid). */
const refKey = (demoLoginid: string) => `mktref_v1_${demoLoginid}`;

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if `loginid` is one of the configured marketing CR accounts. */
export function isMarketingCR(loginid: string): boolean {
    return Object.prototype.hasOwnProperty.call(MARKETING_ACCOUNTS, loginid);
}

/** Returns the configured default balance for a marketing CR account. */
export function getDefaultBalance(crLoginid: string): number {
    return MARKETING_ACCOUNTS[crLoginid]?.defaultBalance ?? 0;
}

/** Returns the configured currency for a marketing CR account. */
export function getMarketingCurrency(crLoginid: string): string {
    return MARKETING_ACCOUNTS[crLoginid]?.currency ?? 'USD';
}

/**
 * Call once when the marketing account is first detected in the account list.
 * If no prior session exists it initialises the balance to the configured
 * default and records `currentDerivBalance` as the reference point.
 * Returns the current display balance (default on first call, persisted value
 * thereafter).
 */
export function initMarketingBalance(
    crLoginid: string,
    demoLoginid: string,
    currentDerivBalance: number
): number {
    const bKey = balKey(demoLoginid);
    const rKey = refKey(demoLoginid);
    const storedBal = localStorage.getItem(bKey);
    const storedRef = localStorage.getItem(rKey);

    const balNum = storedBal !== null ? parseFloat(storedBal) : NaN;
    const refNum = storedRef !== null ? parseFloat(storedRef) : NaN;

    // Reinitialise if either key is missing OR if either value parsed to NaN.
    if (isNaN(balNum) || isNaN(refNum)) {
        const defaultBal = getDefaultBalance(crLoginid);
        localStorage.setItem(bKey, String(defaultBal));
        localStorage.setItem(rKey, String(currentDerivBalance));
        return defaultBal;
    }

    // Returning visit — the persisted balance is already correct.
    return balNum;
}

/**
 * Called whenever the Deriv WebSocket sends a live balance update for the
 * demo account.  Computes the delta relative to the last recorded Deriv
 * balance, applies it to our display balance, persists both, and returns the
 * new display balance.  Returns null if the account has not been initialised.
 */
export function applyDerivUpdate(demoLoginid: string, newDerivBalance: number): number | null {
    const bKey = balKey(demoLoginid);
    const rKey = refKey(demoLoginid);

    const storedBal = localStorage.getItem(bKey);
    const storedRef = localStorage.getItem(rKey);

    if (storedBal === null || storedRef === null) return null;

    const prevRef = parseFloat(storedRef);
    const currentDisplay = parseFloat(storedBal);
    const delta = newDerivBalance - prevRef;

    if (delta === 0) return currentDisplay;

    const newDisplay = Math.max(0, parseFloat((currentDisplay + delta).toFixed(6)));

    localStorage.setItem(bKey, String(newDisplay));
    localStorage.setItem(rKey, String(newDerivBalance));

    return newDisplay;
}

/**
 * Resets the display balance back to the configured default.
 * `currentDerivBalance` becomes the new reference so future trade deltas are
 * computed correctly.
 * Returns the new display balance (i.e. the default).
 */
export function resetMarketingBalance(
    crLoginid: string,
    demoLoginid: string,
    currentDerivBalance: number
): number {
    const defaultBal = getDefaultBalance(crLoginid);
    localStorage.setItem(balKey(demoLoginid), String(defaultBal));
    localStorage.setItem(refKey(demoLoginid), String(currentDerivBalance));
    return defaultBal;
}

/**
 * Returns the current stored display balance without modifying anything.
 * Returns null if the account has not been initialised yet.
 */
export function getStoredMarketingBalance(demoLoginid: string): number | null {
    const stored = localStorage.getItem(balKey(demoLoginid));
    return stored !== null ? parseFloat(stored) : null;
}
