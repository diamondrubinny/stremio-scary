// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The viewer's small lists and what is worked out from them, by the rules of SCARY for Android TV (BucketList.kt,
// FearStats.kt, Moods.kt's seasons). Everything here is computed in the browser, from what the browser holds.

import { decadeOf, isRated, isSeries, minutesOf } from './film';
import type { Film } from './film';

const BUCKET_MAX = 30;

const toggleInList = (list: string[], id: string, max: number = Number.MAX_SAFE_INTEGER): string[] =>
    list.includes(id) ? list.filter((other) => other !== id) : list.length >= max ? list : [...list, id];

const moveInList = (list: string[], id: string, by: number): string[] => {
    const from = list.indexOf(id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= list.length) return list;
    const moved = [...list];
    moved.splice(to, 0, ...moved.splice(from, 1));
    return moved;
};

/** The film after `id` in the bucket list; the first one when `id` is not in it; null at the end. */
const nextInBucket = (list: string[], id: string | null): string | null => {
    const index = id === null ? -1 : list.indexOf(id);
    return list[index < 0 ? 0 : index + 1] ?? null;
};

type FearStats = {
    watched: number,
    minutes: number,
    averageFear: number | null,
    scariest: Film | null,
    favoriteSubgenre: string | null,
    favoriteDecade: number | null,
    loved: number,
};

const mostCommon = <T>(values: T[]): T | null => {
    const counts = new Map<T, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    let best: T | null = null;
    for (const [value, count] of counts) {
        if (best === null || count > (counts.get(best) ?? 0)) best = value;
    }
    return best;
};

/** "Your year in fear": what the watched films add up to. */
const fearStats = (watched: Film[], loved: number): FearStats => {
    const rated = watched.filter(isRated);
    return {
        watched: watched.length,
        minutes: watched.reduce((total, film) => total + minutesOf(film), 0),
        averageFear: rated.length > 0 ? rated.reduce((total, film) => total + film.f, 0) / rated.length : null,
        scariest: rated.reduce<Film | null>((best, film) => best === null || film.f > (best.f ?? 0) ? film : best, null),
        favoriteSubgenre: mostCommon(watched.flatMap((film) => film.s ?? [])),
        favoriteDecade: mostCommon(watched.map(decadeOf)),
        loved,
    };
};

type Season = 'halloween' | 'friday_13th';

const HALLOWEEN = ['supernatural', 'possession', 'ghost', 'folk', 'slasher', 'creature', 'zombie', 'vampire', 'haunted_house'];
const FRIDAY = ['slasher', 'survival', 'creature'];
const LEAD_DAYS = 6;

/** The seasons a date is in: the whole of October; the week up to a Friday the 13th and the day itself. */
const seasonsOn = (date: Date): Season[] => {
    const seasons: Season[] = [];
    const thirteenth = new Date(date.getFullYear(), date.getMonth(), 13);
    if (thirteenth.getDay() === 5 && date.getDate() >= 13 - LEAD_DAYS && date.getDate() <= 13) seasons.push('friday_13th');
    if (date.getMonth() === 9) seasons.push('halloween');
    return seasons;
};

/** A season's films: rated, of its subgenres, the scariest first. */
const pickSeason = (films: Film[], season: Season): Film[] => {
    const allowed = season === 'halloween' ? HALLOWEEN : FRIDAY;
    return films
        .filter((film) => isRated(film) && !isSeries(film) && (film.s ?? []).some((subgenre) => allowed.includes(subgenre)))
        .sort((a, b) => (b.f ?? 0) - (a.f ?? 0));
};

export { BUCKET_MAX, fearStats, moveInList, nextInBucket, pickSeason, seasonsOn, toggleInList };
export type { FearStats, Season };
