// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// SCARY's catalogs: a static add-on (manifest and catalog pages) served next to the app, under feed/<language>/.
// Built by the feed/ package from SCARY's weekly film feed.

const FEED_LANGUAGES = ['en', 'he', 'ar', 'pt', 'ru'] as const;
type FeedLanguage = typeof FEED_LANGUAGES[number];

const RTL_LANGUAGES: readonly FeedLanguage[] = ['he', 'ar'];
const ADDON_ID = 'network.scary.catalogs';
const ALL_CATALOG = { movie: 'scary_movies', series: 'scary_series' } as const;
/** Home rows that feed the spotlight ("tonight's picks") when the viewer chose none. */
const SPOTLIGHT_CATALOGS = [
    { type: 'movie', id: 'scary_popular' },
    { type: 'series', id: 'scary_series_must' },
] as const;

const THREE_LETTER_CODES: Record<string, FeedLanguage> = { eng: 'en', heb: 'he', ara: 'ar', por: 'pt', rus: 'ru' };

/** The feed language for an interface language such as "he-IL", "pt-BR" or "heb"; English for any other. */
const feedLanguageOf = (interfaceLanguage: unknown): FeedLanguage => {
    if (typeof interfaceLanguage !== 'string') return 'en';
    const code = interfaceLanguage.toLowerCase();
    const short = THREE_LETTER_CODES[code] ?? code.slice(0, 2);
    return (FEED_LANGUAGES as readonly string[]).includes(short) ? short as FeedLanguage : 'en';
};

const isRtl = (language: FeedLanguage): boolean => RTL_LANGUAGES.includes(language);

/** Stremio Web's name for each of SCARY's languages, as stored in the settings. */
const INTERFACE_LANGUAGE: Record<FeedLanguage, string> = { en: 'en-US', he: 'he-IL', ar: 'ar-AR', pt: 'pt-BR', ru: 'ru-RU' };

/**
 * The interface language for a browser language ("he", "he-IL", "pt-PT", "ru"…), when it is one of SCARY's and not
 * English; null otherwise, and the interface stays as it is. Android and old browsers call Hebrew "iw".
 */
const interfaceLanguageOfBrowser = (browserLanguage: unknown): string | null => {
    if (typeof browserLanguage !== 'string') return null;
    const code = browserLanguage.toLowerCase();
    const short = code.startsWith('iw') ? 'he' : code.slice(0, 2);
    if (short === 'en' || !(FEED_LANGUAGES as readonly string[]).includes(short)) return null;
    return code === 'pt-pt' ? 'pt-PT' : INTERFACE_LANGUAGE[short as FeedLanguage];
};

/** Where the feed is served: "feed/" beside the page, whatever folder the app is published in. */
const feedBaseUrl = (pageUrl: string = document.baseURI): string => new URL('feed/', pageUrl.split('#')[0]).href;

const transportUrlOf = (language: FeedLanguage, pageUrl?: string): string => `${feedBaseUrl(pageUrl)}${language}/manifest.json`;

/** True for the address of one of SCARY's own manifests, in any of its languages. Nothing else counts as SCARY. */
const isScaryTransportUrl = (url: unknown, pageUrl?: string): boolean =>
    typeof url === 'string' && FEED_LANGUAGES.some((language) => url === transportUrlOf(language, pageUrl));

const discoverHref = (transportUrl: string, type: string, id: string): string =>
    `#/discover/${encodeURIComponent(transportUrl)}/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;

/** The add-on address inside a "#/discover/<address>/<type>/<id>" link, or null. */
const transportUrlOfDiscoverLink = (href: unknown): string | null => {
    if (typeof href !== 'string') return null;
    const match = /^#?\/discover\/([^/?]+)\//.exec(href);
    if (match === null) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return null;
    }
};

/** True for a catalog (a home row, a Discover choice) that comes from SCARY's own add-on. */
const isScaryCatalog = (catalog: { addon?: { transportUrl?: string }, deepLinks?: { discover?: string } } | null | undefined, pageUrl?: string): boolean =>
    isScaryTransportUrl(catalog?.addon?.transportUrl, pageUrl) ||
    isScaryTransportUrl(transportUrlOfDiscoverLink(catalog?.deepLinks?.discover), pageUrl);

export {
    ADDON_ID,
    ALL_CATALOG,
    FEED_LANGUAGES,
    SPOTLIGHT_CATALOGS,
    discoverHref,
    feedBaseUrl,
    feedLanguageOf,
    interfaceLanguageOfBrowser,
    isRtl,
    isScaryCatalog,
    isScaryTransportUrl,
    transportUrlOf,
    transportUrlOfDiscoverLink,
};

export type { FeedLanguage };
