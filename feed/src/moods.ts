// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// "What do you feel like tonight?": SCARY's moods, by the rules of SCARY for Android TV (core Moods.kt). A mood picks
// only from the films somebody rated by hand (those with a scare level), by that level, by subgenre, by length or
// by era. "Slow-burn dread" is left out: it goes by an editorial tag the feed does not carry.

import { MOOD_LABELS } from './labels.ts';
import type { Film } from './validate.ts';

const CLASSIC_BEFORE = 1990;
const SHORT_MAX_MINUTES = 90;
/** A mood shows at most this many films: one page of a catalog. */
export const MAX_MOOD_FILMS = 100;
/** A mood with fewer films than this is not offered. */
export const MIN_MOOD_FILMS = 8;
const SPIRITS = new Set(['supernatural', 'possession', 'ghost', 'folk', 'haunted_house']);
const VISCERAL = new Set(['slasher', 'creature', 'survival', 'zombie', 'body', 'vampire']);

type Rated = Film & { fear: number };

const MATCHES: Record<string, (film: Rated) => boolean> = {
    gentle: (film) => film.fear <= 2,
    mind_games: (film) => film.subgenres.some((subgenre) => subgenre === 'psychological' || subgenre === 'mystery'),
    ghosts: (film) => film.subgenres.some((subgenre) => SPIRITS.has(subgenre)),
    blood: (film) => film.fear >= 3 && film.subgenres.some((subgenre) => VISCERAL.has(subgenre)),
    classics: (film) => film.year < CLASSIC_BEFORE,
    relentless: (film) => film.fear >= 4,
    short: (film) => film.minutes >= 1 && film.minutes <= SHORT_MAX_MINUTES,
};

export type Mood = { id: string, films: Film[] };

/**
 * The moods that have enough films, in the order of SCARY's chips. Films only (a series has no evening's length).
 * The scariest come first for "relentless" and the shortest for "short"; otherwise the feed's own order is kept.
 */
export const pickMoods = (films: Film[]): Mood[] => {
    const rated = films.filter((film): film is Rated => film.type === 'movie' && film.fear !== null);
    const moods: Mood[] = [];
    for (const id of Object.keys(MOOD_LABELS)) {
        const matches = MATCHES[id];
        if (matches === undefined) continue;
        const matching = rated.filter(matches);
        if (id === 'relentless') matching.sort((a, b) => b.fear - a.fear);
        if (id === 'short') matching.sort((a, b) => a.minutes - b.minutes);
        if (matching.length >= MIN_MOOD_FILMS) moods.push({ id, films: matching.slice(0, MAX_MOOD_FILMS) });
    }
    return moods;
};
