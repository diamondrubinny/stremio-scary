// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

/**
 * The network guard: SCARY Web has no accounts, so nothing may reach Stremio's account services.
 *
 * Without it, the engine (stremio-core, compiled to WebAssembly) calls api.strem.io as soon as the page opens, even
 * for a guest: a location lookup by IP address, a remote configuration and a promotion window. The guard replaces
 * `fetch` before the engine loads and refuses those hosts, so the engine itself stays unmodified.
 *
 * The guard judges the address that is asked for. Cinemeta answers its allowed lists by sending the browser on to its
 * own catalogs host, and the browser follows.
 *
 * Only exact host names are listed. Film information (Cinemeta), images and the add-ons a viewer installs are other
 * hosts and are not touched.
 */
const BLOCKED_HOSTS: ReadonlySet<string> = new Set([
    'api.strem.io',
    'www.strem.io',
    'link.stremio.com',
]);

const SCARY_GENRES: readonly string[] = ['Horror', 'Thriller', 'Mystery'];
const GENRE_CATALOG = /^\/catalog\/(?:movie|series)\/(?:top|imdbRating)\/([^/]+)\.json$/;
const OWN_SERIES_CATALOG = /^\/catalog\/series\/(?:last-videos|calendar-videos)\//;

/** True for one of Cinemeta's lists narrowed to horror, thriller or mystery: "genre=Horror", with or without "skip=100". */
const isScaryGenreCatalog = (pathname: string): boolean => {
    const match = GENRE_CATALOG.exec(pathname);
    if (match === null) return false;
    let extra = match[1];
    try {
        extra = decodeURIComponent(extra);
    } catch {
        return false;
    }
    const parts = extra.split('&');
    const genres = parts.filter((part) => part.startsWith('genre='));
    return genres.length === 1 && SCARY_GENRES.includes(genres[0].slice('genre='.length)) &&
        parts.every((part) => part.startsWith('genre=') || /^skip=\d{1,6}$/.test(part));
};

/**
 * Cinemeta's general catalogs (every genre): SCARY shows horror, thriller and mystery only, so nothing else is asked
 * for. What stays reachable: its lists narrowed to one of those three genres; the new episodes of the series in the
 * viewer's own library (the calendar); and its film pages (/meta/…), which are not catalogs.
 */
const isGeneralCatalog = (address: URL): boolean => {
    if (address.hostname === 'cinemeta-catalogs.strem.io') return true;
    if (address.hostname !== 'v3-cinemeta.strem.io' || !address.pathname.startsWith('/catalog/')) return false;
    return !OWN_SERIES_CATALOG.test(address.pathname) && !isScaryGenreCatalog(address.pathname);
};

/** True when a request to this address must not leave the browser. Relative and unreadable addresses are allowed. */
const isBlockedUrl = (url: string, base?: string): boolean => {
    try {
        const address = new URL(url, base);
        return BLOCKED_HOSTS.has(address.hostname.toLowerCase()) || isGeneralCatalog(address);
    } catch {
        return false;
    }
};

type FetchInput = string | URL | { url: string };

type FetchScope = {
    fetch: (input: never, init?: never) => Promise<unknown>,
    location?: { href: string },
};

const addressOf = (input: FetchInput): string => {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    return typeof input?.url === 'string' ? input.url : '';
};

/** Wraps `scope.fetch` so that requests to the blocked hosts fail the way a dropped connection does. */
const installNetworkGuard = (scope: FetchScope): void => {
    const originalFetch = scope.fetch.bind(scope) as (input: FetchInput, init?: unknown) => Promise<unknown>;
    const guardedFetch = (input: FetchInput, init?: unknown): Promise<unknown> => {
        if (isBlockedUrl(addressOf(input), scope.location?.href)) {
            return Promise.reject(new TypeError('Blocked by the SCARY network guard'));
        }
        return originalFetch(input, init);
    };
    scope.fetch = guardedFetch as FetchScope['fetch'];
};

export { BLOCKED_HOSTS, SCARY_GENRES, isBlockedUrl, installNetworkGuard };
