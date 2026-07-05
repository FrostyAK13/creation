import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import {
    LabelPairedArrowRotateLeftMdRegularIcon,
    LabelPairedArrowRotateRightMdRegularIcon,
    LabelPairedArrowsRotateMdRegularIcon,
    LabelPairedChartLineMdRegularIcon,
    LabelPairedChartTradingviewMdRegularIcon,
    LabelPairedFloppyDiskMdRegularIcon,
    LabelPairedFolderOpenMdRegularIcon,
    LabelPairedMagnifyingGlassMinusMdRegularIcon,
    LabelPairedMagnifyingGlassPlusMdRegularIcon,
    LabelPairedObjectsAlignLeftMdRegularIcon,
} from '@deriv/quill-icons/LabelPaired';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
/* [AI] - Analytics event tracking removed - see migrate-docs/MONITORING_PACKAGES.md for re-implementation guide */
/* [/AI] */
import ToolbarIcon from './toolbar-icon';

// Save-gate: only the owner can save bots.
// Token stored as char-codes to avoid a plain-text match in the bundle.
const _sv = [75, 65, 69, 76].map(c => String.fromCharCode(c)).join(''); // "KAEL"

const WorkspaceGroup = observer(() => {
    const { dashboard, toolbar, load_modal, save_modal } = useStore();
    const { setPreviewOnPopup, setChartModalVisibility, setTradingViewModalVisibility } = dashboard;
    const { has_redo_stack, has_undo_stack, onResetClick, onSortClick, onUndoClick, onZoomInOutClick } = toolbar;
    const { toggleSaveModal } = save_modal;
    const { toggleLoadModal } = load_modal;
    const { isDesktop } = useDevice();

    // ── Save-gate state ──────────────────────────────────────────────────────
    const [showGate, setShowGate] = React.useState(false);
    const [pwValue, setPwValue]   = React.useState('');
    const [pwError, setPwError]   = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    const openGate = () => {
        setPwValue('');
        setPwError('');
        setShowGate(true);
        setTimeout(() => inputRef.current?.focus(), 80);
    };

    const closeGate = () => {
        setShowGate(false);
        setPwValue('');
        setPwError('');
    };

    const submitGate = () => {
        if (pwValue === _sv) {
            closeGate();
            toggleSaveModal();
        } else {
            setPwError('Incorrect password. Access denied.');
            setPwValue('');
            setTimeout(() => inputRef.current?.focus(), 40);
        }
    };

    return (
        <React.Fragment>
        <div className='toolbar__wrapper'>
            <div className='toolbar__group toolbar__group-btn' data-testid='dt_toolbar_group_btn'>
                <ToolbarIcon
                    popover_message={localize('Reset')}
                    icon={
                        <span
                            id='db-toolbar__reset-button'
                            className='toolbar__icon'
                            onClick={onResetClick}
                            data-testid='dt_toolbar_reset_button'
                        >
                            <LabelPairedArrowsRotateMdRegularIcon />
                        </span>
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Import')}
                    icon={
                        <span
                            className='toolbar__icon'
                            id='db-toolbar__import-button'
                            data-testid='dt_toolbar_import_button'
                            onClick={() => {
                                setPreviewOnPopup(true);
                                toggleLoadModal();
                                /* [AI] - Analytics event tracking removed - see migrate-docs/MONITORING_PACKAGES.md for re-implementation guide */
                                /* [/AI] */
                            }}
                        >
                            <LabelPairedFolderOpenMdRegularIcon />
                        </span>
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Save')}
                    icon={
                        <span
                            className='toolbar__icon'
                            id='db-toolbar__save-button'
                            data-testid='dt_toolbar_save_button'
                            onClick={openGate}
                        >
                            <LabelPairedFloppyDiskMdRegularIcon />
                        </span>
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Sort blocks')}
                    icon={
                        <span
                            className='toolbar__icon'
                            id='db-toolbar__sort-button'
                            data-testid='dt_toolbar_sort_button'
                            onClick={onSortClick}
                        >
                            <LabelPairedObjectsAlignLeftMdRegularIcon />
                        </span>
                    }
                />
                {isDesktop && (
                    <>
                        <div className='vertical-divider' />
                        <ToolbarIcon
                            popover_message={localize('Charts')}
                            icon={
                                <span
                                    className='toolbar__icon'
                                    id='db-toolbar__charts-button'
                                    onClick={() => setChartModalVisibility()}
                                >
                                    <LabelPairedChartLineMdRegularIcon />
                                </span>
                            }
                        />
                        <ToolbarIcon
                            popover_message={localize('TradingView Chart')}
                            icon={
                                <span
                                    className='toolbar__icon'
                                    id='db-toolbar__tradingview-button'
                                    onClick={() => setTradingViewModalVisibility()}
                                >
                                    <LabelPairedChartTradingviewMdRegularIcon />
                                </span>
                            }
                        />
                    </>
                )}
                <div className='vertical-divider' />
                <ToolbarIcon
                    popover_message={localize('Undo')}
                    icon={
                        <span
                            className={classNames('toolbar__icon undo', {
                                'toolbar__icon--disabled': !has_undo_stack,
                            })}
                            id='db-toolbar__undo-button'
                            data-testid='dt_toolbar_undo_button'
                            onClick={() => onUndoClick(/* redo */ false)}
                        >
                            <LabelPairedArrowRotateLeftMdRegularIcon />
                        </span>
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Redo')}
                    icon={
                        <span
                            className={classNames('toolbar__icon redo', {
                                'toolbar__icon--disabled': !has_redo_stack,
                            })}
                            id='db-toolbar__redo-button'
                            data-testid='dt_toolbar_redo_button'
                            onClick={() => onUndoClick(/* redo */ true)}
                        >
                            <LabelPairedArrowRotateRightMdRegularIcon />
                        </span>
                    }
                />
                <div className='vertical-divider' />
                <ToolbarIcon
                    popover_message={localize('Zoom in')}
                    icon={
                        <span
                            className='toolbar__icon'
                            id='db-toolbar__zoom-in-button'
                            data-testid='dt_toolbar_zoom_in_button'
                            onClick={() => onZoomInOutClick(/* in */ true)}
                        >
                            <LabelPairedMagnifyingGlassPlusMdRegularIcon />
                        </span>
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Zoom out')}
                    icon={
                        <span
                            className='toolbar__icon'
                            id='db-toolbar__zoom-out'
                            data-testid='dt_toolbar_zoom_out_button'
                            onClick={() => onZoomInOutClick(/* in */ false)}
                        >
                            <LabelPairedMagnifyingGlassMinusMdRegularIcon />
                        </span>
                    }
                />
            </div>
        </div>

        {/* ── Save password gate ─────────────────────────────────────────── */}
        {showGate && (
            /* Backdrop — click outside to dismiss */
            <div
                role='presentation'
                style={{
                    position: 'fixed', inset: 0, zIndex: 99999,
                    background: 'rgba(0,0,0,0.72)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onClick={e => { if (e.target === e.currentTarget) closeGate(); }}
                onKeyDown={e => { if (e.key === 'Escape') closeGate(); }}
            >
                {/* Dialog panel */}
                <div
                    role='dialog'
                    aria-modal='true'
                    aria-labelledby='save-gate-title'
                    aria-describedby='save-gate-desc'
                    style={{
                        background: 'var(--general-main-2, #1a1a2e)',
                        border: '1.5px solid rgba(247,197,59,0.35)',
                        borderRadius: '1.2rem',
                        padding: '3.2rem 3.6rem 2.8rem',
                        width: '36rem',
                        maxWidth: '90vw',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 24px rgba(247,197,59,0.1)',
                        display: 'flex', flexDirection: 'column', gap: '2rem',
                    }}
                >
                    {/* header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#f7c53b' strokeWidth='2' aria-hidden='true'>
                                <rect x='3' y='11' width='18' height='11' rx='2' />
                                <path d='M7 11V7a5 5 0 0 1 10 0v4' />
                            </svg>
                            <span id='save-gate-title' style={{ color: '#f7c53b', fontWeight: 700, fontSize: '1.6rem', letterSpacing: '0.02em' }}>
                                Save Bot
                            </span>
                        </div>
                        <button
                            aria-label='Close dialog'
                            onClick={closeGate}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-less-prominent, #6e7491)', fontSize: '2rem', lineHeight: 1,
                                padding: '0.2rem',
                            }}
                        >×</button>
                    </div>

                    {/* body */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <label
                            id='save-gate-desc'
                            htmlFor='save-gate-input'
                            style={{ color: 'var(--text-general, #c2c4d6)', fontSize: '1.3rem', fontWeight: 500 }}
                        >
                            Enter password to save
                        </label>
                        <input
                            id='save-gate-input'
                            ref={inputRef}
                            type='password'
                            value={pwValue}
                            aria-invalid={!!pwError}
                            aria-errormessage='save-gate-error'
                            onChange={e => { setPwValue(e.target.value); setPwError(''); }}
                            onKeyDown={e => { if (e.key === 'Enter') submitGate(); if (e.key === 'Escape') closeGate(); }}
                            placeholder='Password'
                            style={{
                                background: 'var(--general-main-1, #111)',
                                border: `1.5px solid ${pwError ? '#f4425f' : 'rgba(247,197,59,0.3)'}`,
                                borderRadius: '0.6rem',
                                color: 'var(--text-prominent, #fff)',
                                fontSize: '1.4rem',
                                padding: '1rem 1.2rem',
                                outline: 'none',
                                width: '100%',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s',
                            }}
                        />
                        {/* aria-live so screen-readers announce errors without focus move */}
                        <span
                            id='save-gate-error'
                            role='alert'
                            aria-live='assertive'
                            style={{ color: '#f4425f', fontSize: '1.2rem', minHeight: '1.6rem' }}
                        >
                            {pwError}
                        </span>
                    </div>

                    {/* footer */}
                    <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'flex-end' }}>
                        <button
                            onClick={closeGate}
                            style={{
                                background: 'transparent',
                                border: '1.5px solid rgba(247,197,59,0.25)',
                                borderRadius: '0.6rem',
                                color: 'var(--text-general, #c2c4d6)',
                                cursor: 'pointer',
                                fontSize: '1.3rem',
                                fontWeight: 600,
                                padding: '0.8rem 2rem',
                                transition: 'border-color 0.2s',
                            }}
                        >Cancel</button>
                        <button
                            onClick={submitGate}
                            style={{
                                background: 'linear-gradient(135deg, #b8860b 0%, #f7c53b 100%)',
                                border: 'none',
                                borderRadius: '0.6rem',
                                color: '#111',
                                cursor: 'pointer',
                                fontSize: '1.3rem',
                                fontWeight: 700,
                                padding: '0.8rem 2.4rem',
                                transition: 'opacity 0.2s',
                            }}
                        >Unlock</button>
                    </div>
                </div>
            </div>
        )}
        </React.Fragment>
    );
});

export default WorkspaceGroup;
