// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

/**
 * The network guard: SCARY Web has no accounts, so nothing may reach Stremio's account services.
 *
 * Without it, the engine (stremio-core, compiled to WebAssembly) calls api.strem.io as soon as the page opens, even
 * for a guest: a location lookup by IP address, a remote configuration and a promotion window. The guard replaces
 * `fetch` before the engine loads and refuses those hosts, so the engine itself stays unmodified.
 *
 * Only exact host names are listed. Film information (Cinemeta), images and the add-ons a viewer installs are other
 * hosts and are not touched.
 */
const BLOCKED_HOSTS: ReadonlySet<string> = new Set([
    'api.strem.io',
    'www.strem.io',
    'link.stremio.com',
]);

/**
 * Cinemeta's general catalogs (every genre): SCARY shows horror only, from its own feed, so they are never asked for.
 * Cinemeta's film pages (/meta/…) are not catalogs and stay reachable.
 */
const isGeneralCatalog = (address: URL): boolean =>
    address.hostname === 'cinemeta-catalogs.strem.io' ||
    (address.hostname === 'v3-cinemeta.strem.io' && address.pathname.startsWith('/catalog/'));

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

export { BLOCKED_HOSTS, isBlockedUrl, installNetworkGuard };
