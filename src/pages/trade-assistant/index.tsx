import React, { useMemo, useState } from 'react';
import { Localize, localize } from '@deriv-com/translations';
import './trade-assistant.scss';

const formatCurrency = (value: number) =>
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TradeAssistant = () => {
    const [balance, setBalance] = useState(250);
    const [riskPct, setRiskPct] = useState(2);
    const [rounds, setRounds] = useState(4);
    const [martingale, setMartingale] = useState(2);

    const riskAmount = useMemo(() => Math.max((balance * riskPct) / 100, 0.1), [balance, riskPct]);
    const suggestedStake = useMemo(() => Math.max(0.05, Math.round(riskAmount * 100) / 100), [riskAmount]);
    const progression = useMemo(() => {
        const values: number[] = [];
        let stake = suggestedStake;
        for (let i = 0; i < rounds; i += 1) {
            values.push(Math.round(stake * 100) / 100);
            stake = Math.round(stake * martingale * 100) / 100;
        }
        return values;
    }, [suggestedStake, rounds, martingale]);

    const totalExposure = useMemo(
        () => Math.round(progression.reduce((sum, stake) => sum + stake, 0) * 100) / 100,
        [progression]
    );

    return (
        <div className='trade-assistant'>
            <div className='trade-assistant__hero'>
                <div>
                    <h1><Localize i18n_default_text='Trade Assistant' /></h1>
                    <p>
                        <Localize i18n_default_text='A compact risk planner for your Over/Under strategy. Quickly size stakes, plan rounds, and keep your account protected.' />
                    </p>
                </div>
                <div className='trade-assistant__badge'>
                    <span>Smart Risk</span>
                </div>
            </div>

            <div className='trade-assistant__grid'>
                <section className='trade-assistant__card'>
                    <h2><Localize i18n_default_text='Account Size' /></h2>
                    <label className='trade-assistant__field'>
                        <span><Localize i18n_default_text='Balance' /></span>
                        <input
                            type='number'
                            min='1'
                            step='1'
                            value={balance}
                            onChange={e => setBalance(Number(e.target.value) || 0)}
                        />
                    </label>
                    <label className='trade-assistant__field'>
                        <span><Localize i18n_default_text='Risk per trade (%)' /></span>
                        <input
                            type='number'
                            min='0.1'
                            max='10'
                            step='0.1'
                            value={riskPct}
                            onChange={e => setRiskPct(Number(e.target.value) || 0)}
                        />
                    </label>
                </section>

                <section className='trade-assistant__card trade-assistant__card--accent'>
                    <h2><Localize i18n_default_text='Suggested Position' /></h2>
                    <div className='trade-assistant__value'>{formatCurrency(suggestedStake)}</div>
                    <div className='trade-assistant__meta'>
                        <span><Localize i18n_default_text='Risk amount' />: {formatCurrency(riskAmount)}</span>
                        <span><Localize i18n_default_text='Exposure (all rounds)' />: {formatCurrency(totalExposure)}</span>
                    </div>
                </section>

                <section className='trade-assistant__card trade-assistant__rounds'>
                    <h2><Localize i18n_default_text='Round Plan' /></h2>
                    <label className='trade-assistant__field'>
                        <span><Localize i18n_default_text='Martingale multiplier' /></span>
                        <input
                            type='number'
                            min='1.1'
                            max='4'
                            step='0.1'
                            value={martingale}
                            onChange={e => setMartingale(Number(e.target.value) || 1)}
                        />
                    </label>
                    <label className='trade-assistant__field'>
                        <span><Localize i18n_default_text='Rounds to show' /></span>
                        <input
                            type='number'
                            min='1'
                            max='8'
                            step='1'
                            value={rounds}
                            onChange={e => setRounds(Number(e.target.value) || 1)}
                        />
                    </label>
                    <div className='trade-assistant__table'>
                        <div className='trade-assistant__table-row trade-assistant__table-row--header'>
                            <span><Localize i18n_default_text='Round' /></span>
                            <span><Localize i18n_default_text='Stake' /></span>
                        </div>
                        {progression.map((stake, index) => (
                            <div key={index} className='trade-assistant__table-row'>
                                <span>{index + 1}</span>
                                <span>{formatCurrency(stake)}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className='trade-assistant__note'>
                <p><Localize i18n_default_text='Use this tool to keep your stakes consistent and your risk manageable. Adjust balance, risk, and multiplier to suit your own trading plan.' /></p>
            </div>
        </div>
    );
};

export default TradeAssistant;
