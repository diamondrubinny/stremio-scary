// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Search for the Search screen, in SCARY's own library. It answers in the shape the screen already draws (the
// engine's "catalogs with extra"), so the screen itself is unchanged.

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { feedLanguageOf } from './addon';
import { toItem, toRow as row } from './items';
import { useScaryLibrary } from './library';
import { useScaryRules } from '../hooks';
import { MIN_QUERY_LENGTH, searchFilms } from './search';

const useScarySearch = (queryParams: URLSearchParams) => {
    const { t, i18n } = useTranslation();
    const query = (queryParams.get('search') ?? queryParams.get('query') ?? '').trim();
    const active = query.length >= MIN_QUERY_LENGTH;
    const state = useScaryLibrary(active);
    const rules = useScaryRules(false);

    const search = useMemo(() => {
        if (!active) return { selected: null, catalogs: [] };
        const language = feedLanguageOf(i18n.language);
        const selected = { type: null, extra: [['search', query]] };
        if (state.status === 'loading') {
            return { selected, catalogs: [row('scary_search_movie', t('SCARY_SEARCH_FILMS'), 'movie', { type: 'Loading' })] };
        }
        if (state.status === 'failed') {
            return { selected, catalogs: [row('scary_search_failed', '', 'movie', { type: 'Err', content: t('SCARY_SEARCH_UNAVAILABLE') })] };
        }
        const found = searchFilms(state.films.filter((film) => !rules.isHidden(film)), query).map((film) => toItem(film, language));
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
    }, [active, query, state, rules, i18n.language, t]);

    // The whole answer is already here: there is nothing more for the screen to ask for as it scrolls.
    const loadRange = useMemo(() => () => undefined, []);
    return [search, loadRange] as const;
};

export default useScarySearch;
