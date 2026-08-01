import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { isDemoAccount } from '@/utils/account-helpers';
import { getAutoDetectedCopyTradingLeader } from '@/utils/marketing-balance';
import './copy-trading.scss';

// ── icons ────────────────────────────────────────────────────────────────────

const IconPlay = () => (
    <svg width='13' height='13' viewBox='0 0 24 24' fill='currentColor'>
        <polygon points='5 3 19 12 5 21 5 3' />
    </svg>
);
const IconStop = () => (
    <svg width='13' height='13' viewBox='0 0 24 24' fill='currentColor'>
        <rect x='3' y='3' width='18' height='18' rx='2' />
    </svg>
);
const IconClose = () => (
    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
        <line x1='18' y1='6' x2='6' y2='18' />
        <line x1='6' y1='6' x2='18' y2='18' />
    </svg>
);
const IconKey = () => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <circle cx='7.5' cy='15.5' r='5.5' />
        <path d='M21 2l-9.6 9.6' />
        <path d='M15.5 7.5l3 3' />
    </svg>
);
const IconUsers = () => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
        <circle cx='9' cy='7' r='4' />
        <path d='M23 21v-2a4 4 0 0 0-3-3.87' />
        <path d='M16 3.13a4 4 0 0 1 0 7.75' />
    </svg>
);
const IconDemoReal = () => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <rect x='2' y='3' width='20' height='14' rx='2' />
        <path d='M8 21h8M12 17v4' />
        <path d='M9 10l2 2 4-4' />
    </svg>
);
const IconTag = () => (
    <svg width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' opacity='0.35'>
        <path d='M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z' />
        <line x1='7' y1='7' x2='7.01' y2='7' />
    </svg>
);
const IconCopy = () => (
    <svg width='52' height='52' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' opacity='0.8'>
        <circle cx='12' cy='12' r='3' />
        <path d='M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83' />
    </svg>
);
const IconDisconnect = () => (
    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
        <path d='M18.36 6.64a9 9 0 1 1-12.73 0' />
        <line x1='12' y1='2' x2='12' y2='12' />
    </svg>
);
const IconAlert = () => (
    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <circle cx='12' cy='12' r='10' />
        <line x1='12' y1='8' x2='12' y2='12' />
        <line x1='12' y1='16' x2='12.01' y2='16' />
    </svg>
);

// ── helpers ───────────────────────────────────────────────────────────────────

const maskToken = (t: string) => (t.length > 10 ? `${t.slice(0, 4)}...${t.slice(-4)}` : t);
const fmtBalance = (b: number, currency: string) => `${b.toFixed(2)} ${currency}`;
const fmtDate = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ── main page ─────────────────────────────────────────────────────────────────

const CopyTrading = observer(() => {
    const store = useStore();
    const ct = store.copy_trading;

    React.useEffect(() => {
        try {
            const client = store.client;
            const liveApi = api_base?.api || undefined;
            const liveAccountInfo = (api_base as any)?.account_info || {};
            const activeLoginid = client?.loginid || liveAccountInfo?.loginid || api_base?.account_id || '';
            const activeBalance = client?.balance ?? liveAccountInfo?.balance ?? 0;
            const activeCurrency = client?.currency ?? liveAccountInfo?.currency ?? 'USD';
            const activeIsVirtual = client?.is_virtual ?? liveAccountInfo?.is_virtual ?? (activeLoginid ? isDemoAccount(activeLoginid) : false);
            const detectedLeaderLoginid = getAutoDetectedCopyTradingLeader(activeLoginid, !!activeIsVirtual);

            if (!activeLoginid || !detectedLeaderLoginid || !liveApi) return;
            if (ct.leader_status === 'connected' && ct.leader_account?.loginid === detectedLeaderLoginid) return;

            void (async () => {
                await ct.connectLeaderFromApi(
                    liveApi,
                    {
                        loginid: detectedLeaderLoginid,
                        balance: parseFloat(String(activeBalance)) || 0,
                        currency: activeCurrency,
                        is_virtual: activeIsVirtual ? 1 : 0,
                    }
                );

                if (activeLoginid !== detectedLeaderLoginid) {
                    await ct.connectFollowerFromApi(liveApi, {
                        loginid: activeLoginid,
                        balance: parseFloat(String(activeBalance)) || 0,
                        currency: activeCurrency,
                        is_virtual: activeIsVirtual ? 1 : 0,
                    });
                }
            })();
        } catch (e) {
            // ignore auto-detect failures
        }
    }, [store.client?.loginid, store.client?.balance, store.client?.currency, store.client?.is_virtual]);

    const handleFollowerKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') ct.addFollower();
    };

    const handleConnectLeader = async () => {
        try {
            const client = store.client;
            const liveApi = api_base?.api || undefined;
            const liveAccountInfo = (api_base as any)?.account_info || {};
            const activeLoginid = client?.loginid || liveAccountInfo?.loginid || api_base?.account_id || '';
            const activeBalance = client?.balance ?? liveAccountInfo?.balance ?? 0;
            const activeCurrency = client?.currency ?? liveAccountInfo?.currency ?? 'USD';
            const activeIsVirtual = client?.is_virtual ?? liveAccountInfo?.is_virtual ?? (activeLoginid ? isDemoAccount(activeLoginid) : false);
            const detectedLeaderLoginid = getAutoDetectedCopyTradingLeader(activeLoginid, !!activeIsVirtual);

            if (!activeLoginid || !detectedLeaderLoginid || !liveApi) return;

            await ct.connectLeaderFromApi(liveApi, {
                loginid: detectedLeaderLoginid,
                balance: parseFloat(String(activeBalance)) || 0,
                currency: activeCurrency,
                is_virtual: activeIsVirtual ? 1 : 0,
            });

            if (activeLoginid !== detectedLeaderLoginid) {
                await ct.connectFollowerFromApi(liveApi, {
                    loginid: activeLoginid,
                    balance: parseFloat(String(activeBalance)) || 0,
                    currency: activeCurrency,
                    is_virtual: activeIsVirtual ? 1 : 0,
                });
            }
        } catch (e) {
            // ignore auto-detect failures
        }
    };

    const connectedFollowers = ct.followers.filter(f => f.status === 'connected');
    const canStart =
        ct.leader_status === 'connected' &&
        !ct.is_running &&
        (connectedFollowers.length > 0 || !!ct.leader_account);
    const canStop = ct.is_running;

    return (
        <div className='ct2'>
            {/* ── error toasts ──────────────────────────────────────────────── */}
            {(ct.error_messages?.length ?? 0) > 0 && (
                <div className='ct2__toasts'>
                    {ct.error_messages.map((msg, i) => (
                        <div key={i} className='ct2__toast'>
                            <IconAlert />
                            <span className='ct2__toast-text'>{msg}</span>
                            <button
                                className='ct2__toast-close'
                                onClick={() => ct.dismissError(i)}
                                aria-label={localize('Dismiss')}
                            >
                                <IconClose />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── hero ─────────────────────────────────────────────────────── */}
            <div className='ct2__hero'>
                <div className='ct2__hero-content'>
                    <div className='ct2__live-badge'>
                        <span className='ct2__live-dot' />
                        {localize('LIVE COPY TRADING')}
                    </div>

                    <h1 className='ct2__headline'>
                        {localize('Your account, your control.')}<br />
                        {localize('Maximize Gains with')}{' '}
                        <span className='ct2__headline--accent'>{localize('CopyTrading')}</span>
                    </h1>

                    <p className='ct2__subheadline'>
                        {localize(
                            'Mirror trades from your master account to multiple client accounts in real time — automatically and instantly.'
                        )}
                    </p>

                    <div className='ct2__stats'>
                        <div className='ct2__stat'>
                            <span className='ct2__stat-value'>{ct.followers.length}</span>
                            <span className='ct2__stat-label'>{localize('LINKED ACCOUNTS')}</span>
                        </div>
                        <div className='ct2__stat-sep' />
                        <div className='ct2__stat'>
                            <span className={`ct2__stat-status ct2__stat-status--${ct.is_running ? 'running' : 'idle'}`}>
                                <span className='ct2__stat-status-dot' />
                                {ct.is_running ? localize('Running') : localize('Idle')}
                            </span>
                            <span className='ct2__stat-label'>{localize('COPY STATUS')}</span>
                        </div>
                        <div className='ct2__stat-sep' />
                        <div className='ct2__stat'>
                            <span className='ct2__stat-value'>{ct.trade_log.length}</span>
                            <span className='ct2__stat-label'>{localize('TRADES REPLICATED')}</span>
                        </div>
                    </div>
                </div>

                <div className='ct2__hero-deco'>
                    <div className='ct2__deco-ring'>
                        <IconCopy />
                    </div>
                </div>
            </div>

            {/* ── body ─────────────────────────────────────────────────────── */}
            <div className='ct2__body'>

                {/* ── left column ─────────────────────────────────────────── */}
                <div className='ct2__left'>

                    {/* Demo → Real card */}
                    <div className='ct2__card'>
                        <div className='ct2__card-icon ct2__card-icon--blue'>
                            <IconDemoReal />
                        </div>
                        <div className='ct2__card-heading'>{localize('Demo → Real')}</div>
                        <p className='ct2__card-desc'>
                            {localize(
                                'Auto-detects your leader account and mirrors trades from the logged-in account using only client API tokens.'
                            )}
                        </p>

                        {/* Leader token */}
                        {ct.leader_status === 'connected' ? (
                            <div className='ct2__leader-section'>
                                <div className='ct2__leader-chip'>
                                    <span className={`ct2__acct-badge ct2__acct-badge--${ct.leader_account?.is_virtual ? 'demo' : 'real'}`}>
                                        {ct.leader_account?.is_virtual ? localize('Demo') : localize('Real')}
                                    </span>
                                    <span className='ct2__acct-id'>{ct.leader_account?.loginid}</span>
                                    <span className='ct2__acct-bal'>
                                        {ct.leader_account
                                            ? fmtBalance(ct.leader_account.balance, ct.leader_account.currency)
                                            : ''}
                                    </span>
                                    {!ct.is_running && (
                                        <button
                                            className='ct2__disconnect-btn'
                                            title={localize('Disconnect leader')}
                                            onClick={() => ct.disconnectLeader()}
                                        >
                                            <IconDisconnect />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className='ct2__leader-section'>
                                <div className='ct2__token-row'>
                                    <span className='ct2__hint-text'>
                                        {ct.leader_status === 'connecting'
                                            ? localize('Connecting your logged-in account automatically…')
                                            : localize('Using your current Deriv account automatically. No demo token required.')}
                                    </span>
                                </div>
                                {!ct.is_running && (
                                    <button
                                        className='ct2__add-btn'
                                        onClick={handleConnectLeader}
                                        disabled={ct.leader_status === 'connecting' || ct.is_running}
                                    >
                                        {ct.leader_status === 'connecting' ? localize('Connecting…') : localize('Connect')}
                                    </button>
                                )}
                                {ct.leader_error && (
                                    <span className='ct2__error-text'>{ct.leader_error}</span>
                                )}
                            </div>
                        )}

                        <button
                            className='ct2__primary-btn'
                            onClick={() => void ct.startCopying()}
                            disabled={!canStart}
                        >
                            <IconPlay />
                            {localize('Start Demo → Real')}
                        </button>
                    </div>

                    {/* Token Replicator card */}
                    <div className='ct2__card'>
                        <div className='ct2__card-icon ct2__card-icon--gold'>
                            <IconKey />
                        </div>
                        <div className='ct2__card-heading'>{localize('Token Replicator')}</div>
                        <p className='ct2__card-desc'>
                            {localize(
                                'Add client API tokens. When you trade, all linked accounts receive the same trade instantly.'
                            )}
                        </p>

                        {/* Stake multiplier */}
                        <div className='ct2__multiplier-row'>
                            <label className='ct2__multiplier-label' htmlFor='ct2-mult'>
                                {localize('Stake ×')}
                            </label>
                            <input
                                id='ct2-mult'
                                className='ct2__multiplier-input'
                                type='number'
                                min='0.01'
                                max='100'
                                step='0.1'
                                value={ct.stake_multiplier}
                                onChange={e => ct.setStakeMultiplier(parseFloat(e.target.value) || 1)}
                                disabled={ct.is_running}
                            />
                            <span className='ct2__multiplier-hint'>
                                {localize('(1.0 = same, 0.5 = half, 2.0 = double)')}
                            </span>
                        </div>

                        <div className='ct2__token-row'>
                            <input
                                className='ct2__token-input'
                                type='text'
                                placeholder={localize('Paste client API token…')}
                                value={ct.new_follower_token}
                                onChange={e => ct.setNewFollowerToken(e.target.value)}
                                onKeyDown={handleFollowerKeyDown}
                                disabled={ct.is_running}
                            />
                            <button
                                className='ct2__add-btn'
                                onClick={() => ct.addFollower()}
                                disabled={!ct.new_follower_token || ct.is_running}
                            >
                                {localize('Add')}
                            </button>
                        </div>

                        {canStop ? (
                            <button
                                className='ct2__primary-btn ct2__primary-btn--stop'
                                onClick={() => ct.stopCopying()}
                            >
                                <IconStop />
                                {localize('Stop Copying')}
                            </button>
                        ) : (
                            <button
                                className='ct2__primary-btn'
                                onClick={() => void ct.startCopying()}
                                disabled={!canStart}
                            >
                                <IconPlay />
                                {localize('Start Copy Trading')}
                            </button>
                        )}

                        {!canStart && !ct.is_running && (
                            <span className='ct2__hint-text'>
                                {ct.leader_status !== 'connected'
                                    ? localize('Connect the leader (demo) account first.')
                                    : connectedFollowers.length === 0
                                        ? localize('Add at least one client token above.')
                                        : ''}
                            </span>
                        )}
                    </div>

                    {/* Trade log */}
                    {ct.trade_log.length > 0 && (
                        <div className='ct2__card'>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div className='ct2__card-heading' style={{ marginBottom: 0 }}>
                                    {localize('Trade Log')}
                                    <span className='ct2__log-count'>({ct.trade_log.length})</span>
                                </div>
                                <button className='ct2__clear-btn' onClick={() => ct.clearLog()}>
                                    {localize('Clear')}
                                </button>
                            </div>
                            <div className='ct2__log'>
                                {ct.trade_log.map(entry => (
                                    <div key={entry.id} className='ct2__log-row'>
                                        <span className='ct2__log-time'>{fmtDate(entry.timestamp)}</span>
                                        <span className='ct2__log-trade'>
                                            <strong>{entry.symbol}</strong>
                                            {' · '}{entry.contract_type}
                                            {' · '}{entry.duration}{entry.duration_unit}
                                        </span>
                                        <span className='ct2__log-stake'>
                                            {entry.stake.toFixed(2)} {entry.currency}
                                        </span>
                                        <div className='ct2__log-chips'>
                                            {entry.results.map(r => (
                                                <span
                                                    key={r.follower_loginid}
                                                    className={`ct2__log-chip ct2__log-chip--${r.error ? 'err' : 'ok'}`}
                                                    title={r.error ?? `Contract #${r.contract_id}`}
                                                >
                                                    {r.error ? '✕' : '✓'} {r.follower_loginid}
                                                    {r.buy_price !== undefined && ` (${r.buy_price.toFixed(2)})`}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── right column ─────────────────────────────────────────── */}
                <div className='ct2__right'>
                    <div className='ct2__card ct2__card--tall'>
                        <div className='ct2__replicated-header'>
                            <div className='ct2__card-icon ct2__card-icon--grey'>
                                <IconUsers />
                            </div>
                            <div className='ct2__card-heading'>{localize('Replicated Accounts')}</div>
                        </div>
                        <div className='ct2__card-divider' />

                        {ct.followers.length === 0 ? (
                            <div className='ct2__empty-state'>
                                <IconTag />
                                <p>
                                    {localize(
                                        'No accounts linked yet. Add a client API token to start replicating trades.'
                                    )}
                                </p>
                            </div>
                        ) : (
                            <div className='ct2__account-list'>
                                {ct.followers.map(f => (
                                    <div key={f.token} className='ct2__account-row'>
                                        <div className='ct2__account-row-left'>
                                            <span className={`ct2__acct-status-dot ct2__acct-status-dot--${f.status}`} />
                                            <div className='ct2__account-row-info'>
                                                <span className='ct2__account-row-id'>
                                                    {f.account?.loginid ?? maskToken(f.token)}
                                                </span>
                                                {f.account && (
                                                    <span className='ct2__account-row-bal'>
                                                        {fmtBalance(f.account.balance, f.account.currency)}
                                                        <span className={`ct2__acct-badge ct2__acct-badge--${f.account.is_virtual ? 'demo' : 'real'} ct2__acct-badge--sm`}>
                                                            {f.account.is_virtual ? localize('Demo') : localize('Real')}
                                                        </span>
                                                    </span>
                                                )}
                                                {f.status === 'pending' && (
                                                    <span className='ct2__account-row-status'>{localize('Connecting…')}</span>
                                                )}
                                                {f.status === 'error' && (
                                                    <span className='ct2__account-row-status ct2__account-row-status--err'>
                                                        {f.error || localize('Error')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {!ct.is_running && (
                                            <button
                                                className='ct2__remove-btn'
                                                title={localize('Remove')}
                                                onClick={() => ct.removeFollower(f.token)}
                                            >
                                                <IconClose />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default CopyTrading;
