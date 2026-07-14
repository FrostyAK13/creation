import React from 'react';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import {
    LabelPairedBarsMdRegularIcon,
    LabelPairedChartCandlestickMdRegularIcon,
    LabelPairedChartLineMdRegularIcon,
    LabelPairedChartTradingviewMdRegularIcon,
    LabelPairedCircleStarMdRegularIcon,
    LabelPairedCloneMdRegularIcon,
    LabelPairedGraduationCapMdRegularIcon,
    LabelPairedPercentMdRegularIcon,
    LabelPairedPuzzlePieceTwoMdRegularIcon,
    LabelPairedUsersMdRegularIcon,
} from '@deriv/quill-icons/LabelPaired';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

type TFeature = {
    id: string;
    icon: React.ReactElement;
    title: React.ReactElement;
    description: React.ReactElement;
    tab: number;
    accent: 'gold' | 'blue' | 'purple' | 'green';
};

const FeatureShowcase = observer(() => {
    const { dashboard } = useStore();
    const { setActiveTab } = dashboard;
    const { isDesktop } = useDevice();

    const features: TFeature[] = [
        {
            id: 'bot-builder',
            icon: <LabelPairedPuzzlePieceTwoMdRegularIcon />,
            title: <Localize i18n_default_text='Bot Builder' />,
            description: <Localize i18n_default_text='Drag, drop, and automate — build a strategy block by block.' />,
            tab: DBOT_TABS.BOT_BUILDER,
            accent: 'gold',
        },
        {
            id: 'free-bots',
            icon: <LabelPairedCloneMdRegularIcon />,
            title: <Localize i18n_default_text='Free Bots' />,
            description: <Localize i18n_default_text='Ready-made strategies you can load and run in one click.' />,
            tab: DBOT_TABS.FREE_BOTS,
            accent: 'green',
        },
        {
            id: 'd-circles',
            icon: <LabelPairedCircleStarMdRegularIcon />,
            title: <Localize i18n_default_text='D-Circles' />,
            description: <Localize i18n_default_text='Join the community circle and follow top signals live.' />,
            tab: DBOT_TABS.D_CIRCLES,
            accent: 'purple',
        },
        {
            id: 'analysis-tool',
            icon: <LabelPairedBarsMdRegularIcon />,
            title: <Localize i18n_default_text='Analysis Tool' />,
            description: <Localize i18n_default_text='Digit stats and win/loss tracking to sharpen your edge.' />,
            tab: DBOT_TABS.ANALYSIS_TOOL,
            accent: 'blue',
        },
        {
            id: 'market-analyzer',
            icon: <LabelPairedChartCandlestickMdRegularIcon />,
            title: <Localize i18n_default_text='Market Analyzer' />,
            description: <Localize i18n_default_text='Scan volatility indices for patterns before you trade.' />,
            tab: DBOT_TABS.MARKET_ANALYZER,
            accent: 'gold',
        },
        {
            id: 'charts',
            icon: <LabelPairedChartLineMdRegularIcon />,
            title: <Localize i18n_default_text='Charts' />,
            description: <Localize i18n_default_text='Live SmartCharts, right alongside your workspace.' />,
            tab: DBOT_TABS.CHART,
            accent: 'blue',
        },
        {
            id: 'trading-view',
            icon: <LabelPairedChartTradingviewMdRegularIcon />,
            title: <Localize i18n_default_text='Trading View' />,
            description: <Localize i18n_default_text='Pro-grade charting powered by TradingView.' />,
            tab: DBOT_TABS.TRADING_VIEW,
            accent: 'purple',
        },
        {
            id: 'copy-trading',
            icon: <LabelPairedUsersMdRegularIcon />,
            title: <Localize i18n_default_text='Copy Trading' />,
            description: <Localize i18n_default_text='Mirror a leader account&apos;s trades across followers instantly.' />,
            tab: DBOT_TABS.COPY_TRADING,
            accent: 'green',
        },
        {
            id: 'calculator',
            icon: <LabelPairedPercentMdRegularIcon />,
            title: <Localize i18n_default_text='Calculator' />,
            description: <Localize i18n_default_text='Stake, payout, and risk math worked out for you.' />,
            tab: DBOT_TABS.ANALYSIS,
            accent: 'gold',
        },
        {
            id: 'tutorials',
            icon: <LabelPairedGraduationCapMdRegularIcon />,
            title: <Localize i18n_default_text='Tutorials' />,
            description: <Localize i18n_default_text='Guided walkthroughs to get from zero to running bot.' />,
            tab: DBOT_TABS.TUTORIAL,
            accent: 'blue',
        },
    ];

    return (
        <div className='feature-showcase'>
            <div className='feature-showcase__header'>
                <Text as='h3' size={isDesktop ? 'sm' : 's'} weight='bold' className='feature-showcase__title'>
                    <Localize i18n_default_text='Explore what you can do' />
                </Text>
                <Text as='p' size={isDesktop ? 'xs' : 'xxs'} className='feature-showcase__subtitle'>
                    <Localize i18n_default_text="Everything FrostyDBot can do — pick a card to jump right in." />
                </Text>
            </div>
            <div className='feature-showcase__grid'>
                {features.map(feature => (
                    <button
                        key={feature.id}
                        type='button'
                        className={`feature-showcase__card feature-showcase__card--${feature.accent}`}
                        onClick={() => setActiveTab(feature.tab)}
                        data-testid={`dt_feature_showcase_${feature.id}`}
                    >
                        <span className='feature-showcase__card-glow' aria-hidden='true' />
                        <span className='feature-showcase__card-icon'>{feature.icon}</span>
                        <Text as='p' size='xs' weight='bold' className='feature-showcase__card-title'>
                            {feature.title}
                        </Text>
                        <Text as='p' size='xxxs' className='feature-showcase__card-description'>
                            {feature.description}
                        </Text>
                        <span className='feature-showcase__card-spark' aria-hidden='true'>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <span key={i} className='feature-showcase__card-spark-bar' />
                            ))}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
});

export default FeatureShowcase;
