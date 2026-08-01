import { getAutoDetectedCopyTradingLeader } from '../marketing-balance';

describe('getAutoDetectedCopyTradingLeader', () => {
    it('returns the current demo loginid when the active account is already a demo account', () => {
        expect(getAutoDetectedCopyTradingLeader('DOT93169225', true)).toBe('DOT93169225');
    });

    it('maps a marketing real account to its paired demo account', () => {
        expect(getAutoDetectedCopyTradingLeader('ROT91867724', false)).toBe('DOT93169225');
    });

    it('keeps a standard real account as its own leader when no pairing is configured', () => {
        expect(getAutoDetectedCopyTradingLeader('CR12345', false)).toBe('CR12345');
    });

    it('returns null for an empty loginid', () => {
        expect(getAutoDetectedCopyTradingLeader('', false)).toBeNull();
    });
});
