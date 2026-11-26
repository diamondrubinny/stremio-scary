// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import { useCallback, useMemo } from 'react';
import { useScaryRules, useScaryState } from '../hooks';
import { engineRange, scaryRows } from './board';
import type { Range } from './board';

type Item = { id?: string, watched?: boolean };
type Row = Parameters<typeof scaryRows>[0] extends (infer C)[] | null | undefined ? C : never;
type Loaded = { content?: { type?: string, content?: unknown } | null };

/**
 * The home screen's rows narrowed to SCARY's, with a `loadRange` that speaks in those rows. Inside each row: family
 * night leaves only the gentlest films, a film marked "not for me" is left out, and films already watched go last.
 */
const useScaryBoard = <T extends Row>(catalogs: T[] | null | undefined, loadRange: (range: Range) => void) => {
    const { familyNight, notForMe } = useScaryState();
    const rules = useScaryRules(familyNight);
    const rows = useMemo(() => scaryRows(catalogs), [catalogs]);

    const allowed = useCallback(<I extends Item>(items: I[]): I[] => {
        // Until the library is there, family night shows nothing rather than everything.
        if (familyNight && rules.library.status !== 'ready') return [];
        const kept = items.filter((item) => typeof item.id === 'string' && !notForMe.includes(item.id) && !rules.isHidden(rules.library.byId.get(item.id)));
        return [...kept.filter((item) => item.watched !== true), ...kept.filter((item) => item.watched === true)];
    }, [familyNight, notForMe, rules]);

    const shown = useMemo(() => rows.catalogs.map((catalog) => {
        const loaded = (catalog as Loaded).content;
        if (loaded?.type !== 'Ready' || !Array.isArray(loaded.content)) return catalog;
        const items = allowed(loaded.content as Item[]);
        // A row with nothing left reads as an empty one, which the screen leaves out.
        return { ...catalog, content: items.length > 0 ? { ...loaded, content: items } : { type: 'Err', content: 'EmptyContent' } };
    }), [rows.catalogs, allowed]);

    const loadScaryRange = useCallback((range: Range) => {
        const translated = engineRange(rows.indexes, range);
        if (translated !== null) loadRange(translated);
    }, [rows.indexes, loadRange]);

    return { catalogs: shown as T[], loadRange: loadScaryRange, allowed };
};

export default useScaryBoard;
