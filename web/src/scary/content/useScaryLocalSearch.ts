// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The suggestions under the search bar, from SCARY's own library: a few titles that answer what was typed so far, in
// the interface language. Worked out in the browser; nothing typed leaves it.

import { useCallback, useMemo, useState } from 'react';
import { useFeedLanguage, useScaryRules } from '../hooks';
import { titleOf } from './items';
import { useScaryLibrary } from './library';
import { MIN_QUERY_LENGTH, searchFilms } from './search';

const MAX_SUGGESTIONS = 5;

const useScaryLocalSearch = () => {
    const language = useFeedLanguage();
    const [query, setQuery] = useState('');
    const active = query.trim().length >= MIN_QUERY_LENGTH;
    const library = useScaryLibrary(active);
    const rules = useScaryRules(false);
    const items = useMemo(() => {
        if (!active) return [];
        const titles = searchFilms(library.films.filter((film) => !rules.isHidden(film)), query, MAX_SUGGESTIONS * 2).map((film) => titleOf(film, language));
        return Array.from(new Set(titles)).slice(0, MAX_SUGGESTIONS).map((title) => ({
            query: title,
            deepLinks: { search: `#/search?search=${encodeURIComponent(title)}` },
        }));
    }, [active, library.films, rules, query, language]);
    const search = useCallback((text: unknown) => setQuery(typeof text === 'string' ? text : ''), []);
    return { items, search };
};

export default useScaryLocalSearch;
