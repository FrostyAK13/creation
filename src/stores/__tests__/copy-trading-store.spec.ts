import { resolveAutoFollowerToken } from '../copy-trading-store';

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
});
