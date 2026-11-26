// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Reads SCARY's film feed (feed.json) as untrusted input. The rules and limits are those of SCARY for Android TV
// (core FilmFeed.kt): a file that is too large, of another version or with too few films is refused whole; inside a
// good file, a film that breaks a rule is dropped and counted, and a row is kept only with the films that are left.

import { LANGUAGES, ROW_LABELS, SUBGENRE_LABELS } from './labels.ts';
import type { Language } from './labels.ts';

export const SUPPORTED_VERSION = 1;
export const MAX_CHARS = 3_000_000;
export const MIN_FILMS = 1_000;
export const MAX_FILMS = 12_000;
export const MAX_ROWS = 40;
export const MAX_ROW_FILMS = 80;
export const MIN_ROW_FILMS = 8;
const MAX_TITLE = 120;
const MAX_NAME = 80;
const MAX_GENRES = 6;
const FIRST_FILM_YEAR = 1895;
const IMDB_PATTERN = /^tt\d{7,8}$/;
const GENRE_PATTERN = /^[A-Za-z][A-Za-z -]{1,23}$/;
const ROW_ID_PATTERN = /^[a-z][a-z_]{1,31}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// Control characters and the characters that override the direction of text.
const UNSAFE_TEXT = /[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/;

export type FilmType = 'movie' | 'series';

export type Film = {
    imdb: string,
    type: FilmType,
    /** Horror unless the feed marks the film as a thriller. */
    thriller: boolean,
    titles: Partial<Record<Language, string>> & { en: string },
    year: number,
    endYear: number | null,
    ongoing: boolean,
    director: string,
    minutes: number,
    rating: number | null,
    prominence: number,
    subgenres: string[],
    genres: string[],
    /** SCARY's hand-given scare level, 1 to 5; null for a film nobody rated. Never made up. */
    fear: number | null,
};

export type Row = { id: string, films: string[] };

export type Feed = {
    generated: string,
    films: Film[],
    rows: Row[],
    droppedFilms: number,
    droppedRows: number,
};

export class FeedError extends Error {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** One line of plain text within `max` characters, or null. */
const clean = (value: unknown, max: number): string | null => {
    if (typeof value !== 'string' || UNSAFE_TEXT.test(value)) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
};

const toFilm = (entry: unknown, thisYear: number): Omit<Film, 'fear'> | null => {
    if (!isRecord(entry)) return null;
    const { imdb, t, y, d, s, g, r, m, k, e, on, p } = entry;
    if (typeof imdb !== 'string' || !IMDB_PATTERN.test(imdb)) return null;
    if (typeof y !== 'number' || !Number.isInteger(y) || y < FIRST_FILM_YEAR || y > thisYear) return null;
    if (!isRecord(t)) return null;
    const titles: Partial<Record<Language, string>> = {};
    for (const [language, title] of Object.entries(t)) {
        if (!(LANGUAGES as readonly string[]).includes(language)) return null;
        const cleaned = clean(title, MAX_TITLE);
        if (cleaned === null) return null;
        titles[language as Language] = cleaned;
    }
    if (typeof titles.en !== 'string') return null;
    let director = '';
    if (d !== undefined && d !== null) {
        const cleaned = clean(d, MAX_NAME);
        if (cleaned === null) return null;
        director = cleaned;
    }
    const genres = g === undefined ? [] : g;
    if (!Array.isArray(genres) || genres.length > MAX_GENRES) return null;
    if (genres.some((genre) => typeof genre !== 'string' || !GENRE_PATTERN.test(genre))) return null;
    if (r !== undefined && r !== null && (typeof r !== 'number' || !(r > 0 && r <= 10))) return null;
    // A kind this version does not know is not shown as something it is not.
    if (k !== undefined && k !== null && k !== 'thriller' && k !== 'series') return null;
    const series = k === 'series';
    if (e !== undefined && e !== null) {
        if (!series || typeof e !== 'number' || !Number.isInteger(e) || e < y || e > 2100) return null;
    }
    const endYear = typeof e === 'number' ? e : null;
    // Unknown subgenres are skipped, not refused: a newer feed may know some this version does not.
    const subgenres = Array.isArray(s)
        ? [...new Set(s.filter((name): name is string => typeof name === 'string' && Object.hasOwn(SUBGENRE_LABELS, name)))]
        : [];
    return {
        imdb,
        type: series ? 'series' : 'movie',
        thriller: k === 'thriller',
        titles: titles as Film['titles'],
        year: y,
        endYear,
        ongoing: series && on === true && endYear === null,
        director,
        minutes: typeof m === 'number' && Number.isInteger(m) && m >= 1 && m <= 600 ? m : 0,
        rating: typeof r === 'number' ? r : null,
        prominence: typeof p === 'number' && Number.isFinite(p) && p > 0 ? p : 0,
        subgenres,
        genres: genres as string[],
    };
};

/** SCARY's hand-given scare levels by IMDb id, from legacy.json. A file that is not what it should be gives none. */
export const parseFearLevels = (text: string): Map<string, number> => {
    const levels = new Map<string, number>();
    let file: unknown;
    try {
        file = JSON.parse(text);
    } catch {
        return levels;
    }
    if (!isRecord(file) || !isRecord(file.films)) return levels;
    for (const entry of Object.values(file.films)) {
        if (!isRecord(entry)) continue;
        const { imdb, fear } = entry;
        if (typeof imdb === 'string' && IMDB_PATTERN.test(imdb) && typeof fear === 'number' && Number.isInteger(fear) && fear >= 1 && fear <= 5) {
            levels.set(imdb, fear);
        }
    }
    return levels;
};

/** Parses the feed. Throws FeedError when the file as a whole is not a feed this version can use. */
export const parseFeed = (text: string, fearLevels: Map<string, number> = new Map(), thisYear: number = new Date().getUTCFullYear()): Feed => {
    if (text.length > MAX_CHARS) throw new FeedError(`feed too large: ${text.length} characters`);
    let file: unknown;
    try {
        file = JSON.parse(text);
    } catch (error) {
        throw new FeedError(`malformed feed json: ${(error as Error).message}`);
    }
    if (!isRecord(file)) throw new FeedError('feed is not an object');
    if (file.version !== SUPPORTED_VERSION) throw new FeedError(`unsupported feed version ${String(file.version)}`);
    if (typeof file.generated !== 'string' || !DATE_PATTERN.test(file.generated)) throw new FeedError('feed without a date');
    const entries = Array.isArray(file.films) ? file.films : [];
    const rowEntries = Array.isArray(file.rows) ? file.rows : [];
    if (entries.length > MAX_FILMS || rowEntries.length > MAX_ROWS) throw new FeedError('feed with too many films or rows');

    const seen = new Set<string>();
    const films: Film[] = [];
    let droppedFilms = 0;
    for (const entry of entries) {
        const film = toFilm(entry, thisYear);
        if (film === null || seen.has(film.imdb)) {
            droppedFilms++;
            continue;
        }
        seen.add(film.imdb);
        films.push({ ...film, fear: fearLevels.get(film.imdb) ?? null });
    }
    if (films.length < MIN_FILMS) throw new FeedError(`feed with too few films: ${films.length}`);

    const rowIds = new Set<string>();
    const rows: Row[] = [];
    let droppedRows = 0;
    for (const entry of rowEntries) {
        const id = isRecord(entry) ? entry.id : undefined;
        const ids = isRecord(entry) && Array.isArray(entry.films)
            ? [...new Set(entry.films.filter((imdb): imdb is string => typeof imdb === 'string' && seen.has(imdb)))].slice(0, MAX_ROW_FILMS)
            : [];
        // A row needs a name this version holds: the feed never supplies the words shown on the screen.
        if (typeof id === 'string' && ROW_ID_PATTERN.test(id) && Object.hasOwn(ROW_LABELS, id) && ids.length >= MIN_ROW_FILMS && !rowIds.has(id)) {
            rowIds.add(id);
            rows.push({ id, films: ids });
        } else {
            droppedRows++;
        }
    }
    return { generated: file.generated, films, rows, droppedFilms, droppedRows };
};
