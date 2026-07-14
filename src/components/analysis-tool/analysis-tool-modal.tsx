import React from 'react';
import { observer } from 'mobx-react-lite';
import IframeWidgetModal from '@/components/iframe-widget/iframe-widget-modal';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';

const AnalysisToolModal = observer(() => {
    const { dashboard } = useStore();
    const { is_analysis_tool_modal_visible, setAnalysisToolModalVisibility } = dashboard;

    return (
        <IframeWidgetModal
            is_visible={is_analysis_tool_modal_visible}
            onClose={setAnalysisToolModalVisibility}
            header={localize('Analysis Tool')}
            src='https://frostytraders.vercel.app/'
            title='Analysis Tool'
        />
    );
});

export default AnalysisToolModal;
