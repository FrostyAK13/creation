import React from 'react';
import { render } from '@testing-library/react';

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
});
