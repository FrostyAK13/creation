import React from 'react';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import {
    LabelPairedCircleStarMdRegularIcon,
    LabelPairedCloneMdRegularIcon,
    LabelPairedGraduationCapMdRegularIcon,
    LabelPairedPercentMdRegularIcon,
    LabelPairedUsersMdRegularIcon,
} from '@deriv/quill-icons/LabelPaired';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

type TFeature = {
    id: string;
    icon: React.ReactElement;
    title: React.ReactElement;
    tab: number;
};

const FeatureShowcase = observer(() => {
    const { dashboard } = useStore();
    const { setActiveTab } = dashboard;
    const { isDesktop } = useDevice();

    // Left column (3), right column (3), then the last one sits in the square slot.
    const features: TFeature[] = [
        {
            id: 'd-circles',
            icon: <LabelPairedCircleStarMdRegularIcon />,
            title: <Localize i18n_default_text='D-Circles' />,
            tab: DBOT_TABS.D_CIRCLES,
        },
        {
            id: 'free-bots',
            icon: <LabelPairedCloneMdRegularIcon />,
            title: <Localize i18n_default_text='Free Bots' />,
            tab: DBOT_TABS.FREE_BOTS,
        },
        {
            id: 'calculator',
            icon: <LabelPairedPercentMdRegularIcon />,
            title: <Localize i18n_default_text='Calculator' />,
            tab: DBOT_TABS.ANALYSIS,
        },
        {
            id: 'tutorials',
            icon: <LabelPairedGraduationCapMdRegularIcon />,
            title: <Localize i18n_default_text='Tutorials' />,
            tab: DBOT_TABS.TUTORIAL,
        },
        {
            id: 'copy-trading',
            icon: <LabelPairedUsersMdRegularIcon />,
            title: <Localize i18n_default_text='Copy Trading' />,
            tab: DBOT_TABS.COPY_TRADING,
        },
    ];

    const left = features.slice(0, 3);
    const right = features.slice(3);

    const renderCard = (feature: TFeature, index: number) => (
        <button
            key={feature.id}
            type='button'
            style={{ '--card-index': index } as React.CSSProperties}
            className='feature-showcase__card'
            onClick={() => setActiveTab(feature.tab)}
            data-testid={`dt_feature_showcase_${feature.id}`}
        >
            <span className='feature-showcase__card-glow' aria-hidden='true' />
            <span className='feature-showcase__card-icon'>{feature.icon}</span>
            <Text as='p' size='xxxs' weight='bold' className='feature-showcase__card-title'>
                {feature.title}
            </Text>
        </button>
    );

    if (!isDesktop) {
        return (
            <div className='feature-showcase feature-showcase--mobile'>
                {features.map((feature, index) => renderCard(feature, index))}
            </div>
        );
    }

    return (
        <React.Fragment>
            <div className='feature-showcase__col feature-showcase__col--left'>
                {left.map((feature, index) => renderCard(feature, index))}
            </div>
            <div className='feature-showcase__col feature-showcase__col--right'>
                {right.map((feature, index) => renderCard(feature, index + 3))}
            </div>
        </React.Fragment>
    );
});

export default FeatureShowcase;
