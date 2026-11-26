// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Discover offers SCARY's catalogs, and after them Cinemeta's own lists narrowed to horror, thriller and mystery
// (thousands more films and series, loaded as the viewer scrolls). Nothing of another genre is offered.

import { SCARY_GENRES } from '../network/guard';
import { ALL_CATALOG, discoverHref, isScaryCatalog } from './addon';

const CINEMETA = 'https://v3-cinemeta.strem.io/manifest.json';
const CINEMETA_CATALOGS: readonly string[] = ['top', 'imdbRating'];

type Links = { discover: string };
type DiscoverType = { type: string, selected: boolean, deepLinks: Links };
type DiscoverCatalog = { id?: string, addon?: { transportUrl?: string }, deepLinks?: { discover?: string } };
type ExtraOption = { value: string | null, selected: boolean, deepLinks: Links };
type DiscoverExtra = { name: string, isRequired: boolean, options: ExtraOption[] };
type Item = { id?: string };
type DiscoverState = {
    selected?: { request?: { base?: string } } | null,
    catalog?: { content?: { type?: string, content?: unknown } | null } | null,
    selectable: { types: DiscoverType[], catalogs: DiscoverCatalog[], extra: DiscoverExtra[] },
};

/** What Discover opens with when the address names no catalog: every horror film, best known first. */
const defaultDiscoverRequest = (transportUrl: string) => ({
    base: transportUrl,
    path: { resource: 'catalog', type: 'movie', id: ALL_CATALOG.movie, extra: [] },
});

const isCinemetaGenreCatalog = (catalog: DiscoverCatalog): boolean =>
    typeof catalog.deepLinks?.discover === 'string' && catalog.deepLinks.discover.includes(`/discover/${encodeURIComponent(CINEMETA)}/`) &&
    typeof catalog.id === 'string' && CINEMETA_CATALOGS.includes(catalog.id);

/** A link to one of Cinemeta's lists is always a link to its horror: the list without a genre is never asked for. */
const withHorror = (href: string): string => href.includes('genre=') ? href : `${href}${href.includes('?') ? '&' : '?'}genre=Horror`;

/**
 * The engine's Discover state, narrowed to SCARY. The types are films and series, each leading to SCARY's full list.
 * The catalogs are SCARY's, then Cinemeta's two lists (always with a genre). In a Cinemeta list the genre filter
 * offers horror, thriller and mystery only. `isHidden` (family night) takes films out of what is shown.
 */
const narrowDiscover = <T extends DiscoverState>(discover: T, transportUrl: string | null, isHidden: ((id: string | undefined) => boolean) | null = null, pageUrl?: string): T => {
    const fromCinemeta = discover.selected?.request?.base === CINEMETA;
    const content = discover.catalog?.content;
    return {
        ...discover,
        catalog: isHidden !== null && discover.catalog && content?.type === 'Ready' && Array.isArray(content.content) ?
            { ...discover.catalog, content: { ...content, content: (content.content as Item[]).filter((item) => !isHidden(item.id)) } }
            :
            discover.catalog,
        selectable: {
            ...discover.selectable,
            types: transportUrl === null ? [] : discover.selectable.types
                .filter(({ type }) => Object.hasOwn(ALL_CATALOG, type))
                .map((option) => ({
                    ...option,
                    deepLinks: { ...option.deepLinks, discover: discoverHref(transportUrl, option.type, ALL_CATALOG[option.type as keyof typeof ALL_CATALOG]) },
                })),
            catalogs: [
                ...discover.selectable.catalogs.filter((catalog) => isScaryCatalog(catalog, pageUrl)),
                ...discover.selectable.catalogs.filter(isCinemetaGenreCatalog).map((catalog) => ({
                    ...catalog,
                    deepLinks: { ...catalog.deepLinks, discover: withHorror(catalog.deepLinks!.discover!) },
                })),
            ],
            extra: !fromCinemeta ? discover.selectable.extra : discover.selectable.extra.map((extra) => extra.name !== 'genre' ? extra : {
                ...extra,
                isRequired: true,
                options: extra.options.filter(({ value }) => value !== null && SCARY_GENRES.includes(value)),
            }),
        },
    };
};

export { CINEMETA, defaultDiscoverRequest, narrowDiscover };
