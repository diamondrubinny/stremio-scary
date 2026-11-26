// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// "What do you feel like tonight?" and "Or choose a decade", by the rules of SCARY for Android TV (Moods.kt).
// A mood picks only from the films somebody rated by hand. The same rules build the mood catalogs (feed/src/moods.ts).

import { decadeOf, isRated, isSeries, minutesOf } from './film';
import type { Film } from './film';

const MOOD_IDS = ['gentle', 'mind_games', 'ghosts', 'blood', 'classics', 'relentless', 'short'] as const;
type MoodId = typeof MOOD_IDS[number];

const CLASSIC_BEFORE = 1990;
const SHORT_MAX_MINUTES = 90;
const MIN_DECADE_FILMS = 3;
const MAX_MORE = 150;
const SPIRITS = ['supernatural', 'possession', 'ghost', 'folk', 'haunted_house'];
const VISCERAL = ['slasher', 'creature', 'survival', 'zombie', 'body', 'vampire'];

const has = (film: Film, subgenres: string[]): boolean => (film.s ?? []).some((subgenre) => subgenres.includes(subgenre));

const moodMatches = (mood: MoodId, film: Film): boolean => {
    if (!isRated(film) || isSeries(film)) return false;
    switch (mood) {
        case 'gentle': return film.f <= 2;
        case 'mind_games': return has(film, ['psychological', 'mystery']);
        case 'ghosts': return has(film, SPIRITS);
        case 'blood': return film.f >= 3 && has(film, VISCERAL);
        case 'classics': return film.y < CLASSIC_BEFORE;
        case 'relentless': return film.f >= 4;
        case 'short': return minutesOf(film) >= 1 && minutesOf(film) <= SHORT_MAX_MINUTES;
    }
};

/** The scariest first for "relentless", the shortest first for "short"; otherwise the library's own order. */
const pickMood = (films: Film[], mood: MoodId): Film[] => {
    const matching = films.filter((film) => moodMatches(mood, film));
    if (mood === 'relentless') return matching.sort((a, b) => (b.f ?? 0) - (a.f ?? 0));
    if (mood === 'short') return matching.sort((a, b) => minutesOf(a) - minutesOf(b));
    return matching;
};

/** Decades with enough rated films, oldest first, so no chip leads to a near-empty row. */
const availableDecades = (films: Film[]): number[] => {
    const counts = new Map<number, number>();
    for (const film of films) {
        if (isRated(film) && !isSeries(film)) counts.set(decadeOf(film), (counts.get(decadeOf(film)) ?? 0) + 1);
    }
    return [...counts].filter(([, count]) => count >= MIN_DECADE_FILMS).map(([decade]) => decade).sort((a, b) => a - b);
};

/**
 * Films for a mood, a decade, or both; nothing chosen, nothing shown. A decade alone gives its rated films in order of
 * year, then up to 150 more films of that decade, best known first (the library's own order).
 */
const pickTonight = (films: Film[], mood: MoodId | null, decade: number | null): Film[] => {
    if (mood === null && decade === null) return [];
    if (mood === null) {
        const ofDecade = films.filter((film) => !isSeries(film) && decadeOf(film) === decade);
        return [...ofDecade.filter(isRated).sort((a, b) => a.y - b.y), ...ofDecade.filter((film) => !isRated(film)).slice(0, MAX_MORE)];
    }
    const picked = pickMood(films, mood);
    return decade === null ? picked : picked.filter((film) => decadeOf(film) === decade);
};

export { MOOD_IDS, availableDecades, moodMatches, pickMood, pickTonight };
export type { MoodId };
