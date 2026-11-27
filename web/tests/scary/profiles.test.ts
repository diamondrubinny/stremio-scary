// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import { FIRST, MAX_PROFILES, activeOf, addProfile, cleanName, nextColour, readProfiles, removeProfile, updateProfile } from '../../src/scary/domain/profiles';
import { createBackup, restoreBackup } from '../../src/scary/state/backup';
import { PROFILES_KEY, applyPending, createProfilesStore, readProfilesState, requestSwitch } from '../../src/scary/state/profiles';
import { STORAGE_KEY, sanitize } from '../../src/scary/state/store';

/** A browser storage in memory. `refuse` makes writing some keys fail, as a full storage does. */
const memory = (start: Record<string, string> = {}, refuse: (key: string) => boolean = () => false) => {
    const map = new Map(Object.entries(start));
    return {
        map,
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => {
            if (refuse(key)) throw new Error('QuotaExceededError');
            map.set(key, value);
        },
        removeItem: (key: string) => void map.delete(key),
        key: (index: number) => [...map.keys()][index] ?? null,
        get length() {
            return map.size;
        },
    };
};

const stateOf = (storage: ReturnType<typeof memory>) => sanitize(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null'));
const two = JSON.stringify({ list: [{ id: 'p1', name: 'Dana', c: 0, g: false }, { id: 'p2', name: 'Noa', c: 1, g: true }], active: 'p1', pending: null });

describe('a profile\'s name', () => {
    test('is one clean line of at most twenty characters', () => {
        expect(cleanName('  Dana   Levi \n')).toBe('Dana Levi');
        expect(cleanName('דנה')).toBe('דנה');
        expect(cleanName('a'.repeat(50))).toBe('a'.repeat(20));
        expect(cleanName('👻'.repeat(30))).toBe('👻'.repeat(20));
    });

    test('cannot turn the text around it, nor carry control characters', () => {
        expect(cleanName('‮evil‬')).toBe('evil');
        expect(cleanName('a\u0000b‏c⁦d﻿')).toBe('a b c d');
    });

    test('is refused when nothing is left of it', () => {
        expect([cleanName(''), cleanName('   '), cleanName('​‮'), cleanName(7), cleanName(null)]).toEqual([null, null, null, null, null]);
    });
});

describe('the list of profiles', () => {
    test('read from anything, is the first profile and at most four more', () => {
        expect(readProfiles(null)).toEqual([{ id: FIRST, name: '', colour: 0, gentle: false }]);
        expect(readProfiles('p1')).toHaveLength(1);
        expect(readProfiles([{ id: 'p2', name: 'Noa', c: 9, g: 'yes' }, { id: 'p2', name: 'Twice' }, { id: 'p9', name: 'x' }, { id: 'p3', name: '  ' }, 7, null])).toEqual([
            { id: FIRST, name: '', colour: 0, gentle: false },
            { id: 'p2', name: 'Noa', colour: 5, gentle: false },
        ]);
        const many = ['p5', 'p4', 'p3', 'p2', 'p1', 'p1'].map((id) => ({ id, name: `n ${id}`, c: 1, g: true }));
        expect(readProfiles(many).map((profile) => profile.id)).toEqual(['p1', 'p5', 'p4', 'p3', 'p2']);
    });

    test('grows to five, and a removed profile\'s id is used again', () => {
        let profiles = readProfiles(null);
        for (const name of ['B', 'C', 'D', 'E']) profiles = addProfile(profiles, name, nextColour(profiles), false)?.profiles ?? [];
        expect(profiles.map((profile) => [profile.id, profile.colour])).toEqual([['p1', 0], ['p2', 1], ['p3', 2], ['p4', 3], ['p5', 4]]);
        expect(profiles).toHaveLength(MAX_PROFILES);
        expect(addProfile(profiles, 'F', 0, false)).toBeNull();
        profiles = removeProfile(profiles, 'p3') ?? [];
        expect(addProfile(profiles, 'New', 2, true)?.added).toEqual({ id: 'p3', name: 'New', colour: 2, gentle: true });
    });

    test('keeps its first profile, refuses empty names and unknown ids', () => {
        const profiles = readProfiles([{ id: 'p2', name: 'Noa' }]);
        expect(removeProfile(profiles, FIRST)).toBeNull();
        expect(removeProfile(profiles, 'p4')).toBeNull();
        expect(addProfile(profiles, '  ', 0, false)).toBeNull();
        expect(updateProfile(profiles, 'p2', '', 0, false)).toBeNull();
        expect(updateProfile(profiles, 'p4', 'x', 0, false)).toBeNull();
        expect(updateProfile(profiles, 'p2', ' Noa B ', 99, true)?.[1]).toEqual({ id: 'p2', name: 'Noa B', colour: 5, gentle: true });
        expect([activeOf(profiles, 'p2').id, activeOf(profiles, 'p5').id, activeOf(profiles, null).id]).toEqual(['p2', FIRST, FIRST]);
    });
});

describe('what the browser holds about profiles', () => {
    test('is read as untrusted', () => {
        expect(readProfilesState(memory())).toEqual({ list: readProfiles(null), activeId: FIRST, pending: null });
        expect(readProfilesState(memory({ [PROFILES_KEY]: '{broken' })).activeId).toBe(FIRST);
        const odd = memory({ [PROFILES_KEY]: JSON.stringify({ list: [{ id: 'p2', name: 'Noa' }], active: 'p4', pending: { to: 'p5', remove: 'p1' } }) });
        expect(readProfilesState(odd)).toMatchObject({ activeId: FIRST, pending: null });
        const first = memory({ [PROFILES_KEY]: JSON.stringify({ list: [{ id: 'p2', name: 'Noa' }], active: 'p2', pending: { to: 'p1', remove: 'p1' } }) });
        expect(readProfilesState(first).pending).toEqual({ to: 'p1', remove: null });
    });
});

describe('one profile taking another\'s place', () => {
    const start = () => memory({
        [PROFILES_KEY]: two,
        library: '{"dana":1}',
        library_recent: '{"dana":2}',
        search_history: '["psycho"]',
        profile: '{"settings":"shared"}',
        [STORAGE_KEY]: JSON.stringify({ familyNight: true, loved: ['tt0081505'], bucket: ['tt0070047'], history: [{ id: 'tt0081505', at: 5 }], lock: { enabled: true, fromFear: 3, pin: '60000:c2FsdA==:aGFzaA==' } }),
    });

    test('nothing happens when nothing was asked', () => {
        const storage = start();
        const before = new Map(storage.map);
        expect(applyPending(storage)).toBe(false);
        expect(storage.map).toEqual(before);
    });

    test('the leaving profile is parked, the arriving one starts empty, what is shared stays', () => {
        const storage = start();
        const pin = stateOf(storage).lock.pin;
        expect(requestSwitch(storage, 'p2')).toBe(true);
        expect(applyPending(storage)).toBe(true);
        expect(readProfilesState(storage)).toMatchObject({ activeId: 'p2', pending: null });
        expect([storage.getItem('library'), storage.getItem('library_recent'), storage.getItem('search_history')]).toEqual([null, null, null]);
        expect([storage.getItem('library@p1'), storage.getItem('search_history@p1')]).toEqual(['{"dana":1}', '["psycho"]']);
        expect(storage.getItem('profile')).toBe('{"settings":"shared"}');
        expect(stateOf(storage)).toMatchObject({ familyNight: true, loved: [], bucket: [], history: [], lock: { enabled: true, fromFear: 3, pin } });
        expect(pin).not.toBeNull();
    });

    test('and coming back finds everything as it was left', () => {
        const storage = start();
        const before = new Map(storage.map);
        requestSwitch(storage, 'p2');
        applyPending(storage);
        storage.setItem('library', '{"noa":1}');
        storage.setItem(STORAGE_KEY, JSON.stringify({ ...stateOf(storage), loved: ['tt0054215'] }));
        requestSwitch(storage, 'p1');
        expect(applyPending(storage)).toBe(true);
        expect([storage.getItem('library'), storage.getItem('library_recent'), storage.getItem('search_history')]).toEqual(['{"dana":1}', '{"dana":2}', '["psycho"]']);
        expect(stateOf(storage)).toMatchObject({ loved: ['tt0081505'], bucket: ['tt0070047'], history: [{ id: 'tt0081505', at: 5 }] });
        expect(storage.getItem('library@p2')).toBe('{"noa":1}');
        expect(JSON.parse(storage.getItem('scary.lists@p2') ?? '{}').loved).toEqual(['tt0054215']);
        expect([...storage.map.keys()].filter((key) => key.endsWith('@p1'))).toEqual([]);
        expect(stateOf(storage)).toEqual(sanitize(JSON.parse(before.get(STORAGE_KEY) ?? 'null')));
    });

    test('a parked list that was tampered with is read like any outside input', () => {
        const storage = start();
        storage.setItem('scary.lists@p2', JSON.stringify({ loved: ['<script>', 'tt0054215'], bucket: 'x', lock: { enabled: false, pin: null }, familyNight: false }));
        requestSwitch(storage, 'p2');
        applyPending(storage);
        expect(stateOf(storage)).toMatchObject({ loved: ['tt0054215'], bucket: [], familyNight: true, lock: { enabled: true } });
    });

    test('a full storage changes nothing and drops the request', () => {
        const storage = memory(Object.fromEntries(start().map), (key) => key === 'library_recent@p1');
        requestSwitch(storage, 'p2');
        expect(applyPending(storage)).toBe(false);
        expect(readProfilesState(storage)).toMatchObject({ activeId: 'p1', pending: null });
        expect(storage.getItem('library')).toBe('{"dana":1}');
        expect([...storage.map.keys()].filter((key) => key.includes('@'))).toEqual([]);
    });

    test('a failure while the arriving profile is put in place goes back to the one on screen', () => {
        const base = start();
        base.setItem('library@p2', '{"noa":1}');
        base.setItem('library_recent@p2', '{"noa":2}');
        let failed = false;
        const storage = memory(Object.fromEntries(base.map), (key) => {
            if (key !== 'library_recent' || failed) return false;
            failed = true;
            return true;
        });
        requestSwitch(storage, 'p2');
        expect(applyPending(storage)).toBe(false);
        expect(readProfilesState(storage).activeId).toBe('p1');
        expect([storage.getItem('library'), storage.getItem('library_recent')]).toEqual(['{"dana":1}', '{"dana":2}']);
        expect(storage.getItem('library@p2')).toBe('{"noa":1}');
        expect(stateOf(storage).loved).toEqual(['tt0081505']);
    });

    test('removing the profile on screen goes to the first, and nothing of the removed one is kept', () => {
        const storage = start();
        requestSwitch(storage, 'p2');
        applyPending(storage);
        storage.setItem('library', '{"noa":1}');
        const profiles = createProfilesStore(storage);
        expect(profiles.remove('p2')).toBe('restart');
        expect(applyPending(storage)).toBe(true);
        expect(readProfilesState(storage)).toMatchObject({ activeId: 'p1', pending: null, list: [{ id: 'p1', name: 'Dana' }] });
        expect(storage.getItem('library')).toBe('{"dana":1}');
        expect([...storage.map.keys()].filter((key) => key.includes('@'))).toEqual([]);
        expect([...storage.map.values()].some((value) => value.includes('noa'))).toBe(false);
    });
});

describe('the profiles of this browser', () => {
    test('are added, changed and removed; a parked profile is removed at once, with its lists', () => {
        const storage = memory({ 'library@p2': '{"old":1}', 'scary.lists@p2': '{"loved":["tt0054215"]}' });
        const profiles = createProfilesStore(storage);
        let told = 0;
        profiles.subscribe(() => told++);
        expect(profiles.add('  ', 0, false)).toBeNull();
        const added = profiles.add('Noa', 1, true);
        expect(added).toEqual({ id: 'p2', name: 'Noa', colour: 1, gentle: true });
        // The id had been someone's before: nothing of theirs is left for the new profile.
        expect([storage.getItem('library@p2'), storage.getItem('scary.lists@p2')]).toEqual([null, null]);
        expect(profiles.update('p2', 'Noa B', 2, false)).toBe(true);
        expect(profiles.getState().list[1]).toEqual({ id: 'p2', name: 'Noa B', colour: 2, gentle: false });
        expect(profiles.choose('p1')).toBe(false);
        expect(profiles.choose('p4')).toBe(false);
        storage.setItem('library@p2', '{"noa":1}');
        expect(profiles.remove('p1')).toBeNull();
        expect(profiles.remove('p2')).toBe('removed');
        expect(storage.getItem('library@p2')).toBeNull();
        expect(profiles.getState().list).toHaveLength(1);
        expect(told).toBe(3);
    });

    test('without a storage there is one profile and nothing can be changed', () => {
        const profiles = createProfilesStore(null);
        expect(profiles.getState()).toMatchObject({ activeId: FIRST, pending: null });
        expect([profiles.add('Noa', 0, false), profiles.update('p1', 'x', 0, false), profiles.remove('p2'), profiles.choose('p2'), profiles.start()]).toEqual([null, false, null, false, false]);
    });
});

describe('a backup file and profiles', () => {
    test('holds the profile on screen only: no names, no parked profiles', () => {
        const storage = memory({ [PROFILES_KEY]: two, library: '{"dana":1}', 'library@p2': '{"noa":1}', 'scary.lists@p2': '{}', [STORAGE_KEY]: '{}' });
        const backup = createBackup(storage, new Date(0));
        expect(Object.keys(backup.storage).sort()).toEqual(['library', STORAGE_KEY].sort());
        expect(JSON.stringify(backup)).not.toContain('Noa');
    });

    test('cannot change who the profiles are', () => {
        const storage = memory({ [PROFILES_KEY]: two, [STORAGE_KEY]: '{}' });
        restoreBackup(storage, { [PROFILES_KEY]: '{"list":[],"active":"p1"}', library: '{"x":1}' });
        expect(storage.getItem(PROFILES_KEY)).toBe(two);
        expect(storage.getItem('library')).toBe('{"x":1}');
    });
});
