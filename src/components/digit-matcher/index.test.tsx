import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import DigitMatcher from './index';
import { api_base } from '@/external/bot-skeleton';
import { useStore } from '@/hooks/useStore';

jest.mock('@/external/bot-skeleton', () => ({
    api_base: {
        api: null,
    },
}));

jest.mock('@/hooks/useStore', () => ({
    useStore: jest.fn(),
}));

describe('DigitMatcher', () => {
    beforeEach(() => {
        (useStore as jest.Mock).mockReturnValue({
            client: {},
            transactions: {
                onBotContractEvent: jest.fn(),
            },
            run_panel: {
                run_id: '',
                setIsRunning: jest.fn(),
                setContractStage: jest.fn(),
                toggleDrawer: jest.fn(),
                onStopBotClick: jest.fn(),
            },
            summary_card: {
                clear: jest.fn(),
            },
            ui: {
                setPromptHandler: jest.fn(),
                setAccountSwitcherDisabledMessage: jest.fn(),
            },
        });

        (api_base as any).api = {
            send: jest.fn().mockResolvedValue({}),
        };
    });

    it('renders without throwing when the API object is missing message subscription support', () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => render(<DigitMatcher />)).not.toThrow();

        errorSpy.mockRestore();
    });

    it('starts with no selected entry digits and blocks the engine until one is chosen', () => {
        const { getByText } = render(<DigitMatcher />);

        expect(getByText('Selected digits')).toBeInTheDocument();
        expect(screen.getAllByText('None').length).toBeGreaterThan(0);

        fireEvent.click(screen.getByRole('button', { name: /start engine/i }));

        expect((useStore as jest.Mock).mock.results[0].value.run_panel.setIsRunning).toHaveBeenCalled();
    });

    it('starts scanning only after the engine is started', () => {
        const subscribe = jest.fn(() => ({ unsubscribe: jest.fn() }));
        (api_base as any).api = {
            send: jest.fn().mockResolvedValue({}),
            onMessage: jest.fn(() => ({ subscribe })),
        };

        render(<DigitMatcher />);

        expect(subscribe).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /start engine/i }));

        expect(subscribe).toHaveBeenCalledTimes(2);
    });
});
