// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Turns the checked feed into the files of a static Stremio add-on: a manifest and catalog pages, one set per
// language. Catalogs only: no streams, no sources. Film pages and images come from Cinemeta, by IMDb id.

import { ADDON_DESCRIPTIONS, ALL_FILMS_LABELS, ALL_SERIES_LABELS, LANGUAGES, ROW_LABELS, SUBGENRE_LABELS } from './labels.ts';
import type { Language } from './labels.ts';
import type { Feed, Film, FilmType } from './validate.ts';

export const ADDON_ID = 'network.scary.catalogs';
export const PAGE_SIZE = 100;
/** A subgenre with fewer films than this is not offered as a filter. */
export const MIN_GENRE_FILMS = 8;
export const ALL_CATALOG: Record<FilmType, string> = { movie: 'scary_movies', series: 'scary_series' };

export type MetaPreview = {
    id: string,
    type: FilmType,
    name: string,
    poster: string,
    posterShape: 'poster',
    releaseInfo: string,
    imdbRating?: string,
    genres: string[],
    runtime?: string,
    /** Wide artwork and the title's logo: only on the films of home rows, which is where the spotlight draws from. */
    background?: string,
    logo?: string,
};

type CatalogExtra = { name: string, isRequired?: boolean, options?: string[] };
type ManifestCatalog = { type: FilmType, id: string, name: string, extra?: CatalogExtra[] };

export type Manifest = {
    id: string,
    version: string,
    name: string,
    description: string,
    resources: string[],
    types: FilmType[],
    idPrefixes: string[],
    catalogs: ManifestCatalog[],
    behaviorHints: Record<string, never>,
};

/** The whole output: file path (relative, forward slashes) to the JSON value written there. */
export type Files = Map<string, unknown>;

const releaseInfo = (film: Film): string => {
    if (film.type !== 'series') return String(film.year);
    if (film.ongoing) return `${film.year}-`;
    return film.endYear !== null && film.endYear > film.year ? `${film.year}-${film.endYear}` : String(film.year);
};

export const toMeta = (film: Film, language: Language, withArtwork: boolean = false): MetaPreview => ({
    id: film.imdb,
    type: film.type,
    name: film.titles[language] ?? film.titles.en,
    // Built from the IMDb id only, never taken from the feed: the address Cinemeta's own films carry.
    poster: `https://images.metahub.space/poster/small/${film.imdb}/img`,
    posterShape: 'poster',
    releaseInfo: releaseInfo(film),
    ...(film.rating !== null ? { imdbRating: film.rating.toFixed(1) } : {}),
    genres: [film.thriller ? 'Thriller' : 'Horror', ...film.genres],
    ...(film.minutes > 0 ? { runtime: `${film.minutes} min` } : {}),
    ...(withArtwork ? {
        background: `https://images.metahub.space/background/medium/${film.imdb}/img`,
        logo: `https://images.metahub.space/logo/medium/${film.imdb}/img`,
    } : {}),
});

/**
 * Horror before thrillers; then best known first; then the better rated; then by id, so the order never depends on
 * the feed's own order.
 */
const byProminence = (a: Film, b: Film): number =>
    Number(a.thriller) - Number(b.thriller) || b.prominence - a.prominence || (b.rating ?? 0) - (a.rating ?? 0) || a.imdb.localeCompare(b.imdb);

/**
 * The pages of one list, under `base`. The first page is `base.json` (or `base/genre=x.json`); later pages add
 * `skip`. stremio-core asks for `skip=100&genre=x`, other clients for `genre=x&skip=100`: both are written. One empty
 * page ends every list, so a client that asks past the end gets an answer rather than an error.
 */
const writePages = (files: Files, base: string, films: Film[], language: Language, genre?: string): void => {
    for (let skip = 0; skip <= films.length; skip += PAGE_SIZE) {
        const page = { metas: films.slice(skip, skip + PAGE_SIZE).map((film) => toMeta(film, language)) };
        if (skip === 0) {
            files.set(genre === undefined ? `${base}.json` : `${base}/genre=${genre}.json`, page);
        } else if (genre === undefined) {
            files.set(`${base}/skip=${skip}.json`, page);
        } else {
            files.set(`${base}/skip=${skip}&genre=${genre}.json`, page);
            files.set(`${base}/genre=${genre}&skip=${skip}.json`, page);
        }
    }
    if (films.length === 0) return;
    if (films.length % PAGE_SIZE !== 0) {
        // The loop above ended on a partial page; add the empty page after it.
        const end = Math.ceil(films.length / PAGE_SIZE) * PAGE_SIZE;
        const empty = { metas: [] };
        if (genre === undefined) {
            files.set(`${base}/skip=${end}.json`, empty);
        } else {
            files.set(`${base}/skip=${end}&genre=${genre}.json`, empty);
            files.set(`${base}/genre=${genre}&skip=${end}.json`, empty);
        }
    }
};

/** `1.<yyyymmdd>.0`: a valid version that grows with every feed, so clients see the add-on changed. */
const versionOf = (generated: string): string => `1.${generated.replaceAll('-', '')}.0`;

export const buildLanguage = (feed: Feed, language: Language): Files => {
    const files: Files = new Map();
    const byId = new Map(feed.films.map((film) => [film.imdb, film]));
    const catalogs: ManifestCatalog[] = [];

    for (const row of feed.rows) {
        const films = row.films.map((imdb) => byId.get(imdb)).filter((film): film is Film => film !== undefined);
        // A row is of one type: the one most of its films have.
        const type: FilmType = films.filter((film) => film.type === 'series').length * 2 > films.length ? 'series' : 'movie';
        const ofType = films.filter((film) => film.type === type);
        if (ofType.length === 0) continue;
        const id = `scary_${row.id}`;
        catalogs.push({ type, id, name: ROW_LABELS[row.id][language] });
        files.set(`catalog/${type}/${id}.json`, { metas: ofType.map((film) => toMeta(film, language, true)) });
    }

    for (const type of ['movie', 'series'] as const) {
        const all = feed.films.filter((film) => film.type === type).sort(byProminence);
        if (all.length === 0) continue;
        const base = `catalog/${type}/${ALL_CATALOG[type]}`;
        writePages(files, base, all, language);
        const bySubgenre = new Map<string, Film[]>();
        for (const film of all) {
            for (const subgenre of film.subgenres) {
                bySubgenre.set(subgenre, [...(bySubgenre.get(subgenre) ?? []), film]);
            }
        }
        const options = [...bySubgenre.keys()].filter((name) => bySubgenre.get(name)!.length >= MIN_GENRE_FILMS).sort();
        for (const name of options) writePages(files, base, bySubgenre.get(name)!, language, name);
        catalogs.push({
            type,
            id: ALL_CATALOG[type],
            name: (type === 'movie' ? ALL_FILMS_LABELS : ALL_SERIES_LABELS)[language],
            extra: [...(options.length > 0 ? [{ name: 'genre', options }] : []), { name: 'skip' }],
        });
    }

    const manifest: Manifest = {
        id: ADDON_ID,
        version: versionOf(feed.generated),
        name: 'SCARY',
        description: ADDON_DESCRIPTIONS[language],
        resources: ['catalog'],
        types: ['movie', 'series'],
        idPrefixes: ['tt'],
        catalogs,
        behaviorHints: {},
    };
    files.set('manifest.json', manifest);
    return files;
};

/** What the app's own search and film pages read: every film, with its titles in every language and its scare level. */
export const buildIndex = (feed: Feed): unknown => ({
    version: 1,
    generated: feed.generated,
    films: feed.films.map((film) => ({
        id: film.imdb,
        ...(film.type === 'series' ? { k: 's' } : film.thriller ? { k: 't' } : {}),
        t: film.titles,
        y: film.year,
        ...(film.rating !== null ? { r: film.rating } : {}),
        ...(film.subgenres.length > 0 ? { s: film.subgenres } : {}),
        ...(film.fear !== null ? { f: film.fear } : {}),
        ...(film.director !== '' ? { d: film.director } : {}),
    })),
});

/** Every file of the build: `<language>/…` for each language, `index.json`, and the names of the subgenres. */
export const buildAll = (feed: Feed): Files => {
    const files: Files = new Map();
    for (const language of LANGUAGES) {
        for (const [path, value] of buildLanguage(feed, language)) files.set(`${language}/${path}`, value);
    }
    files.set('index.json', buildIndex(feed));
    files.set('labels.json', { subgenres: SUBGENRE_LABELS });
    return files;
};
