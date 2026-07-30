import { action, makeObservable, observable, runInAction } from 'mobx';
import { CopyAccount, CopyTradeLog, CopyTradingService } from '@/services/copy-trading.service';

export type FollowerEntry = {
    token: string;
    account: CopyAccount | null;
    status: 'pending' | 'connected' | 'error';
    error: string;
};

export default class CopyTradingStore {
    // ── leader ──────────────────────────────────────────────────────────────
    leader_token = '';
    leader_account: CopyAccount | null = null;
    leader_status: 'idle' | 'connecting' | 'connected' | 'error' = 'idle';
    leader_error = '';

    // ── followers ────────────────────────────────────────────────────────────
    followers: FollowerEntry[] = [];
    new_follower_token = '';

    // ── run state ────────────────────────────────────────────────────────────
    is_running = false;
    stake_multiplier = 1;

    // ── trade log ────────────────────────────────────────────────────────────
    trade_log: CopyTradeLog[] = [];

    // ── service errors (shown in UI) ──────────────────────────────────────────
    error_messages: string[] = [];

    // ── internal ─────────────────────────────────────────────────────────────
    private service: CopyTradingService | null = null;

    constructor() {
        makeObservable(this, {
            leader_token: observable,
            leader_account: observable,
            leader_status: observable,
            leader_error: observable,
            followers: observable,
            new_follower_token: observable,
            is_running: observable,
            stake_multiplier: observable,
            trade_log: observable,
            error_messages: observable,

            setLeaderToken: action,
            connectLeader: action,
            disconnectLeader: action,
            setNewFollowerToken: action,
            addFollower: action,
            removeFollower: action,
            startCopying: action,
            stopCopying: action,
            setStakeMultiplier: action,
            clearLog: action,
            dismissError: action,
        });
    }

    // ── actions ───────────────────────────────────────────────────────────────

    setLeaderToken = (token: string) => {
        this.leader_token = token.trim();
    };

    connectLeader = async () => {
        if (!this.leader_token) return;
        this.leader_status = 'connecting';
        this.leader_error = '';
        this.leader_account = null;
        try {
            this.ensureService();
            const account = await this.service!.connectLeader(
                this.leader_token,
                action((_loginid: string) => {
                    this.leader_status = 'error';
                    this.leader_error = 'Leader connection lost — stop copying and reconnect.';
                    if (this.is_running) {
                        this.service?.stopCopying();
                        this.is_running = false;
                    }
                })
            );
            runInAction(() => {
                this.leader_account = account;
                this.leader_status = 'connected';
            });
        } catch (e: any) {
            runInAction(() => {
                this.leader_status = 'error';
                this.leader_error = e?.message ?? 'Connection failed';
            });
        }
    };

    /**
     * Auto-detect and use the app's current authorized API session as leader.
     * This will only attach if the current session is available (e.g. via
     * `api_base`), and will set the leader_account accordingly.
     */
    connectLeaderFromApi = async (api_instance: any, account_info: any) => {
        this.leader_status = 'connecting';
        this.leader_error = '';
        this.leader_account = null;
        try {
            this.ensureService();
            const account = await this.service!.connectLeaderFromApi(api_instance, account_info, action((_loginid: string) => {
                this.leader_status = 'error';
                this.leader_error = 'Leader connection lost — stop copying and reconnect.';
                if (this.is_running) {
                    this.service?.stopCopying();
                    this.is_running = false;
                }
            }));
            runInAction(() => {
                this.leader_account = account;
                this.leader_status = 'connected';
                // store leader_token as marker (not a real API token)
                this.leader_token = account.loginid || '';
            });
        } catch (e: any) {
            runInAction(() => {
                this.leader_status = 'error';
                this.leader_error = e?.message ?? 'Connection failed';
            });
        }
    };

    /**
     * Disconnect the leader and reset back to idle so a new token can be entered.
     */
    disconnectLeader = () => {
        if (this.is_running) {
            this.service?.stopCopying();
            this.is_running = false;
        }
        this.service?.disconnectLeader();
        this.leader_account = null;
        this.leader_status = 'idle';
        this.leader_error = '';
        this.leader_token = '';
    };

    setNewFollowerToken = (token: string) => {
        this.new_follower_token = token.trim();
    };

    addFollower = async () => {
        const token = this.new_follower_token;
        if (!token) return;
        if (this.followers.find(f => f.token === token)) return;
        // Prevent adding the app's own token (avoid self-replication)
        try {
            const active_loginid = localStorage.getItem('active_loginid') || '';
            const accounts_map = JSON.parse(localStorage.getItem('accountsList') || '{}');
            const local_token = accounts_map[active_loginid] || '';
            if (local_token && token === local_token) {
                const entry: FollowerEntry = {
                    token,
                    account: null,
                    status: 'error',
                    error: 'Cannot add your own token as a follower',
                };
                this.followers.push(entry);
                this.new_follower_token = '';
                return;
            }
            if (this.leader_token && token === this.leader_token) {
                const entry: FollowerEntry = {
                    token,
                    account: null,
                    status: 'error',
                    error: 'Follower token cannot match leader token',
                };
                this.followers.push(entry);
                this.new_follower_token = '';
                return;
            }
        } catch (e) {
            // parsing error — continue
        }

        const entry: FollowerEntry = {
            token,
            account: null,
            status: 'pending',
            error: '',
        };
        this.followers.push(entry);
        this.new_follower_token = '';

        try {
            this.ensureService();
            const account = await this.service!.addFollower(
                token,
                action((loginid: string) => {
                    const idx = this.followers.findIndex(f => f.account?.loginid === loginid);
                    if (idx >= 0) {
                        this.followers[idx].status = 'error';
                        this.followers[idx].error = 'Connection lost — reconnect this follower.';
                    }
                })
            );
            runInAction(() => {
                const idx = this.followers.findIndex(f => f.token === token);
                if (idx >= 0) {
                    this.followers[idx].account = account;
                    this.followers[idx].status = 'connected';
                }
            });
        } catch (e: any) {
            runInAction(() => {
                const idx = this.followers.findIndex(f => f.token === token);
                if (idx >= 0) {
                    this.followers[idx].status = 'error';
                    this.followers[idx].error = e?.message ?? 'Connection failed';
                }
            });
        }
    };

    removeFollower = (token: string) => {
        this.service?.removeFollower(token);
        this.followers = this.followers.filter(f => f.token !== token);
    };

    startCopying = () => {
        if (this.is_running) return;
        if (this.leader_status !== 'connected') return;
        if (this.followers.filter(f => f.status === 'connected').length === 0) return;

        if (this.service) {
            this.service.stakeMultiplier = this.stake_multiplier;
        }

        try {
            this.service!.startCopying();
            this.is_running = true;
        } catch (e: any) {
            this.leader_error = e?.message ?? 'Failed to start';
        }
    };

    stopCopying = () => {
        this.service?.stopCopying();
        this.is_running = false;
    };

    setStakeMultiplier = (val: number) => {
        this.stake_multiplier = val;
        if (this.service) this.service.stakeMultiplier = val;
    };

    clearLog = () => {
        this.trade_log = [];
    };

    dismissError = (idx: number) => {
        this.error_messages.splice(idx, 1);
    };

    // ── private ───────────────────────────────────────────────────────────────

    private ensureService() {
        if (!this.service) {
            this.service = new CopyTradingService(
                action((log: CopyTradeLog) => {
                    this.trade_log.unshift(log);
                }),
                action((msg: string) => {
                    console.error('[CopyTrading]', msg);
                    this.error_messages.unshift(msg);
                    // Auto-dismiss after 8 s
                    setTimeout(
                        action(() => {
                            const i = this.error_messages.indexOf(msg);
                            if (i >= 0) this.error_messages.splice(i, 1);
                        }),
                        8000
                    );
                })
            );
        }
    }

    destroy() {
        this.service?.destroy();
        this.service = null;
        this.is_running = false;
    }
}
