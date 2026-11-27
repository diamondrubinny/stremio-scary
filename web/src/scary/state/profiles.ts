// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Where the profiles live in the browser, and how one takes another's place (docs/PROFILES_PLAN.md).
//
// Stremio Web's engine reads fixed storage keys, so the profile on screen always sits in the usual keys, and every
// other profile is parked under the same keys with a suffix ("library@p2"). Switching is asked for here and done
// when the page starts again, before the engine and SCARY's own state read anything: nothing is written halfway.
// The leaving profile is copied aside first, and only then is the arriving one put in place.

import { FIRST, IDS, activeOf, addProfile, readProfiles, removeProfile, suffixOf, updateProfile, writeProfiles } from '../domain/profiles';
import type { Profile } from '../domain/profiles';
import { STORAGE_KEY, sanitize } from './store';
import type { ScaryState } from './store';

const PROFILES_KEY = 'scary.profiles';
/** The engine's keys that are one viewer's own: the library with "continue watching", and what they searched for. */
const ENGINE_KEYS: readonly string[] = ['library', 'library_recent', 'notifications', 'streams', 'search_history'];
/** SCARY's lists of a parked profile: "scary.lists@p2". The profile on screen keeps them in SCARY's state. */
const LISTS_KEY = 'scary.lists';

type Lists = Pick<ScaryState, 'loved' | 'notForMe' | 'bucket' | 'history'>;
type Pending = { to: string, remove: string | null };
type ProfilesState = { list: Profile[], activeId: string, pending: Pending | null };
type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const parse = (text: string | null): unknown => {
    try {
        return JSON.parse(text ?? 'null');
    } catch {
        return null;
    }
};

const listsOf = (state: ScaryState): Lists => ({ loved: state.loved, notForMe: state.notForMe, bucket: state.bucket, history: state.history });

/** What the browser holds about profiles, read as untrusted. Without anything stored: the first profile alone. */
const readProfilesState = (storage: KeyValueStorage): ProfilesState => {
    const stored = parse(storage.getItem(PROFILES_KEY));
    const record = typeof stored === 'object' && stored !== null && !Array.isArray(stored) ? stored as Record<string, unknown> : {};
    const list = readProfiles(record.list);
    const known = (id: unknown): id is string => typeof id === 'string' && list.some((profile) => profile.id === id);
    const asked = typeof record.pending === 'object' && record.pending !== null ? record.pending as Record<string, unknown> : null;
    const pending = asked !== null && known(asked.to) ? { to: asked.to, remove: known(asked.remove) && asked.remove !== FIRST ? asked.remove : null } : null;
    return { list, activeId: activeOf(list, record.active).id, pending };
};

const writeProfilesState = (storage: KeyValueStorage, state: ProfilesState): void => {
    storage.setItem(PROFILES_KEY, JSON.stringify({ list: writeProfiles(state.list), active: state.activeId, pending: state.pending }));
};

/** Forgets everything parked for a profile. */
const clearParked = (storage: KeyValueStorage, id: string): void => {
    if (!IDS.includes(id)) return;
    [...ENGINE_KEYS, LISTS_KEY].forEach((key) => storage.removeItem(key + suffixOf(id)));
};

/** Copies what the profile on screen holds to its parked keys. The usual keys are left as they are. */
const park = (storage: KeyValueStorage, id: string): void => {
    for (const key of ENGINE_KEYS) {
        const value = storage.getItem(key);
        if (value !== null) storage.setItem(key + suffixOf(id), value);
        else storage.removeItem(key + suffixOf(id));
    }
    storage.setItem(LISTS_KEY + suffixOf(id), JSON.stringify(listsOf(sanitize(parse(storage.getItem(STORAGE_KEY))))));
};

/** Puts a parked profile into the usual keys. Its parked copies stay until the whole switch has held. */
const place = (storage: KeyValueStorage, id: string): void => {
    for (const key of ENGINE_KEYS) {
        const value = storage.getItem(key + suffixOf(id));
        if (value !== null) storage.setItem(key, value);
        else storage.removeItem(key);
    }
    // The lists are read like any outside input; a profile that was never on screen starts with empty ones.
    const lists = listsOf(sanitize(parse(storage.getItem(LISTS_KEY + suffixOf(id)))));
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...sanitize(parse(storage.getItem(STORAGE_KEY))), ...lists }));
};

/**
 * Does the switch that was asked for, if one was. Called once when the page starts, before anything else reads the
 * storage. Returns true when another profile is now on screen. If the storage cannot take the copy (it is full),
 * nothing changes and the request is dropped.
 */
const applyPending = (storage: KeyValueStorage): boolean => {
    const state = readProfilesState(storage);
    if (state.pending === null) return false;
    const { to, remove } = state.pending;
    const from = state.activeId;
    const settle = (next: ProfilesState): void => writeProfilesState(storage, { ...next, pending: null });
    if (to === remove) {
        settle(state);
        return false;
    }
    if (to !== from) {
        try {
            if (remove !== from) park(storage, from);
        } catch {
            clearParked(storage, from);
            settle(state);
            return false;
        }
        const before = new Map([...ENGINE_KEYS, STORAGE_KEY].map((key) => [key, storage.getItem(key)] as const));
        try {
            place(storage, to);
        } catch {
            // Back to what was on screen, as far as the storage allows.
            before.forEach((value, key) => {
                try {
                    if (value !== null) storage.setItem(key, value);
                    else storage.removeItem(key);
                } catch {
                    // Nothing more can be done for this key.
                }
            });
            clearParked(storage, from);
            settle(state);
            return false;
        }
        clearParked(storage, to);
    }
    if (remove !== null) clearParked(storage, remove);
    settle({ list: remove !== null ? removeProfile(state.list, remove) ?? state.list : state.list, activeId: to, pending: null });
    return to !== from;
};

/** Asks for another profile to be on screen the next time the page starts. False for a profile that is not there. */
const requestSwitch = (storage: KeyValueStorage, to: string, remove: string | null = null): boolean => {
    const state = readProfilesState(storage);
    if (!state.list.some((profile) => profile.id === to)) return false;
    writeProfilesState(storage, { ...state, pending: { to, remove } });
    return true;
};

const browserStorage = (): Storage | null => {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
};

const ALONE: ProfilesState = { list: readProfiles(null), activeId: FIRST, pending: null };

/** The profiles of this browser, for the screens. Changes are saved at once; a switch needs the page to start again. */
const createProfilesStore = (storage: KeyValueStorage | null) => {
    const read = (): ProfilesState => {
        try {
            return storage !== null ? readProfilesState(storage) : ALONE;
        } catch {
            return ALONE;
        }
    };
    let state = read();
    const listeners = new Set<() => void>();
    const save = (list: Profile[]): boolean => {
        if (storage === null) return false;
        try {
            writeProfilesState(storage, { ...state, list });
        } catch {
            return false;
        }
        state = read();
        listeners.forEach((listener) => listener());
        return true;
    };
    return {
        getState: (): ProfilesState => state,
        subscribe: (listener: () => void): (() => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        /** Does a waiting switch (when the page starts). True when another profile is now on screen. */
        start: (): boolean => {
            let switched = false;
            try {
                switched = storage !== null && applyPending(storage);
            } catch {
                // A storage that cannot be used leaves the profile that was on screen.
            }
            state = read();
            return switched;
        },
        add: (name: unknown, colour: number, gentle: boolean): Profile | null => {
            const result = addProfile(state.list, name, colour, gentle);
            if (result === null || storage === null) return null;
            // An id is used again after its profile was removed: nothing of the old one may be left for the new.
            clearParked(storage, result.added.id);
            return save(result.profiles) ? result.added : null;
        },
        update: (id: string, name: unknown, colour: number, gentle: boolean): boolean => {
            const list = updateProfile(state.list, id, name, colour, gentle);
            return list !== null && save(list);
        },
        /** Removes a profile and its lists. 'restart': it is the one on screen, and the page must start again. */
        remove: (id: string): 'removed' | 'restart' | null => {
            if (storage === null || removeProfile(state.list, id) === null) return null;
            try {
                if (id === state.activeId) return requestSwitch(storage, FIRST, id) ? 'restart' : null;
                clearParked(storage, id);
            } catch {
                return null;
            }
            return save(removeProfile(state.list, id) ?? state.list) ? 'removed' : null;
        },
        /** Asks for a profile to be on screen; the caller then starts the page again. */
        choose: (id: string): boolean => {
            try {
                return storage !== null && id !== state.activeId && requestSwitch(storage, id);
            } catch {
                return false;
            }
        },
    };
};

const profilesStore = createProfilesStore(browserStorage());

const SHOWN_KEY = 'scary.profiles.asked';

/** Whether "Who is watching?" was already asked since the browser opened the app (kept for the tab, not saved). */
const chooserWasShown = (): boolean => {
    try {
        return window.sessionStorage.getItem(SHOWN_KEY) === '1';
    } catch {
        return true;
    }
};

const markChooserShown = (): void => {
    try {
        window.sessionStorage.setItem(SHOWN_KEY, '1');
    } catch {
        // Without session storage the question is simply not asked.
    }
};

export { ENGINE_KEYS, LISTS_KEY, PROFILES_KEY, applyPending, chooserWasShown, clearParked, createProfilesStore, markChooserShown, profilesStore, readProfilesState, requestSwitch, writeProfilesState };
export type { KeyValueStorage, Pending, ProfilesState };
