// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// "Ask SCARY" (docs/AI_PLAN.md), the page #/scary/ask: say what you feel like watching, or describe a film you are
// trying to find, and an AI service answers with films of SCARY's own library. Nothing is sent before the viewer has
// agreed to the service by name. Films that family night or the parental lock hold back are neither sent nor shown.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { readPicks, readTitles } from '../ai/answer';
import type { Pick } from '../ai/answer';
import { ask } from '../ai/client';
import { candidatesFor, cleanRequest, findMessages, tonightMessages } from '../ai/prompt';
import { failureText, useAi } from '../ai/useAi';
import { detailsHref, posterOf, titleOf } from '../content/items';
import type { Film } from '../domain/film';
import { useFeedLanguage, useScaryRules, useScaryState } from '../hooks';
import Chip from './Chip';
import FearMeter from './FearMeter';
import styles from './scary.less';

type Mode = 'tonight' | 'find';
type Status = { kind: 'idle' } | { kind: 'agree' } | { kind: 'asking' } | { kind: 'done', picks: Pick[] } | { kind: 'error', text: string };

const AskPage = () => {
    const { t } = useTranslation();
    const language = useFeedLanguage();
    const location = useLocation();
    const ai = useAi();
    const { loved } = useScaryState();
    const rules = useScaryRules();
    const described = useMemo(() => new URLSearchParams(location.search).get('find') ?? '', [location.search]);
    const [mode, setMode] = useState<Mode>(described.length > 0 ? 'find' : 'tonight');
    const [text, setText] = useState(cleanRequest(described));
    const [status, setStatus] = useState<Status>({ kind: 'idle' });
    const running = useRef<AbortController | null>(null);
    useEffect(() => () => running.current?.abort(), []);

    /** What this viewer may see: what is held back is never sent to the service, so it cannot come back from it. */
    const films: Film[] = useMemo(() => rules.library.films.filter((film) => !rules.isUnwanted(film) && !rules.isLocked(film)), [rules]);

    const send = useCallback(async () => {
        const request = cleanRequest(text);
        if (request.length < 2 || rules.library.status !== 'ready') return;
        if (ai.missing !== 'nothing') {
            setStatus({ kind: 'error', text: t('SCARY_AI_ERROR_UNSET') });
            return;
        }
        running.current?.abort();
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        running.current = controller;
        setStatus({ kind: 'asking' });
        const candidates = mode === 'tonight' ? candidatesFor(films, request) : [];
        const taste = ai.taste ? loved.map((id) => rules.library.byId.get(id)).filter((film): film is Film => film !== undefined) : [];
        const reply = await ask(ai.settings, mode === 'tonight' ? tonightMessages(request, candidates, language, taste) : findMessages(request), { signal: controller?.signal });
        if (controller?.signal.aborted) return;
        if (!reply.ok) {
            setStatus({ kind: 'error', text: failureText(t, reply.why, reply.retryAfter) });
            return;
        }
        const picks = mode === 'tonight' ? readPicks(reply.text, candidates) : readTitles(reply.text, films);
        setStatus(picks === null ? { kind: 'error', text: t('SCARY_AI_ERROR_FAILED') } : { kind: 'done', picks });
    }, [text, mode, ai, films, loved, rules, language, t]);

    const submit = useCallback((event?: React.FormEvent) => {
        event?.preventDefault();
        if (cleanRequest(text).length < 2) return;
        // Nothing leaves the browser before the viewer has agreed to this service, by name.
        if (ai.missing === 'nothing' && !ai.agreed) setStatus({ kind: 'agree' });
        else send();
    }, [text, ai.missing, ai.agreed, send]);

    const agree = useCallback(() => {
        ai.agree();
        send();
    }, [ai, send]);

    const asking = status.kind === 'asking';
    return (
        <React.Fragment>
            <h1 className={styles['page-title']}>{t('SCARY_AI_TITLE')}</h1>
            <form className={styles['ask']} onSubmit={submit}>
                <div className={styles['chips-line']} role={'group'} aria-label={t('SCARY_AI_TITLE')}>
                    <Chip label={t('SCARY_AI_TONIGHT')} chosen={mode === 'tonight'} onClick={() => setMode('tonight')} />
                    <Chip label={t('SCARY_AI_FIND')} chosen={mode === 'find'} onClick={() => setMode('find')} />
                </div>
                <label className={styles['pin-label']} htmlFor={'scary-ask'}>{t('SCARY_AI_REQUEST_LABEL')}</label>
                <textarea
                    id={'scary-ask'}
                    className={styles['ask-input']}
                    // What is typed reads in its own direction; while the box is empty, the hint reads as the screen does.
                    dir={text.length > 0 ? 'auto' : undefined}
                    rows={3}
                    maxLength={300}
                    value={text}
                    placeholder={t(mode === 'tonight' ? 'SCARY_AI_TONIGHT_HINT' : 'SCARY_AI_FIND_HINT')}
                    aria-describedby={'scary-ask-note'}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) submit(event);
                    }}
                />
                <p id={'scary-ask-note'} className={styles['section-note']}>{t('SCARY_AI_NOTE')}</p>
                <div className={styles['chips-line']}>
                    <button type={'submit'} hidden={true} tabIndex={-1} aria-hidden={'true'} />
                    <Chip label={asking ? t('SCARY_AI_ASKING', { a: ai.name }) : t('SCARY_AI_SEND')} chosen={true} onClick={() => !asking && submit()} />
                    <Chip label={t('SCARY_SETTINGS_TITLE')} quiet={true} href={'#/settings/scary'} />
                </div>
            </form>
            {
                status.kind === 'agree' ?
                    <div className={styles['ask-agree']} role={'group'} aria-label={t('SCARY_AI_PROVIDER')}>
                        <p className={styles['section-note']}>{t('SCARY_AI_AGREE_TEXT', { a: ai.name, b: ai.host })}</p>
                        <div className={styles['chips-line']}>
                            <Chip label={t('SCARY_AI_AGREE')} onClick={agree} />
                            <Chip label={t('SCARY_AI_DECLINE')} onClick={() => setStatus({ kind: 'idle' })} />
                        </div>
                    </div>
                    :
                    null
            }
            <div className={styles['ask-status']} role={'status'} aria-live={'polite'}>
                {asking ? t('SCARY_AI_ASKING', { a: ai.name }) : status.kind === 'error' ? status.text : status.kind === 'done' && status.picks.length === 0 ? t('SCARY_AI_EMPTY') : ''}
            </div>
            {
                status.kind === 'done' && status.picks.length > 0 ?
                    <ol className={styles['bucket']}>
                        {status.picks.map(({ film, why }) => (
                            <li key={film.id} className={styles['bucket-film']}>
                                <img src={posterOf(film.id)} alt={''} loading={'lazy'} />
                                <div className={styles['ask-pick']}>
                                    <a className={styles['bucket-name']} href={detailsHref(film)}>{titleOf(film, language)} <span className={styles['ask-year']}>({film.y})</span></a>
                                    {why.length > 0 ? <p className={styles['ask-why']} dir={'auto'}>{why}</p> : null}
                                </div>
                                {typeof film.f === 'number' ? <FearMeter level={film.f} /> : null}
                            </li>
                        ))}
                    </ol>
                    :
                    null
            }
        </React.Fragment>
    );
};

export default AskPage;
