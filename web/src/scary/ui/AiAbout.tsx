// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// "About this film, without spoilers" on a film's page (docs/AI_PLAN.md): a few paragraphs an AI service writes from
// the film's name, year, kinds and synopsis. Asked for by the viewer, never by itself, and only after they agreed to
// the service by name. What comes back is shown as plain text, and said to be an AI's.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readAbout } from '../ai/answer';
import { ask } from '../ai/client';
import { aboutMessages } from '../ai/prompt';
import type { About } from '../ai/prompt';
import { failureText, useAi } from '../ai/useAi';
import { useFeedLanguage } from '../hooks';
import Chip from './Chip';
import styles from './scary.less';

type Status = { kind: 'idle' } | { kind: 'agree' } | { kind: 'asking' } | { kind: 'done', text: string, by: string } | { kind: 'error', text: string };

/** What was written about each film while the page is open: asking twice costs the viewer's patience, or money. */
const written = new Map<string, { text: string, by: string }>();

const AiAbout = ({ id, about }: { id: string, about: About }) => {
    const { t } = useTranslation();
    const language = useFeedLanguage();
    const ai = useAi();
    const key = `${id}:${language}`;
    const [status, setStatus] = useState<Status>(() => {
        const known = written.get(key);
        return known !== undefined ? { kind: 'done', ...known } : { kind: 'idle' };
    });
    const running = useRef<AbortController | null>(null);
    useEffect(() => () => running.current?.abort(), []);
    useEffect(() => {
        const known = written.get(key);
        setStatus(known !== undefined ? { kind: 'done', ...known } : { kind: 'idle' });
    }, [key]);

    const send = useCallback(async () => {
        if (ai.missing !== 'nothing') {
            setStatus({ kind: 'error', text: t('SCARY_AI_ERROR_UNSET') });
            return;
        }
        running.current?.abort();
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        running.current = controller;
        setStatus({ kind: 'asking' });
        const reply = await ask(ai.settings, aboutMessages(about, language), { signal: controller?.signal });
        if (controller?.signal.aborted) return;
        const text = reply.ok ? readAbout(reply.text) : '';
        if (!reply.ok || text.length === 0) {
            setStatus({ kind: 'error', text: reply.ok ? t('SCARY_AI_ERROR_FAILED') : failureText(t, reply.why, reply.retryAfter) });
            return;
        }
        written.set(key, { text, by: ai.name });
        setStatus({ kind: 'done', text, by: ai.name });
    }, [ai, about, language, key, t]);

    const open = useCallback(() => {
        if (status.kind === 'asking') return;
        if (ai.missing === 'nothing' && !ai.agreed) setStatus({ kind: 'agree' });
        else send();
    }, [status.kind, ai.missing, ai.agreed, send]);

    return (
        <div className={styles['about-ai']}>
            {status.kind !== 'done' ? <Chip label={status.kind === 'asking' ? t('SCARY_AI_ASKING', { a: ai.name }) : t('SCARY_AI_ABOUT')} quiet={true} onClick={open} /> : null}
            {
                status.kind === 'agree' ?
                    <div className={styles['ask-agree']} role={'group'} aria-label={t('SCARY_AI_PROVIDER')}>
                        <p className={styles['section-note']}>{t('SCARY_AI_ABOUT_SENT', { a: ai.name, b: ai.host })}</p>
                        <div className={styles['chips-line']}>
                            <Chip
                                label={t('SCARY_AI_AGREE')}
                                onClick={() => {
                                    ai.agree();
                                    send();
                                }}
                            />
                            <Chip label={t('SCARY_AI_DECLINE')} onClick={() => setStatus({ kind: 'idle' })} />
                        </div>
                    </div>
                    :
                    null
            }
            <div role={'status'} aria-live={'polite'}>
                {status.kind === 'error' ? <p className={styles['section-note']}>{status.text}</p> : null}
                {
                    status.kind === 'done' ?
                        <div className={styles['about-ai-text']}>
                            {status.text.split('\n').map((paragraph, index) => <p key={index} dir={'auto'}>{paragraph}</p>)}
                            <p className={styles['about-ai-by']}>{t('SCARY_AI_ABOUT_BY', { a: status.by })}</p>
                        </div>
                        :
                        null
                }
            </div>
        </div>
    );
};

export default AiAbout;
