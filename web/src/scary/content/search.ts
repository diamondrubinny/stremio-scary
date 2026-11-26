// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Search in SCARY's own library, in the browser: what a viewer types never leaves it. Titles are matched in all five
// languages at once, so "הניצוץ", "Сияние" and "shining" find the same film.

import type { FeedLanguage } from './addon';

type IndexFilm = {
    id: string,
    /** Absent for a horror film; "t" for a thriller, "s" for a series. */
    k?: string,
    t: Partial<Record<FeedLanguage, string>> & { en: string },
    y: number,
    r?: number,
    s?: string[],
    /** SCARY's hand-given scare level, 1 to 5; absent for a film nobody rated. */
    f?: number,
    d?: string,
    /** Length in minutes (a series: of one episode); absent when unknown. */
    m?: number,
};

type SearchResult = { film: IndexFilm, score: number };

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 60;
const MAX_RESULTS = 60;
const IMDB_PATTERN = /^tt\d{7,8}$/;

/** Lower case, without accents, Hebrew points or Arabic marks, with every run of other characters as one space. */
const normalize = (text: string): string => text
    .normalize('NFKD')
    .replace(/[̀-֑ͯ-ׇً-ٰٟـ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/**
 * How well a title answers a query, 0 for not at all: the whole title, then its beginning, then every word of the
 * query beginning a word of the title, then every word found anywhere in it.
 */
const scoreTitle = (title: string, query: string, queryWords: string[]): number => {
    if (title === query) return 100;
    if (title.startsWith(query)) return 80;
    const words = title.split(' ');
    if (queryWords.every((queryWord) => words.some((word) => word.startsWith(queryWord)))) return 60;
    if (queryWords.every((queryWord) => title.includes(queryWord))) return 30;
    return 0;
};

const isIndexFilm = (value: unknown): value is IndexFilm => {
    if (typeof value !== 'object' || value === null) return false;
    const film = value as Record<string, unknown>;
    const titles = film.t as Record<string, unknown> | null | undefined;
    return typeof film.id === 'string' && IMDB_PATTERN.test(film.id) && typeof film.y === 'number' &&
        typeof titles === 'object' && titles !== null && typeof titles.en === 'string' &&
        Object.values(titles).every((title) => typeof title === 'string');
};

/** The films of index.json that are what they should be; anything else in the file is left out. */
const readIndex = (file: unknown): IndexFilm[] => {
    const films = (file as { films?: unknown } | null)?.films;
    return Array.isArray(films) ? films.filter(isIndexFilm) : [];
};

/**
 * The films that answer `text`, best first. Films keep the feed's order (best known first) among equal answers.
 * A director's name finds their films, below every title that matches.
 */
const searchFilms = (films: IndexFilm[], text: string, limit: number = MAX_RESULTS): IndexFilm[] => {
    const query = normalize(text.slice(0, MAX_QUERY_LENGTH));
    if (query.length < MIN_QUERY_LENGTH) return [];
    const queryWords = query.split(' ');
    const results: SearchResult[] = [];
    for (const film of films) {
        let score = 0;
        for (const title of Object.values(film.t)) {
            score = Math.max(score, scoreTitle(normalize(title as string), query, queryWords));
        }
        if (score === 0 && typeof film.d === 'string') {
            score = Math.min(20, scoreTitle(normalize(film.d), query, queryWords));
        }
        if (score === 0 && /^\d{4}$/.test(query) && String(film.y) === query) score = 10;
        if (score > 0) results.push({ film, score });
    }
    // Array.sort is stable, so the feed's order decides between equal scores.
    return results.sort((a, b) => b.score - a.score).slice(0, limit).map(({ film }) => film);
};

export { MAX_RESULTS, MIN_QUERY_LENGTH, normalize, readIndex, searchFilms };
export type { IndexFilm };
