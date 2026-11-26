// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Search by voice, in the search bar. It uses the browser's own speech service, which in most browsers sends what is
// said to the browser's maker, so the viewer is asked first (once; the answer is in the settings). Where the browser
// has no such service (Firefox, the Android app's WebView) the button is not shown.

import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import Icon from '@stremio/stremio-icons/react';
import { Button } from 'stremio/components';
import { useScaryState } from '../hooks';
import { store } from '../state/store';
import Chip from './Chip';
import Dialog from './Dialog';
import styles from './scary.less';

type Recognition = {
    lang: string,
    interimResults: boolean,
    maxAlternatives: number,
    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null,
    onerror: (() => void) | null,
    onend: (() => void) | null,
    start: () => void,
    abort: () => void,
};

type Props = {
    className?: string,
    iconClassName?: string,
};

const MAX_SPOKEN = 60;

const recognitionClass = (): (new () => Recognition) | null => {
    const scope = window as unknown as { SpeechRecognition?: new () => Recognition, webkitSpeechRecognition?: new () => Recognition };
    return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
};

const VoiceButton = ({ className, iconClassName }: Props) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { consent } = useScaryState();
    const [asking, setAsking] = useState(false);
    const [listening, setListening] = useState(false);
    const recognition = useRef<Recognition | null>(null);

    const listen = useCallback(() => {
        const RecognitionClass = recognitionClass();
        if (RecognitionClass === null) return;
        const session = new RecognitionClass();
        session.lang = i18n.language;
        session.interimResults = false;
        session.maxAlternatives = 1;
        session.onresult = (event) => {
            const spoken = String(event.results?.[0]?.[0]?.transcript ?? '').trim().slice(0, MAX_SPOKEN);
            if (spoken.length > 0) navigate(`/search?search=${encodeURIComponent(spoken)}`);
        };
        session.onerror = () => setListening(false);
        session.onend = () => setListening(false);
        recognition.current = session;
        setListening(true);
        try {
            session.start();
        } catch {
            setListening(false);
        }
    }, [i18n.language, navigate]);

    const onClick = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        if (listening) {
            recognition.current?.abort();
        } else if (consent.voice) {
            listen();
        } else {
            setAsking(true);
        }
    }, [listening, consent.voice, listen]);

    const allow = useCallback(() => {
        store.update((state) => ({ consent: { ...state.consent, voice: true } }));
        setAsking(false);
        listen();
    }, [listen]);

    if (recognitionClass() === null) return null;
    return (
        <React.Fragment>
            <Button className={className} title={listening ? t('SCARY_VOICE_LISTENING') : t('SCARY_VOICE_SEARCH')} aria-pressed={listening} onClick={onClick}>
                <Icon className={iconClassName} name={'mic'} />
            </Button>
            {
                asking ?
                    <Dialog label={t('SCARY_VOICE_SEARCH')} onClose={() => setAsking(false)}>
                        <p className={styles['gate-text']}>{t('SCARY_VOICE_TEXT')}</p>
                        <div className={styles['chips-line']} style={{ display: 'flex', gap: '0.6rem' }}>
                            <Chip label={t('SCARY_CONSENT_ALLOW')} onClick={allow} />
                            <Chip label={t('SCARY_PIN_CANCEL')} onClick={() => setAsking(false)} />
                        </div>
                    </Dialog>
                    :
                    null
            }
        </React.Fragment>
    );
};

export default VoiceButton;
