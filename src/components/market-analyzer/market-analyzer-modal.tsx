import React from 'react';
import { observer } from 'mobx-react-lite';
import IframeWidgetModal from '@/components/iframe-widget/iframe-widget-modal';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';

const MarketAnalyzerModal = observer(() => {
    const { dashboard } = useStore();
    const { is_market_analyzer_modal_visible, setMarketAnalyzerModalVisibility } = dashboard;

    return (
        <IframeWidgetModal
            is_visible={is_market_analyzer_modal_visible}
            onClose={setMarketAnalyzerModalVisibility}
            header={localize('Market Analyzer')}
            src='https://bot-analysis-tool-belex.web.app'
            title='Market Analyzer'
        />
    );
});

export default MarketAnalyzerModal;
