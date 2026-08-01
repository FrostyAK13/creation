import { resolveAutoFollowerToken, resolvePairedAccountInfo } from '../copy-trading-store';

describe('resolveAutoFollowerToken', () => {
    it('returns the stored direct token for a demo leader when the saved account is real', () => {
        expect(
            resolveAutoFollowerToken({
                currentLoginid: 'VRTC12345',
                isVirtualAccount: true,
                storedDirectToken: 'real-token',
                storedAccountType: 'real',
            })
        ).toBe('real-token');
    });

    it('returns the stored direct token for a real account when the current account is demo', () => {
        expect(
            resolveAutoFollowerToken({
                currentLoginid: 'CR12345',
                isVirtualAccount: false,
                storedDirectToken: 'demo-token',
                storedAccountType: 'demo',
            })
        ).toBe('demo-token');
    });

    it('returns null when no direct token is stored', () => {
        expect(
            resolveAutoFollowerToken({
                currentLoginid: 'VRTC12345',
                isVirtualAccount: true,
                storedDirectToken: '',
                storedAccountType: 'real',
            })
        ).toBeNull();
    });

    it('returns the paired real account info for a demo current account', () => {
        const account = resolvePairedAccountInfo({
            currentLoginid: 'VRTC12345',
            isVirtualAccount: true,
            accounts: [
                { account_id: 'VRTC12345', balance: '100', currency: 'USD', group: '', status: 'active', account_type: 'demo' },
                { account_id: 'CR12345', balance: '250', currency: 'USD', group: '', status: 'active', account_type: 'real' },
            ],
        });

        expect(account?.loginid).toBe('CR12345');
        expect(account?.balance).toBe(250);
        expect(account?.is_virtual).toBe(false);
    });
});
