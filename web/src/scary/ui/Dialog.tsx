// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import React, { useEffect } from 'react';
import FocusLock from 'react-focus-lock';
import styles from './scary.less';

type DialogProps = {
    label: string,
    children: React.ReactNode,
    onClose: () => void,
};

/** A window over the app: keeps the keyboard inside it, closes on Escape, and is announced as a dialog. */
const Dialog = ({ label, children, onClose }: DialogProps) => {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose]);
    return (
        <FocusLock returnFocus={true}>
            <div className={styles['gate']} role={'dialog'} aria-modal={'true'} aria-label={label}>
                {children}
            </div>
        </FocusLock>
    );
};

export default Dialog;
