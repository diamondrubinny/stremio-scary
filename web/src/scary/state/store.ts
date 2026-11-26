// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// What SCARY's own features remember: the lock, the lists, the switches. One small record in this browser's storage
// (localStorage, "scary.state"); nothing is sent anywhere. What is read back is checked like any outside input, since
// a backup file or another script on the device can have written it.

import { NO_LOCKOUT } from '../domain/lock';
import { keyKind } from '../tmdb/client';
import type { Lockout } from '../domain/lock';

const STORAGE_KEY = 'scary.state';
const IMDB_ID = /^tt\d{7,8}$/;
const PIN_HASH = /^\d{1,8}:[A-Za-z0-9+/=]{1,64}:[A-Za-z0-9+/=]{1,128}$/;
const MAX_LIST = 2_000;
const MAX_HISTORY = 1_000;
const SLEEP_MINUTES = [0, 15, 30, 45, 60, 90] as const;

type Watch = { id: string, at: number };

type ScaryState = {
    familyNight: boolean,
    lock: { enabled: boolean, fromFear: number, pin: string | null },
    lockout: Lockout,
    loved: string[],
    notForMe: string[],
    bucket: string[],
    /** Films opened in the player, newest last. */
    history: Watch[],
    effects: { atmosphere: boolean, shiver: boolean, sound: boolean, screensaver: boolean, seasonal: boolean },
    /**
     * What the viewer said about content from outside: trailers play from YouTube (Google). `media` is null until
     * they answer, and nothing from YouTube loads unless it is true. `at` is when they answered. `voice` is asked the
     * first time the microphone is used: the browser's speech service hears what is said.
     */
    consent: { media: boolean | null, voice: boolean, at: number | null, version: number },
    /**
     * The viewer's own TMDB key, when they added one: it turns on the cast, the stores and "coming soon". Kept in
     * this browser and sent only to api.themoviedb.org. Never written to a backup file.
     */
    tmdbKey: string | null,
};

/** The version of the privacy text the consent was given to. A new version asks again. */
const CONSENT_VERSION = 1;

const DEFAULT_STATE: ScaryState = {
    familyNight: false,
    lock: { enabled: false, fromFear: 4, pin: null },
    lockout: NO_LOCKOUT,
    loved: [],
    notForMe: [],
    bucket: [],
    history: [],
    // Sound starts off: a browser page that makes noise by itself is not welcome.
    effects: { atmosphere: true, shiver: true, sound: false, screensaver: true, seasonal: true },
    consent: { media: null, voice: false, at: null, version: CONSENT_VERSION },
    tmdbKey: null,
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const flag = (value: unknown, fallback: boolean): boolean => typeof value === 'boolean' ? value : fallback;
const ids = (value: unknown, max: number = MAX_LIST): string[] =>
    Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && IMDB_ID.test(id)))].slice(0, max) : [];
const whole = (value: unknown, min: number, max: number, fallback: number): number =>
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : fallback;

/** A state from anything: every part that is not what it should be falls back to its default. */
const sanitize = (value: unknown): ScaryState => {
    const raw = isRecord(value) ? value : {};
    const lock = isRecord(raw.lock) ? raw.lock : {};
    const lockout = isRecord(raw.lockout) ? raw.lockout : {};
    const effects = isRecord(raw.effects) ? raw.effects : {};
    const consent = isRecord(raw.consent) ? raw.consent : {};
    // An answer given to an older privacy text does not count for this one.
    const answered = typeof consent.media === 'boolean' && consent.version === CONSENT_VERSION;
    const pin = typeof lock.pin === 'string' && PIN_HASH.test(lock.pin) ? lock.pin : null;
    return {
        familyNight: flag(raw.familyNight, DEFAULT_STATE.familyNight),
        // A lock without a PIN locks nothing.
        lock: { enabled: flag(lock.enabled, false) && pin !== null, fromFear: whole(lock.fromFear, 1, 5, DEFAULT_STATE.lock.fromFear), pin },
        lockout: { failedAttempts: whole(lockout.failedAttempts, 0, 10_000, 0), lockedUntil: whole(lockout.lockedUntil, 0, Number.MAX_SAFE_INTEGER, 0) },
        loved: ids(raw.loved),
        notForMe: ids(raw.notForMe),
        bucket: ids(raw.bucket, 30),
        history: (Array.isArray(raw.history) ? raw.history : [])
            .filter((watch): watch is Watch => isRecord(watch) && typeof watch.id === 'string' && IMDB_ID.test(watch.id) && typeof watch.at === 'number' && Number.isFinite(watch.at) && watch.at > 0)
            .map(({ id, at }) => ({ id, at }))
            .slice(-MAX_HISTORY),
        effects: {
            atmosphere: flag(effects.atmosphere, DEFAULT_STATE.effects.atmosphere),
            shiver: flag(effects.shiver, DEFAULT_STATE.effects.shiver),
            sound: flag(effects.sound, DEFAULT_STATE.effects.sound),
            screensaver: flag(effects.screensaver, DEFAULT_STATE.effects.screensaver),
            seasonal: flag(effects.seasonal, DEFAULT_STATE.effects.seasonal),
        },
        consent: {
            media: answered ? consent.media as boolean : null,
            voice: consent.voice === true && consent.version === CONSENT_VERSION,
            at: answered ? whole(consent.at, 1, Number.MAX_SAFE_INTEGER, 0) || null : null,
            version: CONSENT_VERSION,
        },
        tmdbKey: keyKind(raw.tmdbKey) !== null ? raw.tmdbKey as string : null,
    };
};

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

const createStore = (storage: Storage | null) => {
    const read = (): ScaryState => {
        try {
            return sanitize(JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null'));
        } catch {
            return sanitize(null);
        }
    };
    let state = read();
    const listeners = new Set<() => void>();
    return {
        getState: (): ScaryState => state,
        /** Replaces the parts returned by `change`, checks the whole, saves it and tells whoever listens. */
        update: (change: (current: ScaryState) => Partial<ScaryState>): void => {
            state = sanitize({ ...state, ...change(state) });
            try {
                storage?.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch {
                // Storage full or switched off: the change holds until the page is closed.
            }
            listeners.forEach((listener) => listener());
        },
        /** Reads the storage again (after a backup was restored). */
        reload: (): void => {
            state = read();
            listeners.forEach((listener) => listener());
        },
        subscribe: (listener: () => void): (() => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
};

const browserStorage = (): Storage | null => {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
};

const store = createStore(browserStorage());

/** Records the viewer's answer about content from outside, and when it was given. */
const answerConsent = (media: boolean, now: number = Date.now()): ((state: ScaryState) => Partial<ScaryState>) =>
    (state) => ({ consent: { ...state.consent, media, at: now, version: CONSENT_VERSION } });

export { CONSENT_VERSION, DEFAULT_STATE, SLEEP_MINUTES, STORAGE_KEY, answerConsent, createStore, sanitize, store };
export type { ScaryState, Watch };
