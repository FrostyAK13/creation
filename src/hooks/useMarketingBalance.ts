/**
 * useMarketingBalance
 *
 * Detects when a marketing CR account (see src/utils/marketing-balance.ts) is
 * present in the account list, then:
 *   - Initialises the custom virtual balance in localStorage.
 *   - Subscribes to live Deriv WebSocket balance messages so trade P&L is
 *     reflected in real-time on the display balance.
 *   - Exposes a resetDemoBalance() that snaps the display balance back to the
 *     configured default (e.g. 258.23 USD).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { TAuthData } from '@/types/api-types';
import { isDemoAccount } from '@/utils/account-helpers';
import {
    applyDerivUpdate,
    getDefaultBalance,
    initMarketingBalance,
    isMarketingCR,
    resetMarketingBalance,
} from '@/utils/marketing-balance';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseMarketingBalanceReturn {
    /** True when a marketing CR account is detected in the account list. */
    isMarketingActive: boolean;
    /** The VRTC/demo loginid associated with the marketing CR account. */
    marketingDemoLoginid: string | null;
    /** The CR loginid of the marketing account. */
    marketingCRLoginid: string | null;
    /**
     * The current tracked display balance.  null until the account list has
     * been populated and the demo account identified.
     */
    marketingBalance: number | null;
    /** Configured default balance (e.g. 258.23). */
    defaultBalance: number;
    /** Resets the display balance to the configured default. */
    resetDemoBalance: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMarketingBalance(
    accountList: TAuthData['account_list']
): UseMarketingBalanceReturn {
    const [marketingBalance, setMarketingBalance] = useState<number | null>(null);
    const [marketingDemoLoginid, setMarketingDemoLoginid] = useState<string | null>(null);
    const [marketingCRLoginid, setMarketingCRLoginid] = useState<string | null>(null);

    // Stable refs so the WebSocket callback always has the latest loginids.
    const demoLidRef = useRef<string | null>(null);
    const crLidRef = useRef<string | null>(null);
    // Tracks the most-recently-seen Deriv balance so we can reset against it.
    const lastDerivBalanceRef = useRef<number>(0);

    // ── 1. Detect marketing account in account list ───────────────────────────

    useEffect(() => {
        // Always clear state first — handles logout / empty-list transitions.
        if (!accountList?.length) {
            setMarketingDemoLoginid(null);
            setMarketingCRLoginid(null);
            setMarketingBalance(null);
            demoLidRef.current = null;
            crLidRef.current = null;
            return;
        }

        const crAccount = accountList.find(a => isMarketingCR(a.loginid));

        if (!crAccount) {
            // No marketing CR in this session — clear any stale state.
            setMarketingDemoLoginid(null);
            setMarketingCRLoginid(null);
            setMarketingBalance(null);
            demoLidRef.current = null;
            crLidRef.current = null;
            return;
        }

        // Find the demo account that belongs to this user's session.
        // Deriv users normally have exactly one virtual account (VRTC…) per
        // session.  If somehow more than one demo account is present we use the
        // first one (standard Deriv behaviour).
        const demoAccount = accountList.find(a => isDemoAccount(a.loginid));
        if (!demoAccount) return;

        const crLid = crAccount.loginid;
        const demoLid = demoAccount.loginid;
        crLidRef.current = crLid;
        demoLidRef.current = demoLid;
        setMarketingCRLoginid(crLid);
        setMarketingDemoLoginid(demoLid);

        // Derive the current Deriv balance from the account list entry.
        const derivBal =
            typeof demoAccount.balance === 'number'
                ? demoAccount.balance
                : parseFloat(String(demoAccount.balance ?? 0)) || 0;

        const safeDeriv = isNaN(derivBal) ? 0 : derivBal;
        lastDerivBalanceRef.current = safeDeriv;

        const bal = initMarketingBalance(crLid, demoLid, safeDeriv);
        setMarketingBalance(bal);
    }, [accountList]);

    // ── 2. Subscribe to live balance updates from Deriv WebSocket ─────────────

    useEffect(() => {
        if (!marketingDemoLoginid) return;

        // api_base.api may not be ready on first render — retry via interval.
        let subscription: { unsubscribe: () => void } | null = null;

        const attach = () => {
            if (!api_base.api) return false;
            try {
                subscription = api_base.api.onMessage().subscribe(({ data }: { data: any }) => {
                    if (data?.msg_type !== 'balance' || !data?.balance) return;

                    const { balance: newDerivBal, loginid: updateLoginid } = data.balance;

                    // Only handle messages for our demo account.
                    if (updateLoginid && updateLoginid !== demoLidRef.current) return;

                    lastDerivBalanceRef.current = newDerivBal;

                    const demoLid = demoLidRef.current;
                    if (!demoLid) return;

                    const newDisplay = applyDerivUpdate(demoLid, newDerivBal);
                    if (newDisplay !== null) {
                        setMarketingBalance(newDisplay);
                    }
                });
                return true;
            } catch {
                return false;
            }
        };

        if (!attach()) {
            // api not ready yet — poll until it is.
            const timer = setInterval(() => {
                if (attach()) clearInterval(timer);
            }, 500);
            return () => {
                clearInterval(timer);
                subscription?.unsubscribe();
            };
        }

        return () => {
            subscription?.unsubscribe();
        };
    }, [marketingDemoLoginid]);

    // ── 3. Reset handler ──────────────────────────────────────────────────────

    const resetDemoBalance = useCallback(() => {
        const demoLid = demoLidRef.current;
        const crLid = crLidRef.current;
        if (!demoLid || !crLid) return;

        const newBal = resetMarketingBalance(crLid, demoLid, lastDerivBalanceRef.current);
        setMarketingBalance(newBal);
    }, []);

    // ── Return ────────────────────────────────────────────────────────────────

    const isMarketingActive = marketingCRLoginid !== null;
    const defaultBalance = marketingCRLoginid ? getDefaultBalance(marketingCRLoginid) : 0;

    return {
        isMarketingActive,
        marketingDemoLoginid,
        marketingCRLoginid,
        marketingBalance,
        defaultBalance,
        resetDemoBalance,
    };
}
