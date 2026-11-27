// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// A film's trailer playing by itself (docs/TRAILER_PLAN.md): rest the pointer or the focus on a film's tile for a
// moment and its trailer plays in a corner, muted; move on and it stops. One player at a time, never over the film's
// own controls, and nothing reaches YouTube unless the viewer allowed trailers from YouTube.
//
// Never: in family night, for a film the parental lock holds, while a dialog or the player is open, when the device
// asks for less motion, on a screen too small for YouTube's player, or on a touch screen (a touch opens the film).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import Icon from '@stremio/stremio-icons/react';
import { titleOf } from '../content/items';
import { isPlayerPath } from '../domain/paths';
import { HELLO, PLAYER_ORIGIN, REST_MS, START_MS, embedUrl, filmOfHref, metaUrl, readPlayerMessage, trailerIdOf } from '../domain/trailer';
import type { FilmLink } from '../domain/trailer';
import { useFeedLanguage, useScaryRules, useScaryState, useSession } from '../hooks';
import styles from './scary.less';

const MIN_WIDTH = 760;
const ANSWER_TIMEOUT_MS = 6_000;
const MAX_ANSWER_CHARS = 2_000_000;
/** How long a playing trailer waits after the pointer left its film: time enough to reach the trailer's own window. */
const LEAVE_MS = 700;

type Shown = { film: FilmLink, name: string, src: string };

/** Which trailer each film has, asked once per film while the page is open. Null: none, or Cinemeta did not answer. */
const trailers = new Map<string, Promise<string | null>>();

const trailerOf = (film: FilmLink): Promise<string | null> => {
    const known = trailers.get(film.id);
    if (known !== undefined) return known;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => controller?.abort(), ANSWER_TIMEOUT_MS);
    const asked = fetch(metaUrl(film.type, film.id), { signal: controller?.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
        .then((response) => response.ok ? response.text() : '')
        .then((text) => text.length > 0 && text.length <= MAX_ANSWER_CHARS ? trailerIdOf(JSON.parse(text)) : null)
        .catch(() => null)
        .finally(() => clearTimeout(timer));
    trailers.set(film.id, asked);
    return asked;
};

const prefersLessMotion = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The film of the tile an event happened on, with the name the tile shows. A place that shows one film without being
 * a link to it (the slide of the home screen's spotlight) says which film it is about itself.
 */
const tileOf = (target: EventTarget | null): { film: FilmLink, name: string } | null => {
    if (!(target instanceof Element)) return null;
    const link = target.closest('a[href]');
    const linked = filmOfHref(link?.getAttribute('href'));
    if (link !== null && link !== undefined && linked !== null) return { film: linked, name: (link.getAttribute('title') ?? '').slice(0, 120) };
    const place = target.closest('[data-scary-film]');
    const shown = filmOfHref(place?.getAttribute('data-scary-film'));
    return place !== null && place !== undefined && shown !== null ? { film: shown, name: (place.getAttribute('data-scary-name') ?? '').slice(0, 120) } : null;
};

const TrailerPreview = () => {
    const { t } = useTranslation();
    const language = useFeedLanguage();
    const location = useLocation();
    const { consent, effects, familyNight, lock } = useScaryState();
    const { pinRequest } = useSession();
    const lockActive = lock.enabled && lock.pin !== null;
    const enabled = consent.media === true && effects.trailers && !familyNight && pinRequest === null && !isPlayerPath(location.pathname);
    const rules = useScaryRules(enabled && lockActive);
    const [shown, setShown] = useState<Shown | null>(null);
    // The player is shown once it plays: a trailer that cannot be played here never shows YouTube's error in its place.
    const [live, setLive] = useState(false);
    const frame = useRef<HTMLIFrameElement | null>(null);
    const box = useRef<HTMLElement | null>(null);
    // What the listeners below read: the film rested on, the films whose trailer was closed or has played, the rules.
    const resting = useRef<string | null>(null);
    const done = useRef(new Set<string>());
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const leaving = useRef<ReturnType<typeof setTimeout> | null>(null);
    const under = useRef<ReturnType<typeof tileOf>>(null);
    const playing = useRef(false);
    playing.current = shown !== null;
    const held = useRef<(id: string) => boolean>(() => true);
    held.current = (id) => lockActive && (rules.library.status !== 'ready' || rules.isLocked(rules.library.byId.get(id) ?? null));
    const names = useRef<(film: FilmLink, fallback: string) => string>((_, fallback) => fallback);
    names.current = (film, fallback) => {
        const known = rules.library.byId.get(film.id);
        return known !== undefined ? titleOf(known, language) : fallback;
    };

    const stop = useCallback((forget: boolean) => {
        if (timer.current !== null) clearTimeout(timer.current);
        if (leaving.current !== null) clearTimeout(leaving.current);
        timer.current = null;
        leaving.current = null;
        if (forget) resting.current = null;
        setShown(null);
        setLive(false);
    }, []);

    useEffect(() => {
        if (!enabled) {
            stop(true);
            return;
        }
        const rest = (tile: ReturnType<typeof tileOf>) => {
            if (tile === null) {
                if (resting.current !== null) stop(true);
                return;
            }
            const { film, name } = tile;
            if (resting.current === film.id) return;
            stop(true);
            resting.current = film.id;
            if (done.current.has(film.id) || prefersLessMotion() || window.innerWidth < MIN_WIDTH || document.hidden) return;
            timer.current = setTimeout(() => {
                if (held.current(film.id)) return;
                trailerOf(film).then((id) => {
                    const src = embedUrl(id, window.location.origin);
                    // The answer may come after the viewer has moved on, or after a film was locked: then nothing plays.
                    if (src !== null && resting.current === film.id && !held.current(film.id) && !document.hidden) setShown({ film, name: names.current(film, name), src });
                });
            }, REST_MS);
        };
        const onOver = (event: PointerEvent) => {
            if (event.pointerType === 'touch') return;
            const stay = () => {
                if (leaving.current !== null) clearTimeout(leaving.current);
                leaving.current = null;
            };
            // Looking at the trailer itself does not stop it.
            if (box.current !== null && event.target instanceof Node && box.current.contains(event.target)) {
                under.current = null;
                stay();
                return;
            }
            const tile = tileOf(event.target);
            under.current = tile;
            if (!playing.current) {
                rest(tile);
            } else if (tile !== null && tile.film.id === resting.current) {
                stay();
            } else if (leaving.current === null) {
                // Off the film while its trailer plays: the trailer stops in a moment, unless the pointer was only on its
                // way to the trailer's window (other films may lie in between). Then whatever is under the pointer counts.
                leaving.current = setTimeout(() => {
                    leaving.current = null;
                    stop(true);
                    rest(under.current);
                }, LEAVE_MS);
            }
        };
        const onFocus = (event: FocusEvent) => rest(tileOf(event.target));
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && resting.current !== null) {
                done.current.add(resting.current);
                stop(false);
            }
        };
        const onHidden = () => {
            if (document.hidden) stop(true);
        };
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== PLAYER_ORIGIN || frame.current === null || event.source !== frame.current.contentWindow) return;
            const said = readPlayerMessage(event.data);
            if (said === 'playing') {
                setLive(true);
            } else if ((said === 'ended' || said === 'error') && resting.current !== null) {
                // Played once, or cannot be shown here: the window goes quietly and does not come back for this film.
                done.current.add(resting.current);
                stop(false);
            }
        };
        document.addEventListener('pointerover', onOver, true);
        document.addEventListener('focusin', onFocus, true);
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('visibilitychange', onHidden);
        window.addEventListener('message', onMessage);
        return () => {
            document.removeEventListener('pointerover', onOver, true);
            document.removeEventListener('focusin', onFocus, true);
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('visibilitychange', onHidden);
            window.removeEventListener('message', onMessage);
            stop(true);
        };
    }, [enabled, stop]);

    // A player that has not started within a while is given up, quietly.
    useEffect(() => {
        if (shown === null || live) return;
        const waiting = setTimeout(() => {
            done.current.add(shown.film.id);
            stop(false);
        }, START_MS);
        return () => clearTimeout(waiting);
    }, [shown, live, stop]);

    // Another screen: whatever played belongs to the one that was left.
    useEffect(() => stop(true), [location.pathname, stop]);

    const close = useCallback(() => {
        if (resting.current !== null) done.current.add(resting.current);
        stop(false);
    }, [stop]);

    if (shown === null || !enabled) return null;
    const label = t('SCARY_TRAILER_OF', { a: shown.name });
    return (
        // A muted picture beside the film, with nothing to operate by keyboard: it stops when the focus moves on, or on Escape.
        <aside ref={box} className={styles['trailer']} aria-hidden={'true'}>
            <div className={styles['trailer-bar']}>
                <span className={styles['trailer-name']} dir={'auto'}>{label}</span>
                <button type={'button'} className={styles['trailer-close']} tabIndex={-1} title={t('SCARY_TRAILER_CLOSE')} onClick={close}>
                    <Icon className={styles['icon']} name={'close'} />
                </button>
            </div>
            <iframe
                ref={frame}
                key={shown.src}
                className={classnames(styles['trailer-frame'], { [styles['live']]: live })}
                src={shown.src}
                title={label}
                tabIndex={-1}
                allow={'autoplay; encrypted-media'}
                // YouTube's player asks to know which site shows it; it is told the site's address and nothing more.
                referrerPolicy={'strict-origin'}
                onLoad={() => HELLO.forEach((words) => frame.current?.contentWindow?.postMessage(words, PLAYER_ORIGIN))}
            />
        </aside>
    );
};

export default TrailerPreview;
