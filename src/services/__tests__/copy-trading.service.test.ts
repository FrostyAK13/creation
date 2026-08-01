import { shouldTreatConnectionAsDisconnected } from '../copy-trading.service';

describe('copy-trading service connection health', () => {
    it('does not mark the connection as disconnected while the browser is offline', () => {
        const ws = { readyState: WebSocket.CLOSED } as WebSocket;

        expect(shouldTreatConnectionAsDisconnected(ws, false)).toBe(false);
    });

    it('marks a closed socket as disconnected when the browser is online', () => {
        const ws = { readyState: WebSocket.CLOSED } as WebSocket;

        expect(shouldTreatConnectionAsDisconnected(ws, true)).toBe(true);
    });

    it('keeps a connecting socket from being marked disconnected', () => {
        const ws = { readyState: WebSocket.CONNECTING } as WebSocket;

        expect(shouldTreatConnectionAsDisconnected(ws, true)).toBe(false);
    });
});
