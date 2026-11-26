// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Search for the Search screen, in SCARY's own library. It answers in the shape the screen already draws (the
// engine's "catalogs with extra"), so the screen itself is unchanged.

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ADDON_ID, feedBaseUrl, feedLanguageOf } from './addon';
import type { FeedLanguage } from './addon';
import { MIN_QUERY_LENGTH, readIndex, searchFilms } from './search';
import type { IndexFilm } from './search';

type Library = { status: 'loading' | 'ready' | 'failed', films: IndexFilm[] };

let library: Promise<IndexFilm[]> | null = null;

/** The library (feed/index.json), downloaded on the first search and kept for the rest of the visit. */
const loadLibrary = (): Promise<IndexFilm[]> => {
    if (library === null) {
        library = fetch(`${feedBaseUrl()}index.json`)
            .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
            .then(readIndex)
            .catch((error: unknown) => {
                library = null;
                throw error;
            });
    }
    return library;
};

const toItem = (film: IndexFilm, language: FeedLanguage) => {
    const type = film.k === 's' ? 'series' : 'movie';
    const page = `#/detail/${type}/${film.id}`;
    return {
        id: film.id,
        type,
        name: film.t[language] ?? film.t.en,
        poster: `https://images.metahub.space/poster/small/${film.id}/img`,
        posterShape: 'poster',
        inLibrary: false,
        watched: false,
        deepLinks: {
            metaDetailsVideos: type === 'series' ? page : null,
            metaDetailsStreams: type === 'movie' ? `${page}/${film.id}` : null,
            player: null,
        },
    };
};

const useScarySearch = (queryParams: URLSearchParams) => {
    const { t, i18n } = useTranslation();
    const query = (queryParams.get('search') ?? queryParams.get('query') ?? '').trim();
    const active = query.length >= MIN_QUERY_LENGTH;
    const [state, setState] = useState<Library>({ status: 'loading', films: [] });

    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        // The library is downloaded once; later searches get the same list back at once.
        loadLibrary().then(
            (films) => !cancelled && setState((current) => current.films === films ? current : { status: 'ready', films }),
            () => !cancelled && setState({ status: 'failed', films: [] }),
        );
        return () => {
            cancelled = true;
        };
    }, [active, query]);

    const search = useMemo(() => {
        if (!active) return { selected: null, catalogs: [] };
        const language = feedLanguageOf(i18n.language);
        const row = (id: string, name: string, type: string, content: unknown) => ({
            id,
            name,
            type,
            addon: { manifest: { id: ADDON_ID, name: 'SCARY' } },
            content,
            deepLinks: {},
        });
        const selected = { type: null, extra: [['search', query]] };
        if (state.status === 'loading') {
            return { selected, catalogs: [row('scary_search_movie', t('SCARY_SEARCH_FILMS'), 'movie', { type: 'Loading' })] };
        }
        if (state.status === 'failed') {
            return { selected, catalogs: [row('scary_search_failed', '', 'movie', { type: 'Err', content: t('SCARY_SEARCH_UNAVAILABLE') })] };
        }
        const found = searchFilms(state.films, query).map((film) => toItem(film, language));
        const films = found.filter((item) => item.type === 'movie');
        const series = found.filter((item) => item.type === 'series');
        const catalogs = [
            ...(films.length > 0 ? [row('scary_search_movie', t('SCARY_SEARCH_FILMS'), 'movie', { type: 'Ready', content: films })] : []),
            ...(series.length > 0 ? [row('scary_search_series', t('SCARY_SEARCH_SERIES'), 'series', { type: 'Ready', content: series })] : []),
        ];
        if (catalogs.length === 0) {
            catalogs.push(row('scary_search_empty', '', 'movie', { type: 'Err', content: t('SCARY_SEARCH_EMPTY') }));
        }
        return { selected, catalogs };
    }, [active, query, state, i18n.language, t]);

    // The whole answer is already here: there is nothing more for the screen to ask for as it scrolls.
    const loadRange = useMemo(() => () => undefined, []);
    return [search, loadRange] as const;
};

export default useScarySearch;
