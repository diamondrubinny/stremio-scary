// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// "Because you loved…" and "More like this", by the rules of SCARY for Android TV (Recommender.kt): films are alike
// by subgenre first, then director, kind, era and how frightening they are.

import { isThriller } from './film';
import type { Film } from './film';

const MAX_SEEDS = 20;
const MIN_SCORE = 5;
const MIN_FILMS = 3;
const MAX_FILMS = 15;
const MORE_LIKE_THIS = 20;
const DECADE = 10;

const directorsOf = (film: Film): string[] => (film.d ?? '').split(',').map((name) => name.trim().toLowerCase()).filter((name) => name.length > 0);

const similarity = (seed: Film, other: Film): number => {
    let score = 3 * (other.s ?? []).filter((subgenre) => (seed.s ?? []).includes(subgenre)).length;
    const directors = directorsOf(other);
    if (directorsOf(seed).some((name) => directors.includes(name))) score += 3;
    if (isThriller(seed) === isThriller(other) && seed.k === other.k) score += 1;
    if (Math.abs(seed.y - other.y) <= DECADE) score += 1;
    if (typeof seed.f === 'number' && typeof other.f === 'number') score += Math.max(0, 2 - Math.abs(seed.f - other.f));
    return score;
};

const alike = (films: Film[], seed: Film, exclude: ReadonlySet<string>, isHidden: (film: Film) => boolean, limit: number, minScore: number): Film[] => films
    .filter((film) => film.id !== seed.id && !exclude.has(film.id) && !isHidden(film))
    .map((film) => ({ film, score: similarity(seed, film) }))
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score || a.film.id.localeCompare(b.film.id))
    .slice(0, limit)
    .map(({ film }) => film);

type Recommendation = { because: Film, films: Film[] };

/** A row for the most recently loved film that has enough films like it; null when none has. */
const becauseYouLoved = (films: Film[], lovedIds: string[], exclude: ReadonlySet<string> = new Set(), isHidden: (film: Film) => boolean = () => false): Recommendation | null => {
    const byId = new Map(films.map((film) => [film.id, film]));
    const skip = new Set([...lovedIds, ...exclude]);
    for (const id of lovedIds.slice(0, MAX_SEEDS)) {
        const seed = byId.get(id);
        if (seed === undefined) continue;
        const picks = alike(films, seed, skip, isHidden, MAX_FILMS, MIN_SCORE);
        if (picks.length >= MIN_FILMS) return { because: seed, films: picks };
    }
    return null;
};

/** Up to twenty films like `seed`, the closest first. */
const moreLikeThis = (films: Film[], seed: Film, exclude: ReadonlySet<string> = new Set(), isHidden: (film: Film) => boolean = () => false): Film[] =>
    alike(films, seed, exclude, isHidden, MORE_LIKE_THIS, MIN_SCORE);

export { becauseYouLoved, moreLikeThis, similarity };
export type { Recommendation };
