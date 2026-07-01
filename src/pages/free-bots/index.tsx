import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { load } from '@/external/bot-skeleton';
import { save_types } from '@/external/bot-skeleton/constants/save-type';
import { useStore } from '@/hooks/useStore';
import { DBOT_TABS } from '@/constants/bot-contents';
import { LabelPairedCircleStarCaptionBoldIcon } from '@deriv/quill-icons/LabelPaired';
import { Localize } from '@deriv-com/translations';
import './free-bots.scss';

const FREE_BOTS = [
    {
        id: 'martingale',
        xml_file: 'martingale',
        name: 'Martingale',
        description: 'Doubles the stake after each loss to recover previous losses with a single win.',
        category: 'Strategy',
        difficulty: 'Intermediate',
    },
    {
        id: 'dalembert',
        xml_file: 'dalembert',
        name: "D'Alembert",
        description: 'Increases stake by one unit after a loss and decreases by one unit after a win.',
        category: 'Strategy',
        difficulty: 'Beginner',
    },
    {
        id: 'oscars_grind',
        xml_file: 'oscars_grind',
        name: "Oscar's Grind",
        description: 'A conservative positive progression system aimed at grinding out small profits.',
        category: 'Strategy',
        difficulty: 'Beginner',
    },
    {
        id: 'reverse_martingale',
        xml_file: 'reverse_martingale',
        name: 'Reverse Martingale',
        description: 'Doubles the stake after each win, capitalising on winning streaks while limiting losses.',
        category: 'Strategy',
        difficulty: 'Intermediate',
    },
    {
        id: 'reverse_dalembert',
        xml_file: 'reverse_dalembert',
        name: "Reverse D'Alembert",
        description: 'Increases stake by one unit after a win and decreases by one after a loss.',
        category: 'Strategy',
        difficulty: 'Beginner',
    },
    {
        id: '1_3_2_6',
        xml_file: '1_3_2_6',
        name: '1-3-2-6',
        description: 'A structured stake-progression system following the 1-3-2-6 sequence across consecutive wins.',
        category: 'Strategy',
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

    return (
        <div className='free-bots'>
            <div className='free-bots__header'>
                <h2 className='free-bots__title'>
                    <Localize i18n_default_text='Free Bots' />
                </h2>
                <p className='free-bots__subtitle'>
                    <Localize i18n_default_text='Click "Import to Builder" to load any strategy directly into your Bot Builder workspace.' />
                </p>
            </div>
            <div className='free-bots__grid'>
                {FREE_BOTS.map(bot => {
                    const is_loading = importing === bot.id;
                    return (
                        <div key={bot.id} className='free-bots__card'>
                            <div className='free-bots__card-icon'>
                                <LabelPairedCircleStarCaptionBoldIcon height='32px' width='32px' fill='#f7c53b' />
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
                                    <Localize i18n_default_text='Import to Builder' />
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default FreeBots;
