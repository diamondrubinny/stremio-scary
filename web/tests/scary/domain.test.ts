// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import type { Film } from '../../src/scary/domain/film';
import { fearStats, moveInList, nextInBucket, pickSeason, seasonsOn, toggleInList } from '../../src/scary/domain/lists';
import { NO_LOCKOUT, afterWrongPin, familyAllows, needsPin, remainingWait, stillUnlocked } from '../../src/scary/domain/lock';
import { availableDecades, pickMood, pickTonight } from '../../src/scary/domain/moods';
import { hashPin, isValidPin, verifyPin } from '../../src/scary/domain/pin';
import { becauseYouLoved, moreLikeThis, similarity } from '../../src/scary/domain/recommender';
import { planTime } from '../../src/scary/domain/timePlan';

let next = 0;
const film = (extra: Partial<Film> = {}): Film => {
    next++;
    return { id: `tt${String(next).padStart(7, '0')}`, t: { en: `Film ${next}` }, y: 2000, ...extra };
};

describe('family night and the parental lock', () => {
    test('family night shows only rated films of fear 1 or 2', () => {
        expect([film({ f: 1 }), film({ f: 2 }), film({ f: 3 }), film(), null, undefined].map(familyAllows)).toEqual([true, true, false, false, false, false]);
    });

    test('the lock asks for the PIN from its level up, and for every film SCARY does not know', () => {
        expect(needsPin(true, false, 3, film({ f: 2 }))).toBe(false);
        expect(needsPin(true, false, 3, film({ f: 3 }))).toBe(true);
        expect(needsPin(true, false, 3, film())).toBe(true);
        expect(needsPin(true, false, 3, null)).toBe(true);
        expect(needsPin(true, true, 3, film({ f: 5 }))).toBe(false);
        expect(needsPin(false, false, 1, film({ f: 5 }))).toBe(false);
    });

    test('one correct PIN opens the lock for half an hour', () => {
        expect(stillUnlocked(1_000, 1_000 + 30 * 60_000)).toBe(true);
        expect(stillUnlocked(1_000, 1_001 + 30 * 60_000)).toBe(false);
        expect(stillUnlocked(2_000, 1_000)).toBe(false);
    });

    test('three free tries, then a wait that doubles up to fifteen minutes', () => {
        let lockout = NO_LOCKOUT;
        lockout = afterWrongPin(lockout, 0);
        lockout = afterWrongPin(lockout, 0);
        expect(remainingWait(lockout, 0)).toBe(0);
        lockout = afterWrongPin(lockout, 0);
        expect(remainingWait(lockout, 0)).toBe(30_000);
        lockout = afterWrongPin(lockout, 0);
        expect(remainingWait(lockout, 0)).toBe(60_000);
        for (let index = 0; index < 20; index++) lockout = afterWrongPin(lockout, 0);
        expect(remainingWait(lockout, 0)).toBe(15 * 60_000);
        expect(remainingWait(lockout, 16 * 60_000)).toBe(0);
    });
});

describe('the PIN', () => {
    test('4 to 8 digits', () => {
        expect(['1234', '12345678', '0000'].map(isValidPin)).toEqual([true, true, true]);
        expect(['123', '123456789', '12a4', '', ' 1234', '١٢٣٤'].map(isValidPin)).toEqual([false, false, false, false, false, false]);
    });

    test('is kept as a salted hash that only the same PIN matches', async () => {
        const stored = await hashPin('2580', 1_000);
        expect(stored).toMatch(/^1000:[A-Za-z0-9+/=]{24}:[A-Za-z0-9+/=]{44}$/);
        expect(stored).not.toContain('2580');
        expect(await hashPin('2580', 1_000)).not.toBe(stored);
        expect(await verifyPin('2580', stored)).toBe(true);
        expect(await verifyPin('2581', stored)).toBe(false);
        expect(await verifyPin('2580', null)).toBe(false);
        expect(await verifyPin('2580', 'garbage')).toBe(false);
        expect(await verifyPin('2580', '0:AAAA:AAAA')).toBe(false);
        expect(await verifyPin('2580', '99999999999:AAAA:AAAA')).toBe(false);
        await expect(hashPin('12')).rejects.toThrow();
    });

    test('reads a hash made by SCARY for Android TV\'s format', async () => {
        // PBKDF2-HMAC-SHA256, 2 iterations, salt "saltsaltsaltsalt", PIN "1234": computed with Node's crypto.pbkdf2Sync.
        const { pbkdf2Sync } = await import('crypto');
        const salt = Buffer.from('saltsaltsaltsalt');
        const stored = `2:${salt.toString('base64')}:${pbkdf2Sync('1234', salt, 2, 32, 'sha256').toString('base64')}`;
        expect(await verifyPin('1234', stored)).toBe(true);
        expect(await verifyPin('4321', stored)).toBe(false);
    });
});

describe('moods and decades', () => {
    const films = [
        film({ f: 1, y: 1975, m: 80, s: ['ghost'] }),
        film({ f: 5, y: 1985, m: 120, s: ['slasher'] }),
        film({ f: 4, y: 1985, m: 95, s: ['psychological'] }),
        film({ f: 3, y: 2010, m: 85, s: ['zombie'] }),
        film({ y: 1985, s: ['slasher'] }),
        film({ f: 5, y: 1985, k: 's', s: ['slasher'] }),
        film({ f: 2, y: 1986, m: 70 }),
        film({ f: 2, y: 1988, m: 0 }),
    ];
    const ids = (list: Film[]) => list.map((entry) => films.indexOf(entry));

    test('each mood picks rated films by its own rule', () => {
        expect(ids(pickMood(films, 'gentle'))).toEqual([0, 6, 7]);
        expect(ids(pickMood(films, 'mind_games'))).toEqual([2]);
        expect(ids(pickMood(films, 'ghosts'))).toEqual([0]);
        expect(ids(pickMood(films, 'blood'))).toEqual([1, 3]);
        expect(ids(pickMood(films, 'classics'))).toEqual([0, 1, 2, 6, 7]);
        expect(ids(pickMood(films, 'relentless'))).toEqual([1, 2]);
        expect(ids(pickMood(films, 'short'))).toEqual([6, 0, 3]);
    });

    test('a decade alone, a mood alone, or both', () => {
        expect(availableDecades(films)).toEqual([1980]);
        expect(pickTonight(films, null, null)).toEqual([]);
        expect(ids(pickTonight(films, null, 1980))).toEqual([1, 2, 6, 7, 4]);
        expect(ids(pickTonight(films, 'gentle', 1980))).toEqual([6, 7]);
        expect(ids(pickTonight(films, 'relentless', null))).toEqual([1, 2]);
    });
});

describe('how much time do you have', () => {
    const films = Array.from({ length: 60 }, (_, index) => film({ f: index % 5 + 1, m: 70 + index * 2 }));

    test('a short evening offers single films that fit', () => {
        const quick = planTime(films, 'quick', { epochDay: 20_000 });
        expect(quick.length).toBeGreaterThanOrEqual(8);
        expect(quick.every((entry) => (entry.m ?? 0) <= 90)).toBe(true);
        const evening = planTime(films, 'evening', { epochDay: 20_000 });
        expect(evening.every((entry) => (entry.m ?? 0) > 90 && (entry.m ?? 0) <= 120)).toBe(true);
    });

    test('a long evening is a lineup that fills it, gentlest first', () => {
        const double = planTime(films, 'double', { epochDay: 20_000 });
        expect(double.length).toBe(2);
        const total = double.reduce((sum, entry) => sum + (entry.m ?? 0), 0);
        expect(total).toBeGreaterThanOrEqual(150);
        expect(total).toBeLessThanOrEqual(210);
        expect((double[0].f ?? 0) <= (double[1].f ?? 0)).toBe(true);
        const marathon = planTime(films, 'marathon', { epochDay: 20_000 });
        expect(marathon.length).toBe(3);
        expect(marathon.reduce((sum, entry) => sum + (entry.m ?? 0), 0)).toBeLessThanOrEqual(300);
    });

    test('the same all day, different the next day, and without what is hidden or excluded', () => {
        const today = planTime(films, 'quick', { epochDay: 20_000 }).map((entry) => entry.id);
        expect(planTime(films, 'quick', { epochDay: 20_000 }).map((entry) => entry.id)).toEqual(today);
        expect(planTime(films, 'quick', { epochDay: 20_001 }).map((entry) => entry.id)).not.toEqual(today);
        expect(planTime(films, 'quick', { epochDay: 20_000, isHidden: () => true })).toEqual([]);
        expect(planTime(films, 'quick', { epochDay: 20_000, exclude: new Set(today) }).some((entry) => today.includes(entry.id))).toBe(false);
        expect(planTime([film(), film({ f: 3 })], 'quick', { epochDay: 1 })).toEqual([]);
    });
});

describe('films like the ones you love', () => {
    const seed = film({ f: 4, y: 1980, d: 'Stanley Kubrick', s: ['psychological', 'haunted_house'] });
    const close = film({ f: 4, y: 1975, d: 'stanley kubrick', s: ['psychological'] });
    const near = film({ f: 3, y: 1985, s: ['haunted_house', 'psychological'] });
    const far = film({ f: 1, y: 2020, s: ['comedy'] });
    const others = Array.from({ length: 4 }, () => film({ f: 4, y: 1982, s: ['haunted_house', 'psychological'] }));
    const all = [seed, close, near, far, ...others];

    test('alike by subgenre first, then director, era and fear', () => {
        expect(similarity(seed, close)).toBe(3 + 3 + 1 + 1 + 2);
        expect(similarity(seed, far)).toBe(1);
        expect(moreLikeThis(all, seed).map((entry) => entry.id)).not.toContain(far.id);
        expect(moreLikeThis(all, seed)[0].id).toBe(close.id);
        expect(moreLikeThis(all, seed, new Set([close.id])).map((entry) => entry.id)).not.toContain(close.id);
    });

    test('a row for the first loved film that has enough like it', () => {
        expect(becauseYouLoved(all, [far.id, seed.id])?.because.id).toBe(seed.id);
        expect(becauseYouLoved(all, [far.id])).toBeNull();
        expect(becauseYouLoved(all, ['tt9999999'])).toBeNull();
        expect(becauseYouLoved(all, [seed.id, close.id])?.films.map((entry) => entry.id)).not.toContain(close.id);
        expect(becauseYouLoved(all, [seed.id], new Set(), () => true)).toBeNull();
    });
});

describe('lists, stats and seasons', () => {
    test('the bucket list keeps its order and its limit', () => {
        expect(toggleInList(['a', 'b'], 'c', 3)).toEqual(['a', 'b', 'c']);
        expect(toggleInList(['a', 'b', 'c'], 'd', 3)).toEqual(['a', 'b', 'c']);
        expect(toggleInList(['a', 'b'], 'a')).toEqual(['b']);
        expect(moveInList(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b']);
        expect(moveInList(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
        expect(moveInList(['a', 'b', 'c'], 'x', 1)).toEqual(['a', 'b', 'c']);
        expect([nextInBucket(['a', 'b'], 'a'), nextInBucket(['a', 'b'], 'b'), nextInBucket(['a', 'b'], 'x'), nextInBucket([], null)]).toEqual(['b', null, 'a', null]);
    });

    test('your year in fear', () => {
        const watched = [film({ f: 5, m: 100, y: 1984, s: ['slasher'] }), film({ f: 3, m: 80, y: 1988, s: ['slasher', 'ghost'] }), film({ m: 60, y: 2001 })];
        const stats = fearStats(watched, 4);
        expect([stats.watched, stats.minutes, stats.averageFear, stats.scariest?.id, stats.favoriteSubgenre, stats.favoriteDecade, stats.loved])
            .toEqual([3, 240, 4, watched[0].id, 'slasher', 1980, 4]);
        expect(fearStats([], 0)).toMatchObject({ watched: 0, averageFear: null, scariest: null, favoriteSubgenre: null, favoriteDecade: null });
    });

    test('Halloween is October; Friday the 13th is its week', () => {
        expect(seasonsOn(new Date(2026, 9, 20))).toEqual(['halloween']);
        expect(seasonsOn(new Date(2026, 10, 13))).toEqual(['friday_13th']);
        expect(seasonsOn(new Date(2026, 10, 7))).toEqual(['friday_13th']);
        expect(seasonsOn(new Date(2026, 10, 6))).toEqual([]);
        expect(seasonsOn(new Date(2026, 10, 14))).toEqual([]);
        const films = [film({ f: 2, s: ['slasher'] }), film({ f: 5, s: ['ghost'] }), film({ s: ['slasher'] }), film({ f: 4, s: ['comedy'] })];
        expect(pickSeason(films, 'halloween').map((entry) => entry.f)).toEqual([5, 2]);
        expect(pickSeason(films, 'friday_13th').map((entry) => entry.f)).toEqual([2]);
    });
});

describe('the week in the calendar', () => {
    test('starts on the day it starts on in the interface language', () => {
        const { leadingDays, weekDaysFrom, weekStartOf } = jest.requireActual('../../src/scary/domain/week') as typeof import('../../src/scary/domain/week');
        expect(['he-IL', 'en-US', 'pt-BR', 'ar-AR', 'ru-RU', 'pt-PT', '', null].map(weekStartOf)).toEqual([6, 6, 6, 5, 0, 0, 0, 0]);
        expect(weekDaysFrom(6)).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
        expect(weekDaysFrom(5)[0]).toBe('Saturday');
        expect(weekDaysFrom(0)[0]).toBe('Monday');
        // November 2026 starts on a Sunday (6, counting from Monday).
        expect([leadingDays(6, 0), leadingDays(6, 6), leadingDays(6, 5)]).toEqual([6, 0, 1]);
        expect([leadingDays(0, 6), leadingDays(2, 5), leadingDays(9, 6), leadingDays('x', 6)]).toEqual([1, 4, 0, 0]);
    });
});
