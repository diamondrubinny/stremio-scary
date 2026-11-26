// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The home screen shows SCARY's rows only. The engine numbers its rows across every installed add-on, so a range of
// the rows shown here is translated back to the engine's own numbers before it is asked to load them.

import { isScaryCatalog } from './addon';

type Range = { start: number, end: number };

type ScaryRows<T> = {
    catalogs: T[],
    /** For each row shown, its number in the engine's full list. */
    indexes: number[],
};

const scaryRows = <T extends Parameters<typeof isScaryCatalog>[0]>(catalogs: T[] | null | undefined, pageUrl?: string): ScaryRows<T> => {
    const rows: T[] = [];
    const indexes: number[] = [];
    (catalogs ?? []).forEach((catalog, index) => {
        if (isScaryCatalog(catalog, pageUrl)) {
            rows.push(catalog);
            indexes.push(index);
        }
    });
    return { catalogs: rows, indexes };
};

/** A range over the rows shown, as a range over the engine's rows; null when it covers nothing. */
const engineRange = (indexes: number[], range: Range): Range | null => {
    if (indexes.length === 0) return null;
    const first = Math.max(0, Math.min(range.start, indexes.length - 1));
    const last = Math.max(first, Math.min(range.end, indexes.length - 1));
    return { start: indexes[first], end: indexes[last] };
};

export { engineRange, scaryRows };
export type { Range };
