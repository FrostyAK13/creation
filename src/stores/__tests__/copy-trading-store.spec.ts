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

    it('returns null when the current account is not a demo account', () => {
        expect(
            resolveAutoFollowerToken({
                currentLoginid: 'CR12345',
                isVirtualAccount: false,
                storedDirectToken: 'real-token',
                storedAccountType: 'real',
            })
        ).toBeNull();
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
