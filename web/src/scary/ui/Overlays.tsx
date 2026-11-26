// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// What SCARY lays over the whole app, whichever screen is open: fog and film grain, the shiver before a film, the
// gate of family night and the parental lock, the PIN dialog, the bucket list's "next film?", the screensaver, the
// ambient sound and the sleep timer. Mounted once, in src/App/App.js.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FocusLock from 'react-focus-lock';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { useToast } from 'stremio/common';
import Icon from '@stremio/stremio-icons/react';
import { backgroundOf, detailsHref, titleOf } from '../content/items';
import { isRated, minutesOf } from '../domain/film';
import { nextInBucket } from '../domain/lists';
import { NO_LOCKOUT, afterWrongPin, remainingWait } from '../domain/lock';
import { filmIdOfPath, isPlayerPath } from '../domain/paths';
import { isValidPin, verifyPin } from '../domain/pin';
import { useFeedLanguage, useScaryRules, useScaryState, useSession } from '../hooks';
import { askPin, isUnlocked, setSleepTimer, unlock } from '../state/session';
import { store } from '../state/store';
import Chip from './Chip';
import styles from './scary.less';

const SHIVER_MS = 2_200;
const IDLE_MS = 5 * 60_000;
const SLIDE_MS = 12_000;
const SAME_WATCH_MS = 6 * 3_600_000;

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

/** Asks for the PIN, for whoever called askPin(). Checks an existing PIN itself, with the wait after wrong tries. */
const PinDialog = () => {
    const { t } = useTranslation();
    const { pinRequest } = useSession();
    const { lock, lockout } = useScaryState();
    const [value, setValue] = useState('');
    const [first, setFirst] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        setValue('');
        setFirst(null);
        setError('');
        setChecking(false);
    }, [pinRequest]);

    const cancel = useCallback(() => pinRequest?.resolve(null), [pinRequest]);

    const submit = useCallback(async (event?: React.FormEvent) => {
        event?.preventDefault();
        if (pinRequest === null || checking) return;
        if (!isValidPin(value)) {
            setError(t('SCARY_PIN_ERROR_FORMAT'));
            return;
        }
        if (pinRequest.purpose === 'create') {
            if (first === null) {
                setFirst(value);
                setValue('');
                setError('');
            } else if (first !== value) {
                setFirst(null);
                setValue('');
                setError(t('SCARY_PIN_ERROR_MISMATCH'));
            } else {
                pinRequest.resolve(value);
            }
            return;
        }
        const wait = remainingWait(lockout, Date.now());
        if (wait > 0) {
            setError(t('SCARY_PIN_WAIT', { a: Math.ceil(wait / 1000) }));
            return;
        }
        setChecking(true);
        const correct = await verifyPin(value, lock.pin);
        setChecking(false);
        if (correct) {
            store.update(() => ({ lockout: NO_LOCKOUT }));
            unlock();
            pinRequest.resolve(value);
        } else {
            store.update((state) => ({ lockout: afterWrongPin(state.lockout, Date.now()) }));
            setValue('');
            setError(t('SCARY_PIN_ERROR_WRONG'));
        }
    }, [pinRequest, checking, value, first, lockout, lock.pin, t]);

    if (pinRequest === null) return null;
    const title = pinRequest.purpose === 'verify' ? t('SCARY_PIN_TITLE_VERIFY') : first === null ? t('SCARY_PIN_TITLE_CREATE') : t('SCARY_PIN_TITLE_CONFIRM');
    return (
        <Dialog label={title} onClose={cancel}>
            <form className={styles['pin']} onSubmit={submit}>
                <label className={styles['pin-label']} htmlFor={'scary-pin'}>{title}</label>
                <input
                    id={'scary-pin'}
                    className={styles['pin-input']}
                    type={'password'}
                    inputMode={'numeric'}
                    autoComplete={'off'}
                    maxLength={8}
                    autoFocus={true}
                    value={value}
                    aria-describedby={'scary-pin-error'}
                    aria-invalid={error.length > 0}
                    onChange={(event) => setValue(event.target.value.replace(/\D/g, ''))}
                />
                <div id={'scary-pin-error'} className={styles['pin-error']} role={'alert'}>{checking ? t('SCARY_PIN_CHECKING') : error}</div>
                <div className={styles['chips-line']} style={{ justifyContent: 'center', display: 'flex', gap: '0.6rem' }}>
                    <Chip label={t('SCARY_PIN_OK')} chosen={true} onClick={() => submit()} />
                    <Chip label={t('SCARY_PIN_CANCEL')} onClick={cancel} />
                </div>
            </form>
        </Dialog>
    );
};

/** Stands in front of a film that family night or the parental lock does not let through. */
const Gate = ({ filmId }: { filmId: string | null }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { lock } = useScaryState();
    const { pinRequest } = useSession();
    const rules = useScaryRules(filmId !== null);
    const hasPin = lock.pin !== null;
    const guarded = rules.familyNight || (lock.enabled && hasPin);
    if (filmId === null || !guarded || pinRequest !== null) return null;
    const film = rules.library.byId.get(filmId) ?? null;
    const loading = rules.library.status === 'loading';
    const byFamily = rules.familyNight && rules.isHidden(film) && !isUnlocked();
    const byLock = rules.isLocked(film);
    if (!loading && !byFamily && !byLock) return null;
    const back = () => navigate('/');
    return (
        <Dialog label={t('SCARY_LOCKED_BADGE')} onClose={back}>
            <Icon className={styles['gate-icon']} name={'warning'} />
            <p className={styles['gate-text']}>{loading ? '' : byFamily ? t('SCARY_FAMILY_GATE') : t('SCARY_LOCK_GATE')}</p>
            <div className={styles['chips-line']} style={{ display: 'flex', gap: '0.6rem' }}>
                {hasPin && !loading ? <Chip label={t('SCARY_PIN_LABEL')} chosen={true} onClick={() => askPin('verify')} /> : null}
                <Chip label={t('SCARY_BACK')} onClick={back} />
            </div>
        </Dialog>
    );
};

/** The film's title trembles in the dark for a moment as the player opens. */
const Shiver = ({ filmId, playing }: { filmId: string | null, playing: boolean }) => {
    const language = useFeedLanguage();
    const { effects } = useScaryState();
    const rules = useScaryRules(playing && effects.shiver);
    const [shown, setShown] = useState<string | null>(null);
    useEffect(() => {
        if (!playing || !effects.shiver || filmId === null) return;
        setShown(filmId);
        const timer = setTimeout(() => setShown(null), SHIVER_MS);
        return () => clearTimeout(timer);
    }, [playing, filmId, effects.shiver]);
    if (shown === null) return null;
    const film = rules.library.byId.get(shown);
    return (
        <div className={styles['shiver']} aria-hidden={'true'} key={shown}>
            <div className={styles['shiver-title']}>{film ? titleOf(film, language) : 'SCARY'}</div>
        </div>
    );
};

/** After a film of the bucket list: offers the next one. */
const BucketPrompt = ({ filmId, playing }: { filmId: string | null, playing: boolean }) => {
    const { t } = useTranslation();
    const language = useFeedLanguage();
    const navigate = useNavigate();
    const { bucket } = useScaryState();
    const rules = useScaryRules(bucket.length > 0);
    const lastPlayed = useRef<string | null>(null);
    const [finished, setFinished] = useState<string | null>(null);
    useEffect(() => {
        if (playing && filmId !== null) {
            lastPlayed.current = filmId;
        } else if (!playing && lastPlayed.current !== null) {
            if (bucket.includes(lastPlayed.current)) setFinished(lastPlayed.current);
            lastPlayed.current = null;
        }
    }, [playing, filmId, bucket]);
    const close = useCallback(() => setFinished(null), []);
    if (finished === null) return null;
    const done = rules.library.byId.get(finished);
    const nextId = nextInBucket(bucket, finished);
    const next = nextId !== null ? rules.library.byId.get(nextId) : undefined;
    if (done === undefined) return null;
    return (
        <Dialog label={t('SCARY_BUCKET_TITLE')} onClose={close}>
            <p className={styles['gate-text']}>{t('SCARY_BUCKET_PROMPT_FINISHED', { a: titleOf(done, language) })}</p>
            <p className={styles['gate-text']}>
                {next ? t('SCARY_BUCKET_PROMPT_NEXT', { a: titleOf(next, language), b: t('SCARY_MINUTES', { a: minutesOf(next) }) }) : t('SCARY_BUCKET_PROMPT_LAST')}
            </p>
            <div className={styles['chips-line']} style={{ display: 'flex', gap: '0.6rem' }}>
                {
                    next ?
                        <Chip
                            label={t('SCARY_BUCKET_PROMPT_PLAY', { a: titleOf(next, language) })}
                            chosen={true}
                            onClick={() => {
                                close();
                                navigate(detailsHref(next).slice(1));
                            }}
                        />
                        :
                        null
                }
                <Chip label={t('SCARY_BUCKET_PROMPT_LATER')} onClick={close} />
            </div>
        </Dialog>
    );
};

/** Horror backdrops that fade into one another when nobody has touched anything for five minutes. */
const Screensaver = ({ enabled }: { enabled: boolean }) => {
    const language = useFeedLanguage();
    const [idle, setIdle] = useState(false);
    const [slide, setSlide] = useState(0);
    const rules = useScaryRules(idle);
    useEffect(() => {
        if (!enabled) {
            setIdle(false);
            return;
        }
        let timer = setTimeout(() => setIdle(true), IDLE_MS);
        const wake = () => {
            setIdle(false);
            clearTimeout(timer);
            timer = setTimeout(() => setIdle(true), IDLE_MS);
        };
        const events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
        events.forEach((name) => window.addEventListener(name, wake, { passive: true }));
        return () => {
            clearTimeout(timer);
            events.forEach((name) => window.removeEventListener(name, wake));
        };
    }, [enabled]);
    const films = useMemo(() => rules.library.films.filter((film) => isRated(film) && !rules.isHidden(film) && !rules.isLocked(film)).slice(0, 40), [rules]);
    useEffect(() => {
        if (!idle || films.length === 0) return;
        const timer = setInterval(() => setSlide((current) => (current + 1) % films.length), SLIDE_MS);
        return () => clearInterval(timer);
    }, [idle, films.length]);
    if (!idle || films.length === 0) return null;
    const film = films[slide % films.length];
    return (
        <div className={styles['screensaver']} aria-hidden={'true'}>
            <img key={film.id} className={styles['shown']} src={backgroundOf(film.id)} alt={''} />
            <div className={styles['screensaver-title']}>{titleOf(film, language)}</div>
        </div>
    );
};

/** A low drone, like the one of SCARY's home screen. Starts only after the viewer touched the page, as browsers ask. */
const useAmbientSound = (enabled: boolean): void => {
    useEffect(() => {
        if (!enabled) return;
        let context: AudioContext | null = null;
        const start = () => {
            if (context !== null) return;
            const AudioContextClass = window.AudioContext;
            if (typeof AudioContextClass !== 'function') return;
            context = new AudioContextClass();
            const master = context.createGain();
            master.gain.value = 0.035;
            const filter = context.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 220;
            const swell = context.createOscillator();
            swell.frequency.value = 0.07;
            const depth = context.createGain();
            depth.gain.value = 0.02;
            swell.connect(depth).connect(master.gain);
            for (const [frequency, type] of [[55, 'sine'], [82.4, 'triangle'], [55.6, 'sine']] as const) {
                const voice = context.createOscillator();
                voice.type = type;
                voice.frequency.value = frequency;
                voice.connect(filter);
                voice.start();
            }
            filter.connect(master).connect(context.destination);
            swell.start();
        };
        const events = ['pointerdown', 'keydown'] as const;
        events.forEach((name) => window.addEventListener(name, start, { passive: true }));
        return () => {
            events.forEach((name) => window.removeEventListener(name, start));
            context?.close().catch(() => undefined);
        };
    }, [enabled]);
};

const Overlays = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const toast = useToast();
    const { effects } = useScaryState();
    const { sleepUntil } = useSession();
    const playing = isPlayerPath(location.pathname);
    const filmId = useMemo(() => filmIdOfPath(location.pathname), [location.pathname]);

    useAmbientSound(effects.sound && !playing);

    // What was watched, for "Your year in fear" and for the order of the rows: the film, and when.
    useEffect(() => {
        if (!playing || filmId === null) return;
        store.update((state) => {
            const last = state.history[state.history.length - 1];
            return last?.id === filmId && Date.now() - last.at < SAME_WATCH_MS ? {} : { history: [...state.history, { id: filmId, at: Date.now() }] };
        });
    }, [playing, filmId]);

    // The sleep timer: when the time is up, whatever plays is paused.
    useEffect(() => {
        if (sleepUntil === null) return;
        const timer = setTimeout(() => {
            document.querySelectorAll('video, audio').forEach((media) => (media as HTMLMediaElement).pause());
            setSleepTimer(0);
            toast.show({ type: 'alert', title: t('SCARY_SLEEP_DONE'), timeout: 10_000 });
        }, Math.max(0, sleepUntil - Date.now()));
        return () => clearTimeout(timer);
    }, [sleepUntil, toast, t]);

    return (
        <React.Fragment>
            {effects.atmosphere && !playing ? <div className={styles['atmosphere']} aria-hidden={'true'}><div className={styles['fog']} /><div className={styles['grain']} /></div> : null}
            <Shiver filmId={filmId} playing={playing} />
            <Screensaver enabled={effects.screensaver && !playing} />
            <Gate filmId={filmId} />
            <BucketPrompt filmId={filmId} playing={playing} />
            <PinDialog />
        </React.Fragment>
    );
};

export default Overlays;
