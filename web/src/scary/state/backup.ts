// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// A backup file: everything the app keeps in this browser (the library, "continue watching", settings, SCARY's
// lists), as one JSON file the viewer saves and can restore. There is no account, so this file is the only copy
// outside the browser. The parental PIN and the TMDB key are never written to it, and restoring never changes them.

import { IDS, activeOf, readProfiles, suffixOf, writeProfiles } from '../domain/profiles';
import type { Profile } from '../domain/profiles';
import { ENGINE_KEYS, LISTS_KEY, PROFILES_KEY, clearParked } from './profiles';
import { STORAGE_KEY, sanitize } from './store';

const APP = 'scary-web';
/** 2: the file also holds every profile ("Who is watching?") and its lists. A file of version 1 is still read. */
const VERSION = 2;
const MAX_FILE_CHARS = 30_000_000;
const MAX_KEYS = 100;
const KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;
/** What a profile that is not on screen holds: "library@p2", "scary.lists@p3". */
const PARKED_KEYS: readonly string[] = [...ENGINE_KEYS, LISTS_KEY];
const isParkedKey = (key: string): boolean => {
    const [name, id, ...rest] = key.split('@');
    return rest.length === 0 && PARKED_KEYS.includes(name) && IDS.includes(id);
};

type Backup = { app: string, version: number, savedAt: string, storage: Record<string, string> };
type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

const parse = (text: string | null | undefined): unknown => {
    try {
        return JSON.parse(text ?? 'null');
    } catch {
        return null;
    }
};

/** Who the profiles are and which one is on screen, from what a storage or a file holds; read as untrusted. */
const profilesOf = (text: string | null | undefined): { list: Profile[], activeId: string } => {
    const stored = parse(text);
    const record = typeof stored === 'object' && stored !== null && !Array.isArray(stored) ? stored as Record<string, unknown> : {};
    const list = readProfiles(record.list);
    return { list, activeId: activeOf(list, record.active).id };
};

const withoutLock = (stateJson: string | null): string => {
    // An unreadable state is saved as the defaults.
    const { lock, lockout, tmdbKey, ai, ...rest } = sanitize(parse(stateJson));
    void lock;
    void lockout;
    void tmdbKey;
    // Which AI service and model were chosen is kept; the keys, and what the viewer agreed to in this browser, are not.
    return JSON.stringify({ ...rest, ai: { ...ai, keys: {}, agreed: null } });
};

/**
 * The backup of what `storage` holds now: the profile on screen as it is, and, when there are more profiles, who they
 * are (name, colour, gentle) and what each of them holds.
 */
const createBackup = (storage: KeyValueStorage, now: Date = new Date()): Backup => {
    const entries: Record<string, string> = {};
    for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (key === null || !KEY_PATTERN.test(key) || key === PROFILES_KEY) continue;
        const value = storage.getItem(key);
        if (typeof value === 'string') entries[key] = key === STORAGE_KEY ? withoutLock(value) : value;
    }
    const { list, activeId } = profilesOf(storage.getItem(PROFILES_KEY));
    if (list.length > 1) {
        entries[PROFILES_KEY] = JSON.stringify({ list: writeProfiles(list), active: activeId, pending: null });
        for (const profile of list) {
            if (profile.id === activeId) continue;
            for (const name of PARKED_KEYS) {
                const value = storage.getItem(name + suffixOf(profile.id));
                if (typeof value === 'string') entries[name + suffixOf(profile.id)] = value;
            }
        }
    }
    return { app: APP, version: VERSION, savedAt: now.toISOString(), storage: entries };
};

/** The entries of a backup file, or null when the text is not one. Read as untrusted: sizes and names are checked. */
const readBackup = (text: string): Record<string, string> | null => {
    if (text.length > MAX_FILE_CHARS) return null;
    let file: unknown;
    try {
        file = JSON.parse(text);
    } catch {
        return null;
    }
    const backup = file as Partial<Backup> | null;
    if (typeof backup !== 'object' || backup === null || backup.app !== APP || (backup.version !== 1 && backup.version !== VERSION)) return null;
    if (typeof backup.storage !== 'object' || backup.storage === null || Array.isArray(backup.storage)) return null;
    const entries = Object.entries(backup.storage);
    if (entries.length === 0 || entries.length > MAX_KEYS) return null;
    if (!entries.every(([key, value]) => (KEY_PATTERN.test(key) || isParkedKey(key)) && typeof value === 'string')) return null;
    // A file of version 1 knows no profiles: whatever it says about them is not taken.
    return Object.fromEntries(backup.version === 1 ? entries.filter(([key]) => key !== PROFILES_KEY && !isParkedKey(key)) : entries);
};

/**
 * Writes a backup's entries into `storage`. SCARY's own state keeps the lock and the wait after wrong PINs that are
 * in the browser now, and the keys of outside services: a backup file cannot be used to take the lock off.
 *
 * A file that holds profiles replaces the profiles of this browser: who they are, which one is on screen, and what
 * each holds; what a profile of this browser held and the file does not is removed. A file without profiles (one
 * viewer, or version 1) is put into the profile on screen and leaves the others as they are.
 */
const restoreBackup = (storage: KeyValueStorage, entries: Record<string, string>): void => {
    const current = sanitize(parse(storage.getItem(STORAGE_KEY)));
    const withProfiles = typeof entries[PROFILES_KEY] === 'string';
    const restored = withProfiles ? profilesOf(entries[PROFILES_KEY]) : null;
    if (restored !== null) {
        IDS.forEach((id) => clearParked(storage, id));
        // The profile on screen is replaced whole: what the file does not hold for it is not kept from this browser.
        ENGINE_KEYS.forEach((key) => {
            if (typeof entries[key] !== 'string') storage.removeItem(key);
        });
        storage.setItem(PROFILES_KEY, JSON.stringify({ list: writeProfiles(restored.list), active: restored.activeId, pending: null }));
    }
    for (const [key, value] of Object.entries(entries)) {
        if (key === PROFILES_KEY) continue;
        if (isParkedKey(key)) {
            const [name, id] = key.split('@');
            // Only for a profile the file itself names, and never for the one it puts on screen.
            if (restored === null || id === restored.activeId || !restored.list.some((profile) => profile.id === id)) continue;
            if (name === LISTS_KEY) {
                const { loved, notForMe, bucket, history } = sanitize(parse(value));
                storage.setItem(key, JSON.stringify({ loved, notForMe, bucket, history }));
            } else {
                storage.setItem(key, value);
            }
            continue;
        }
        if (key !== STORAGE_KEY) {
            storage.setItem(key, value);
            continue;
        }
        const from = sanitize(parse(value));
        storage.setItem(key, JSON.stringify({ ...from, lock: current.lock, lockout: current.lockout, tmdbKey: current.tmdbKey, ai: { ...from.ai, keys: current.ai.keys, agreed: current.ai.agreed } }));
    }
};

export { createBackup, readBackup, restoreBackup };
export type { Backup };
