// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Stands in front of the player when what is about to play comes from YouTube (a trailer): nothing of YouTube's is
// loaded until the viewer has allowed it. Everything else plays straight through.

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { useCore } from 'stremio/core';
import { useScaryState } from '../hooks';
import { answerConsent, store } from '../state/store';
import Chip from './Chip';
import styles from './scary.less';

type Props = {
    children: React.ReactNode,
};

type Source = 'checking' | 'from-youtube' | 'elsewhere';

const PlayerGate = ({ children }: Props) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const core = useCore();
    const { stream } = useParams();
    const { consent } = useScaryState();
    const [source, setSource] = useState<Source>('checking');

    useEffect(() => {
        let cancelled = false;
        setSource('checking');
        if (typeof stream !== 'string') {
            setSource('elsewhere');
            return;
        }
        core.transport.decodeStream(stream).then(
            (decoded) => !cancelled && setSource(typeof decoded?.ytId === 'string' ? 'from-youtube' : 'elsewhere'),
            // A stream that cannot be read is the player's to report.
            () => !cancelled && setSource('elsewhere'),
        );
        return () => {
            cancelled = true;
        };
    }, [stream, core.transport]);

    if (consent.media === true || source === 'elsewhere') return <React.Fragment>{children}</React.Fragment>;
    if (source === 'checking') return null;
    return (
        <div className={styles['gate']} role={'dialog'} aria-modal={'true'} aria-label={t('SCARY_CONSENT_TRAILERS')}>
            <p className={styles['gate-text']}>{t('SCARY_CONSENT_GATE')}</p>
            <div className={styles['chips-line']} style={{ display: 'flex', gap: '0.6rem' }}>
                <Chip label={t('SCARY_CONSENT_PLAY')} chosen={true} onClick={() => store.update(answerConsent(true))} />
                <Chip label={t('SCARY_BACK')} onClick={() => navigate(-1)} />
            </div>
        </div>
    );
};

export default PlayerGate;
