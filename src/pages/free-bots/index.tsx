import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { load } from '@/external/bot-skeleton';
import { save_types } from '@/external/bot-skeleton/constants/save-type';
import { useStore } from '@/hooks/useStore';
import { DBOT_TABS } from '@/constants/bot-contents';
import { LabelPairedCircleStarCaptionBoldIcon } from '@deriv/quill-icons/LabelPaired';
import { Localize } from '@deriv-com/translations';
import './free-bots.scss';

type BotCategory = 'Advanced Bots' | 'Premium' | 'Even Odd' | 'Normal' | 'Automated' | 'Differs';

const BOT_CATEGORIES: BotCategory[] = ['Advanced Bots', 'Premium', 'Even Odd', 'Normal', 'Automated', 'Differs'];

const CATEGORY_CONFIG: Record<BotCategory, {
    badge: string;
    tagLabel: string;
    tagColor: string;
    tagBg: string;
    cardClass: string;
}> = {
    'Advanced Bots': {
        badge: '⚡',
        tagLabel: 'Advanced',
        tagColor: '#a855f7',
        tagBg: 'rgb(168 85 247 / 12%)',
        cardClass: 'free-bots__card--advanced',
    },
    'Premium': {
        badge: '👑',
        tagLabel: 'Premium',
        tagColor: '#f7a800',
        tagBg: 'rgb(247 168 0 / 12%)',
        cardClass: 'free-bots__card--premium',
    },
    'Even Odd': {
        badge: '⚖️',
        tagLabel: 'Even / Odd',
        tagColor: '#06b6d4',
        tagBg: 'rgb(6 182 212 / 12%)',
        cardClass: 'free-bots__card--evenodd',
    },
    'Normal': {
        badge: '📊',
        tagLabel: 'Standard',
        tagColor: '#3b82f6',
        tagBg: 'rgb(59 130 246 / 12%)',
        cardClass: 'free-bots__card--normal',
    },
    'Automated': {
        badge: '🤖',
        tagLabel: 'Auto-Run',
        tagColor: '#f97316',
        tagBg: 'rgb(249 115 22 / 12%)',
        cardClass: 'free-bots__card--automated',
    },
    'Differs': {
        badge: '🎯',
        tagLabel: 'Differs',
        tagColor: '#ef4444',
        tagBg: 'rgb(239 68 68 / 12%)',
        cardClass: 'free-bots__card--differs',
    },
};

const FREE_BOTS = [
    {
        id: 'frosty_tech_space',
        xml_file: 'frosty_tech_space',
        name: 'Frosty Tech Space',
        description: 'An advanced multi-condition digit strategy with martingale recovery, configurable take-profit, stop-loss, and waiting-time controls.',
        category: 'Advanced Bots' as BotCategory,
        difficulty: 'Advanced',
    },
    {
        id: 'frosty_digit_alter',
        xml_file: 'frosty_digit_alter',
        name: 'Frosty Digit Alter',
        description: 'A dual over-digit strategy that alternates between two configurable over-digit targets, with martingale recovery and take-profit/stop-loss controls.',
        category: 'Advanced Bots' as BotCategory,
        difficulty: 'Advanced',
    },
    {
        id: 'frosty_tech_space_v2',
        xml_file: 'frosty_tech_space_v2',
        name: 'Frosty Tech Space V2',
        description: 'An upgraded Tech Space strategy with refined tick-based entry logic, configurable stake, take-profit, and stop-loss for improved performance.',
        category: 'Advanced Bots' as BotCategory,
        difficulty: 'Advanced',
    },
    {
        id: 'dominator_v2',
        xml_file: 'dominator_v2',
        name: 'Dominator V2',
        description: 'A digit over/under strategy with recovery-digit martingale, take-profit and stop-loss controls.',
        category: 'Premium' as BotCategory,
        difficulty: 'Advanced',
    },
    {
        id: 'frosty_money_maker',
        xml_file: 'frosty_money_maker',
        name: 'Frosty Money Maker (Under)',
        description: 'A digit-under martingale strategy tuned for consistent recovery with configurable profit and loss targets.',
        category: 'Premium' as BotCategory,
        difficulty: 'Advanced',
    },
    {
        id: 'frosty_money_maker_v2',
        xml_file: 'frosty_money_maker_v2',
        name: 'Frosty Money Maker V2 (Over)',
        description: 'A digit-over martingale strategy variant with recovery logic and configurable profit and loss targets.',
        category: 'Premium' as BotCategory,
        difficulty: 'Advanced',
    },
    {
        id: 'frosty_even_odd_engine',
        xml_file: 'frosty_even_odd_engine',
        name: 'Frosty Even/Odd Engine',
        description: 'Trades even/odd digit outcomes with martingale recovery, configurable take-profit and stop-loss targets.',
        category: 'Even Odd' as BotCategory,
        difficulty: 'Advanced',
    },
    {
        id: 'frosty_speed_bot',
        xml_file: 'frosty_speed_bot',
        name: 'Frosty Speed Bot',
        description: 'Fast even/odd digit trading with a "Daily Profit" management system for automatic trade repetition and profit tracking.',
        category: 'Normal' as BotCategory,
        difficulty: 'Intermediate',
    },
    {
        id: 'frosty_dominator',
        xml_file: 'frosty_dominator',
        name: 'Frosty Dominator',
        description: 'A digit over/under strategy with entry-point targeting, recovery-digit martingale, and take-profit/stop-loss controls.',
        category: 'Normal' as BotCategory,
        difficulty: 'Advanced',
    },
    {
        id: 'frosty_version',
        xml_file: 'frosty_version',
        name: 'Frosty Version',
        description: 'A digit over/under prediction strategy with martingale recovery and configurable profit and loss targets.',
        category: 'Normal' as BotCategory,
        difficulty: 'Intermediate',
    },
    {
        id: 'frosty_version_v2',
        xml_file: 'frosty_version_v2',
        name: 'Frosty Version V2',
        description: 'An updated digit over/under strategy variant with martingale recovery and configurable profit and loss targets.',
        category: 'Normal' as BotCategory,
        difficulty: 'Intermediate',
    },
    {
        id: 'frosty_entry_loop',
        xml_file: 'frosty_entry_loop',
        name: 'Frosty Entry Loop',
        description: 'Waits for digit 4 as the entry point before trading over/under on Volatility 100 (1s), with martingale recovery and configurable take-profit and stop-loss.',
        category: 'Automated' as BotCategory,
        difficulty: 'Advanced',
    },
    {
        id: 'frosty_over_2_v1',
        xml_file: 'frosty_over_2_v1',
        name: 'Frosty Over 2 V1',
        description: 'A digit-over-2 prediction strategy with martingale recovery and configurable profit and loss targets, fully automated.',
        category: 'Automated' as BotCategory,
        difficulty: 'Intermediate',
    },
    {
        id: 'frosty_under_7_v1',
        xml_file: 'frosty_under_7_v1',
        name: 'Frosty Under 7 V1',
        description: 'A digit-under-7 prediction strategy with martingale recovery and configurable profit and loss targets, fully automated.',
        category: 'Automated' as BotCategory,
        difficulty: 'Intermediate',
    },
    {
        id: 'frosty_digit_eliminator',
        xml_file: 'frosty_digit_eliminator',
        name: 'Frosty Digit Eliminator',
        description: 'A Matches/Differs strategy that prompts for a digit to avoid, with martingale recovery and configurable profit and loss targets.',
        category: 'Differs' as BotCategory,
        difficulty: 'Advanced',
    },
];

const DIFFICULTY_COLORS: Record<string, string> = {
    Beginner: '#10b981',
    Intermediate: '#f59e0b',
    Advanced: '#ef4444',
};

const FreeBots = observer(() => {
    const { dashboard } = useStore();
    const { setActiveTab } = dashboard;
    const [importing, setImporting] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<BotCategory>('Advanced Bots');

    const handleImport = async (bot: (typeof FREE_BOTS)[number]) => {
        setImporting(bot.id);
        try {
            const xml_module = await import(`../../xml/${bot.xml_file}.xml`);
            const block_string = xml_module.default;
            const workspace = (window as any).Blockly?.derivWorkspace;

            setActiveTab(DBOT_TABS.BOT_BUILDER);

            if (workspace) {
                await load({
                    block_string,
                    workspace,
                    file_name: bot.name,
                    from: save_types.LOCAL,
                    show_snackbar: true,
                    drop_event: undefined,
                    strategy_id: undefined,
                    showIncompatibleStrategyDialog: undefined,
                });
            } else {
                setTimeout(async () => {
                    const ws = (window as any).Blockly?.derivWorkspace;
                    if (ws) {
                        await load({
                            block_string,
                            workspace: ws,
                            file_name: bot.name,
                            from: save_types.LOCAL,
                            show_snackbar: true,
                            drop_event: undefined,
                            strategy_id: undefined,
                            showIncompatibleStrategyDialog: undefined,
                        });
                    }
                }, 800);
            }
        } catch (err) {
            console.error('Failed to import bot:', err);
        } finally {
            setImporting(null);
        }
    };

    const bots_in_category = FREE_BOTS.filter(bot => bot.category === activeCategory);
    const activeCfg = CATEGORY_CONFIG[activeCategory];

    return (
        <div className='free-bots'>
            <div className='free-bots__category-tabs'>
                {BOT_CATEGORIES.map(category => {
                    const cfg = CATEGORY_CONFIG[category];
                    return (
                        <button
                            key={category}
                            className={`free-bots__category-tab${activeCategory === category ? ' free-bots__category-tab--active' : ''}`}
                            onClick={() => setActiveCategory(category)}
                        >
                            <span className='free-bots__category-tab-badge'>{cfg.badge}</span>
                            {category}
                        </button>
                    );
                })}
            </div>
            {bots_in_category.length > 0 ? (
                <div className='free-bots__grid'>
                    {bots_in_category.map(bot => {
                        const is_loading = importing === bot.id;
                        const cfg = CATEGORY_CONFIG[bot.category];
                        return (
                            <div key={bot.id} className={`free-bots__card ${cfg.cardClass}`}>
                                <div className='free-bots__card-icon-row'>
                                    <div className='free-bots__card-icon'>
                                        <LabelPairedCircleStarCaptionBoldIcon height='32px' width='32px' fill='#f7c53b' />
                                    </div>
                                    <span
                                        className='free-bots__card-special-tag'
                                        style={{ color: cfg.tagColor, background: cfg.tagBg, borderColor: cfg.tagColor + '40' }}
                                    >
                                        <span>{cfg.badge}</span>
                                        {cfg.tagLabel}
                                    </span>
                                </div>
                                <div className='free-bots__card-body'>
                                    <div className='free-bots__card-top'>
                                        <span className='free-bots__card-category'>{bot.category}</span>
                                        <span
                                            className='free-bots__card-difficulty'
                                            style={{ color: DIFFICULTY_COLORS[bot.difficulty] }}
                                        >
                                            {bot.difficulty}
                                        </span>
                                    </div>
                                    <h3 className='free-bots__card-name'>{bot.name}</h3>
                                    <p className='free-bots__card-description'>{bot.description}</p>
                                </div>
                                <button
                                    className={`free-bots__card-btn${is_loading ? ' free-bots__card-btn--loading' : ''}`}
                                    onClick={() => handleImport(bot)}
                                    disabled={is_loading}
                                >
                                    {is_loading ? (
                                        <Localize i18n_default_text='Importing…' />
                                    ) : (
                                        <Localize i18n_default_text='LOAD BOT' />
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className='free-bots__empty'>
                    <Localize i18n_default_text='No bots in this category yet. Check back soon!' />
                </div>
            )}
        </div>
    );
});

export default FreeBots;
