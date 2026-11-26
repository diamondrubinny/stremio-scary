// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Discover offers SCARY's catalogs only: films and series, each with SCARY's rows and its full, filterable list.

import { ALL_CATALOG, discoverHref, isScaryCatalog } from './addon';

type DiscoverType = { type: string, selected: boolean, deepLinks: { discover: string } };
type DiscoverCatalog = { addon?: { transportUrl?: string }, deepLinks?: { discover?: string } };
type DiscoverState = { selectable: { types: DiscoverType[], catalogs: DiscoverCatalog[] } };

/** What Discover opens with when the address names no catalog: every horror film, best known first. */
const defaultDiscoverRequest = (transportUrl: string) => ({
    base: transportUrl,
    path: { resource: 'catalog', type: 'movie', id: ALL_CATALOG.movie, extra: [] },
});

/**
 * The engine's Discover state, narrowed to SCARY: the types are films and series, each leading to SCARY's full list,
 * and the catalogs are SCARY's. `transportUrl` is SCARY's installed add-on; without it nothing is offered.
 */
const narrowDiscover = <T extends DiscoverState>(discover: T, transportUrl: string | null, pageUrl?: string): T => ({
    ...discover,
    selectable: {
        ...discover.selectable,
        types: transportUrl === null ? [] : discover.selectable.types
            .filter(({ type }) => Object.hasOwn(ALL_CATALOG, type))
            .map((option) => ({
                ...option,
                deepLinks: { ...option.deepLinks, discover: discoverHref(transportUrl, option.type, ALL_CATALOG[option.type as keyof typeof ALL_CATALOG]) },
            })),
        catalogs: discover.selectable.catalogs.filter((catalog) => isScaryCatalog(catalog, pageUrl)),
    },
});

export { defaultDiscoverRequest, narrowDiscover };
