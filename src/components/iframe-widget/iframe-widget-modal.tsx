import React from 'react';
import DraggableResizeWrapper from '@/components/draggable/draggable-resize-wrapper';

type IframeWidgetModalProps = {
    is_visible: boolean;
    onClose: () => void;
    header: string;
    src: string;
    title: string;
    modalWidth?: number;
    modalHeight?: number;
    minWidth?: number;
    minHeight?: number;
};

const IframeWidgetModal: React.FC<IframeWidgetModalProps> = ({
    is_visible,
    onClose,
    header,
    src,
    title,
    modalWidth = 420,
    modalHeight = 560,
    minWidth = 320,
    minHeight = 400,
}) => {
    return (
        <React.Fragment>
            {is_visible && (
                <DraggableResizeWrapper
                    boundary='.main'
                    header={header}
                    onClose={onClose}
                    modalWidth={modalWidth}
                    modalHeight={modalHeight}
                    minWidth={minWidth}
                    minHeight={minHeight}
                    enableResizing
                >
                    <div style={{ height: 'calc(100% - 6rem)', padding: '0.5rem' }}>
                        <iframe
                            src={src}
                            title={title}
                            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '0.4rem' }}
                        />
                    </div>
                </DraggableResizeWrapper>
            )}
        </React.Fragment>
    );
};

export default IframeWidgetModal;
