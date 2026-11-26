// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Stands in front of a film that family night or the parental lock does not let through: on the film's page
// (ui/Overlays) and in front of the player (ui/PlayerGate), which does not load the film while this stands.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import Icon from '@stremio/stremio-icons/react';
import { useScaryState, useSession } from '../hooks';
import type { Hold } from '../hooks';
import { askPin } from '../state/session';
import Chip from './Chip';
import Dialog from './Dialog';
import styles from './scary.less';

const HeldDialog = ({ hold }: { hold: Exclude<Hold, 'no'> }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { lock } = useScaryState();
    const { pinRequest } = useSession();
    const hasPin = lock.pin !== null;
    // While the PIN is being asked for, its own dialog is the one in front.
    if (pinRequest !== null) return null;
    const loading = hold === 'loading';
    const back = () => navigate('/');
    return (
        <Dialog label={t('SCARY_LOCKED_BADGE')} onClose={back}>
            <Icon className={styles['gate-icon']} name={'warning'} />
            <p className={styles['gate-text']}>{loading ? '' : hold === 'by-family' ? t(hasPin ? 'SCARY_FAMILY_GATE' : 'SCARY_FAMILY_GATE_NO_PIN') : t('SCARY_LOCK_GATE')}</p>
            <div className={styles['chips-line']} style={{ display: 'flex', gap: '0.6rem' }}>
                {hasPin && !loading ? <Chip label={t('SCARY_PIN_LABEL')} chosen={true} onClick={() => askPin('verify')} /> : null}
                {!hasPin && !loading ? <Chip label={t('SCARY_SETTINGS_TITLE')} chosen={true} href={'#/settings/scary'} /> : null}
                <Chip label={t('SCARY_BACK')} onClick={back} />
            </div>
        </Dialog>
    );
};

export default HeldDialog;
