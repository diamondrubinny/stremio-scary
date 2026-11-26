// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// A backup file: everything the app keeps in this browser (the library, "continue watching", settings, SCARY's
// lists), as one JSON file the viewer saves and can restore. There is no account, so this file is the only copy
// outside the browser. The parental PIN and the TMDB key are never written to it, and restoring never changes them.

import { STORAGE_KEY, sanitize } from './store';

const APP = 'scary-web';
const VERSION = 1;
const MAX_FILE_CHARS = 30_000_000;
const MAX_KEYS = 100;
const KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;

type Backup = { app: string, version: number, savedAt: string, storage: Record<string, string> };
type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'key' | 'length'>;

const withoutLock = (stateJson: string | null): string => {
    let state: unknown = null;
    try {
        state = JSON.parse(stateJson ?? 'null');
    } catch {
        // An unreadable state is saved as the defaults.
    }
    const { lock, lockout, tmdbKey, ...rest } = sanitize(state);
    void lock;
    void lockout;
    void tmdbKey;
    return JSON.stringify(rest);
};

/** The backup of what `storage` holds now. */
const createBackup = (storage: KeyValueStorage, now: Date = new Date()): Backup => {
    const entries: Record<string, string> = {};
    for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (key === null || !KEY_PATTERN.test(key)) continue;
        const value = storage.getItem(key);
        if (typeof value === 'string') entries[key] = key === STORAGE_KEY ? withoutLock(value) : value;
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
    if (typeof backup !== 'object' || backup === null || backup.app !== APP || backup.version !== VERSION) return null;
    if (typeof backup.storage !== 'object' || backup.storage === null || Array.isArray(backup.storage)) return null;
    const entries = Object.entries(backup.storage);
    if (entries.length === 0 || entries.length > MAX_KEYS) return null;
    if (!entries.every(([key, value]) => KEY_PATTERN.test(key) && typeof value === 'string')) return null;
    return Object.fromEntries(entries);
};

/**
 * Writes a backup's entries into `storage`. SCARY's own state keeps the lock and the wait after wrong PINs that are
 * in the browser now: a backup file cannot be used to take the lock off.
 */
const restoreBackup = (storage: KeyValueStorage, entries: Record<string, string>): void => {
    const current = sanitize((() => {
        try {
            return JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
        } catch {
            return null;
        }
    })());
    for (const [key, value] of Object.entries(entries)) {
        if (key !== STORAGE_KEY) {
            storage.setItem(key, value);
            continue;
        }
        let restored: unknown = null;
        try {
            restored = JSON.parse(value);
        } catch {
            // Falls back to the defaults below.
        }
        storage.setItem(key, JSON.stringify({ ...sanitize(restored), lock: current.lock, lockout: current.lockout, tmdbKey: current.tmdbKey }));
    }
};

export { createBackup, readBackup, restoreBackup };
export type { Backup };
