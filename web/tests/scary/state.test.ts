// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import { filmIdOfLinks, filmIdOfPath, isPlayerPath } from '../../src/scary/domain/paths';
import { createBackup, readBackup, restoreBackup } from '../../src/scary/state/backup';
import { CONSENT_VERSION, DEFAULT_STATE, STORAGE_KEY, answerConsent, createStore, sanitize } from '../../src/scary/state/store';

const memoryStorage = (initial: Record<string, string> = {}) => {
    const data = new Map(Object.entries(initial));
    return {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, value),
        key: (index: number) => Array.from(data.keys())[index] ?? null,
        get length() {
            return data.size;
        },
        data,
    };
};

const PIN = '1000:c2FsdHNhbHRzYWx0c2FsdA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

describe('the saved state', () => {
    test('anything unreadable becomes the defaults', () => {
        for (const value of [null, undefined, 'x', 42, [], { lock: 'x', effects: [], loved: 'tt0081505' }]) {
            expect(sanitize(value)).toEqual(DEFAULT_STATE);
        }
    });

    test('lists keep only film ids, once each', () => {
        const state = sanitize({ loved: ['tt0081505', 'tt0081505', '<script>', 7, 'tt12', 'tt0078748'], bucket: Array.from({ length: 40 }, (_, n) => `tt${1000000 + n}`) });
        expect(state.loved).toEqual(['tt0081505', 'tt0078748']);
        expect(state.bucket.length).toBe(30);
        expect(sanitize({ history: [{ id: 'tt0081505', at: 5 }, { id: 'bad', at: 5 }, { id: 'tt0081505', at: -1 }, 'x'] }).history).toEqual([{ id: 'tt0081505', at: 5 }]);
    });

    test('a lock without a well-formed PIN locks nothing', () => {
        expect(sanitize({ lock: { enabled: true, fromFear: 3, pin: null } }).lock).toEqual({ enabled: false, fromFear: 3, pin: null });
        expect(sanitize({ lock: { enabled: true, fromFear: 9, pin: 'javascript:alert(1)' } }).lock).toEqual({ enabled: false, fromFear: 4, pin: null });
        expect(sanitize({ lock: { enabled: true, fromFear: 2, pin: PIN } }).lock).toEqual({ enabled: true, fromFear: 2, pin: PIN });
    });

    test('consent is unanswered until the viewer answers, and an answer to an older text does not count', () => {
        expect(DEFAULT_STATE.consent).toEqual({ media: null, voice: false, at: null, version: CONSENT_VERSION });
        expect(sanitize({ consent: { media: true } }).consent.media).toBeNull();
        expect(sanitize({ consent: { media: 'yes', at: 5, version: CONSENT_VERSION } }).consent.media).toBeNull();
        expect(sanitize({ consent: { media: true, voice: true, at: 5, version: CONSENT_VERSION - 1 } }).consent).toEqual({ media: null, voice: false, at: null, version: CONSENT_VERSION });
        expect(sanitize(answerConsent(true, 1_700_000_000_000)(DEFAULT_STATE)).consent).toEqual({ media: true, voice: false, at: 1_700_000_000_000, version: CONSENT_VERSION });
        const spoken = sanitize({ consent: { media: null, voice: true, version: CONSENT_VERSION } });
        expect(spoken.consent).toMatchObject({ media: null, voice: true });
        expect(sanitize(answerConsent(false, 7)(spoken)).consent).toEqual({ media: false, voice: true, at: 7, version: CONSENT_VERSION });
    });

    test('a change is checked, saved and announced', () => {
        const storage = memoryStorage();
        const store = createStore(storage);
        let calls = 0;
        const stop = store.subscribe(() => calls++);
        store.update((state) => ({ loved: [...state.loved, 'tt0081505', 'nonsense'] }));
        expect(store.getState().loved).toEqual(['tt0081505']);
        expect(JSON.parse(storage.getItem(STORAGE_KEY)!).loved).toEqual(['tt0081505']);
        expect(calls).toBe(1);
        stop();
        store.update(() => ({ familyNight: true }));
        expect(calls).toBe(1);
        expect(createStore(storage).getState()).toMatchObject({ familyNight: true, loved: ['tt0081505'] });
        expect(createStore(memoryStorage({ [STORAGE_KEY]: '{broken' })).getState()).toEqual(DEFAULT_STATE);
        expect(createStore(null).getState()).toEqual(DEFAULT_STATE);
    });
});

describe('the backup file', () => {
    test('holds everything but the PIN, and restoring never touches the lock', () => {
        const source = memoryStorage({
            profile: '{"settings":{}}',
            library: '{"items":{}}',
            [STORAGE_KEY]: JSON.stringify({ loved: ['tt0081505'], familyNight: true, lock: { enabled: true, fromFear: 2, pin: PIN }, tmdbKey: 'a'.repeat(32) }),
            'weird key!': 'x',
        });
        const backup = createBackup(source, new Date('2026-11-26T12:00:00Z'));
        expect(backup).toMatchObject({ app: 'scary-web', version: 1, savedAt: '2026-11-26T12:00:00.000Z' });
        expect(Object.keys(backup.storage).sort()).toEqual(['library', 'profile', STORAGE_KEY].sort());
        expect(JSON.stringify(backup)).not.toContain('c2FsdHNhbHR');
        expect(JSON.parse(backup.storage[STORAGE_KEY])).not.toHaveProperty('lock');
        expect(JSON.stringify(backup)).not.toContain('a'.repeat(32));

        const entries = readBackup(JSON.stringify(backup))!;
        const target = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ lock: { enabled: true, fromFear: 5, pin: PIN }, lockout: { failedAttempts: 4, lockedUntil: 99 }, tmdbKey: 'b'.repeat(32) }) });
        restoreBackup(target, entries);
        expect(target.getItem('profile')).toBe('{"settings":{}}');
        expect(sanitize(JSON.parse(target.getItem(STORAGE_KEY)!))).toMatchObject({
            loved: ['tt0081505'],
            familyNight: true,
            lock: { enabled: true, fromFear: 5, pin: PIN },
            lockout: { failedAttempts: 4, lockedUntil: 99 },
            tmdbKey: 'b'.repeat(32),
        });
    });

    test('a file that is not a backup is refused', () => {
        for (const text of ['', 'x', '[]', '{}', '{"app":"other","version":1,"storage":{"a":"b"}}', '{"app":"scary-web","version":2,"storage":{"a":"b"}}',
            '{"app":"scary-web","version":1,"storage":{}}', '{"app":"scary-web","version":1,"storage":{"a":5}}', '{"app":"scary-web","version":1,"storage":{"bad key":"x"}}',
            '{"app":"scary-web","version":1,"storage":[]}']) {
            expect(readBackup(text)).toBeNull();
        }
        expect(readBackup('{"app":"scary-web","version":1,"savedAt":"x","storage":{"profile":"{}"}}')).toEqual({ profile: '{}' });
    });
});

describe('which film an address is about', () => {
    test('the film\'s page and the player', () => {
        expect(filmIdOfPath('/detail/movie/tt0081505/tt0081505')).toBe('tt0081505');
        expect(filmIdOfPath('/metadetails/series/tt4574334')).toBe('tt4574334');
        expect(filmIdOfPath('/detail/series/tt4574334/tt4574334%3A1%3A2')).toBe('tt4574334');
        expect(filmIdOfPath('/player/abc/https%3A%2F%2Fa.example%2Fmanifest.json/https%3A%2F%2Fv3-cinemeta.strem.io%2Fmanifest.json/movie/tt0081505/tt0081505')).toBe('tt0081505');
        expect(filmIdOfPath('/player/abc')).toBeNull();
        expect(filmIdOfPath('/discover/x/movie/tt0081505')).toBeNull();
        expect(filmIdOfPath('/detail/movie/%E0%A4%A')).toBeNull();
        expect(filmIdOfPath('/')).toBeNull();
        expect([isPlayerPath('/player/x'), isPlayerPath('/detail/movie/tt0081505')]).toEqual([true, false]);
    });

    test('a tile is known by where it leads', () => {
        expect(filmIdOfLinks({ metaDetailsVideos: null, metaDetailsStreams: '#/detail/movie/tt0081505/tt0081505', player: null })).toBe('tt0081505');
        expect(filmIdOfLinks({ metaDetailsVideos: '#/detail/series/tt4574334', metaDetailsStreams: null })).toBe('tt4574334');
        expect(filmIdOfLinks({ player: '#/player/abc/x/y/movie/tt0070047/tt0070047' })).toBe('tt0070047');
        expect(filmIdOfLinks({ metaDetailsStreams: '#/detail/movie/kitsu%3A1/kitsu%3A1' })).toBeNull();
        expect(filmIdOfLinks({ metaDetailsStreams: 7, search: '#/search?search=tt0081505' })).toBeNull();
        expect([filmIdOfLinks(null), filmIdOfLinks('tt0081505'), filmIdOfLinks({})]).toEqual([null, null, null]);
    });
});
