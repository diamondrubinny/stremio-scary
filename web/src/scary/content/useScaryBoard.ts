// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import { useCallback, useMemo } from 'react';
import { engineRange, scaryRows } from './board';
import type { Range } from './board';

/** The home screen's rows narrowed to SCARY's, with a `loadRange` that speaks in those rows. */
const useScaryBoard = <T extends Parameters<typeof scaryRows>[0] extends (infer C)[] | null | undefined ? C : never>(
    catalogs: T[] | null | undefined,
    loadRange: (range: Range) => void,
) => {
    const rows = useMemo(() => scaryRows(catalogs), [catalogs]);
    const loadScaryRange = useCallback((range: Range) => {
        const translated = engineRange(rows.indexes, range);
        if (translated !== null) loadRange(translated);
    }, [rows.indexes, loadRange]);
    return { catalogs: rows.catalogs, loadRange: loadScaryRange };
};

export default useScaryBoard;
