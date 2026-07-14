import React from 'react';
import { observer } from 'mobx-react-lite';
import IframeWidgetModal from '@/components/iframe-widget/iframe-widget-modal';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';

const DCirclesModal = observer(() => {
    const { dashboard } = useStore();
    const { is_d_circles_modal_visible, setDCirclesModalVisibility } = dashboard;

    return (
        <IframeWidgetModal
            is_visible={is_d_circles_modal_visible}
            onClose={setDCirclesModalVisibility}
            header={localize('D-Circles')}
            src='https://frostydcircles.vercel.app/'
            title='D-Circles'
        />
    );
});

export default DCirclesModal;
