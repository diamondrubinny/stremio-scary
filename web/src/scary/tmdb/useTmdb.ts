// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// TMDB for the screens: a film's cast, makers and stores, and what is coming to cinemas. Asked only when the viewer
// has put their own key in the settings, and each thing once per visit.

import { useEffect, useState } from 'react';
import { useScaryState } from '../hooks';
import { checkRequest, comingSoonRequest, countryOf, detailsRequest, externalIdsRequest, findRequest, readComingSoon, readDetails, readFind, readImdbId } from './client';
import type { Details, Request, TmdbKind, Upcoming } from './client';

type KeyCheck = 'ok' | 'rejected' | 'unreachable';
type ComingFilm = Upcoming & { imdbId: string };

const ask = async ({ url, headers }: Request): Promise<unknown> => {
    const response = await fetch(url, { headers, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error(String(response.status));
    return response.json();
};

/** Asks TMDB whether it accepts the key. */
const checkKey = async (key: string): Promise<KeyCheck> => {
    try {
        const { url, headers } = checkRequest(key);
        const response = await fetch(url, { headers, credentials: 'omit', referrerPolicy: 'no-referrer' });
        return response.ok ? 'ok' : response.status === 401 || response.status === 403 ? 'rejected' : 'unreachable';
    } catch {
        return 'unreachable';
    }
};

const browserCountry = (): string => countryOf(typeof navigator === 'undefined' ? null : navigator.language);

const films = new Map<string, Promise<Details | null>>();

const loadFilm = (key: string, imdbId: string, kind: TmdbKind, country: string): Promise<Details | null> => {
    const cacheKey = `${kind}:${imdbId}:${country}`;
    let film = films.get(cacheKey);
    if (film === undefined) {
        film = ask(findRequest(key, imdbId))
            .then((found) => {
                const id = readFind(found, kind);
                return id === null ? null : ask(detailsRequest(key, kind, id)).then((details) => readDetails(details, country));
            })
            .catch(() => {
                films.delete(cacheKey);
                return null;
            });
        films.set(cacheKey, film);
    }
    return film;
};

/** A film's details from TMDB: null while they load, when there is no key, or when TMDB does not know the film. */
const useTmdbFilm = (imdbId: string | null, series: boolean): { details: Details | null, country: string, enabled: boolean } => {
    const { tmdbKey } = useScaryState();
    const [details, setDetails] = useState<Details | null>(null);
    const country = browserCountry();
    useEffect(() => {
        setDetails(null);
        if (tmdbKey === null || imdbId === null) return;
        let cancelled = false;
        loadFilm(tmdbKey, imdbId, series ? 'tv' : 'movie', country).then((loaded) => !cancelled && setDetails(loaded));
        return () => {
            cancelled = true;
        };
    }, [tmdbKey, imdbId, series, country]);
    return { details, country, enabled: tmdbKey !== null };
};

let coming: Promise<ComingFilm[]> | null = null;

const loadComingSoon = (key: string, country: string): Promise<ComingFilm[]> => {
    if (coming === null) {
        coming = ask(comingSoonRequest(key, new Date().toISOString().slice(0, 10), country))
            .then(readComingSoon)
            // A film's page is found by its IMDb id; a film TMDB has no such id for is left out.
            .then((upcoming) => Promise.all(upcoming.map((film) => ask(externalIdsRequest(key, film.tmdbId)).then(readImdbId, () => null).then((imdbId) => imdbId === null ? null : { ...film, imdbId }))))
            .then((resolved) => resolved.filter((film): film is ComingFilm => film !== null))
            .catch(() => {
                coming = null;
                return [];
            });
    }
    return coming;
};

/** Horror films coming to cinemas; empty without a key. */
const useComingSoon = (wanted: boolean): ComingFilm[] => {
    const { tmdbKey } = useScaryState();
    const [list, setList] = useState<ComingFilm[]>([]);
    useEffect(() => {
        if (!wanted || tmdbKey === null) {
            setList([]);
            return;
        }
        let cancelled = false;
        loadComingSoon(tmdbKey, browserCountry()).then((loaded) => !cancelled && setList(loaded));
        return () => {
            cancelled = true;
        };
    }, [wanted, tmdbKey]);
    return list;
};

/** Forgets what was fetched with the key that is being removed or replaced. */
const forgetTmdb = (): void => {
    films.clear();
    coming = null;
};

export { checkKey, forgetTmdb, useComingSoon, useTmdbFilm };
export type { ComingFilm, KeyCheck };
