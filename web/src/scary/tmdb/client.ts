// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// What SCARY Web asks TMDB, with the viewer's own key, and how the answers are read. Nothing is asked without a
// key. TMDB receives the key, the ids of the films opened, and the browser's address; nothing else.
// Every answer is read as untrusted: only the fields used, with their types and lengths checked.

const API = 'https://api.themoviedb.org/3';
const IMAGES = 'https://image.tmdb.org/t/p';
const HORROR = 27;
const MAX_CAST = 12;
const MAX_STUDIOS = 4;
const MAX_PROVIDERS = 8;
const MAX_UPCOMING = 12;
const MAX_NAME = 80;
const IMDB_ID = /^tt\d{7,8}$/;
const IMAGE_PATH = /^\/[A-Za-z0-9_-]{4,64}\.(?:jpg|png|svg)$/;
const COUNTRY = /^[A-Z]{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Control characters, and the characters that override the direction of text: not in a name shown on the screen. */
const hasUnsafeText = (value: string): boolean => Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 0x20 || (code >= 0x7f && code <= 0x9f) || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);
});

type TmdbKind = 'movie' | 'tv';
type Request = { url: string, headers: Record<string, string> };
type Person = { name: string, character: string, photo: string | null };
type Offers = { link: string | null, included: string[], rent: string[], buy: string[] };
type Details = { cast: Person[], studios: string[], offers: Offers | null };
type Upcoming = { tmdbId: number, title: string, poster: string, date: string };

/** A TMDB "API key" (32 hexadecimal characters) or "Read Access Token" (three dotted parts); anything else is null. */
const keyKind = (key: unknown): 'v3' | 'v4' | null => {
    if (typeof key !== 'string') return null;
    if (/^[a-f0-9]{32}$/i.test(key)) return 'v3';
    if (key.length <= 600 && /^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(key)) return 'v4';
    return null;
};

/** A request to TMDB with the key where its kind belongs: in the address (API key) or in a header (access token). */
const request = (key: string, path: string, params: Record<string, string> = {}): Request => {
    const query = new URLSearchParams(params);
    const headers: Record<string, string> = { accept: 'application/json' };
    if (keyKind(key) === 'v4') headers.authorization = `Bearer ${key}`;
    else query.set('api_key', key);
    const search = query.toString();
    return { url: `${API}${path}${search.length > 0 ? `?${search}` : ''}`, headers };
};

const checkRequest = (key: string): Request => request(key, '/configuration');
const findRequest = (key: string, imdbId: string): Request => request(key, `/find/${encodeURIComponent(imdbId)}`, { external_source: 'imdb_id' });
const detailsRequest = (key: string, kind: TmdbKind, id: number): Request =>
    request(key, `/${kind}/${id}`, { append_to_response: kind === 'movie' ? 'credits,watch/providers' : 'aggregate_credits,watch/providers' });
const externalIdsRequest = (key: string, id: number): Request => request(key, `/movie/${id}/external_ids`);

/** Horror films that open in cinemas between tomorrow and six months from `today` (an ISO date), best known first. */
const comingSoonRequest = (key: string, today: string, region: string): Request => {
    const from = new Date(`${today}T00:00:00Z`);
    const to = new Date(from);
    from.setUTCDate(from.getUTCDate() + 1);
    to.setUTCMonth(to.getUTCMonth() + 6);
    return request(key, '/discover/movie', {
        with_genres: String(HORROR),
        sort_by: 'popularity.desc',
        'primary_release_date.gte': from.toISOString().slice(0, 10),
        'primary_release_date.lte': to.toISOString().slice(0, 10),
        ...(COUNTRY.test(region) ? { region } : {}),
    });
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown, max: number = MAX_NAME): string | null => {
    if (typeof value !== 'string' || hasUnsafeText(value)) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
};
const tmdbId = (value: unknown): number | null => typeof value === 'number' && Number.isInteger(value) && value > 0 && value < 1e9 ? value : null;

/** The address of a TMDB picture, or null when the path is not a plain file name. The host is always TMDB's. */
const imageUrl = (path: unknown, size: 'w185' | 'w342'): string | null => typeof path === 'string' && IMAGE_PATH.test(path) ? `${IMAGES}/${size}${path}` : null;

/** The TMDB id of the film or series an IMDb id belongs to. */
const readFind = (answer: unknown, kind: TmdbKind): number | null => {
    if (!isRecord(answer)) return null;
    const first = list(kind === 'movie' ? answer.movie_results : answer.tv_results)[0];
    return isRecord(first) ? tmdbId(first.id) : null;
};

const providerNames = (value: unknown): string[] => {
    const names = list(value).map((provider) => isRecord(provider) ? text(provider.provider_name) : null).filter((name): name is string => name !== null);
    return Array.from(new Set(names)).slice(0, MAX_PROVIDERS);
};

/** The cast (with pictures), the companies that made it, and where it can be watched, rented or bought in `country`. */
const readDetails = (answer: unknown, country: string): Details => {
    if (!isRecord(answer)) return { cast: [], studios: [], offers: null };
    const credits = isRecord(answer.credits) ? answer.credits : isRecord(answer.aggregate_credits) ? answer.aggregate_credits : {};
    const cast = list(credits.cast).slice(0, MAX_CAST * 2).map((entry): Person | null => {
        if (!isRecord(entry)) return null;
        const name = text(entry.name);
        const roles = list(entry.roles)[0];
        const character = text(entry.character) ?? (isRecord(roles) ? text(roles.character) : null) ?? '';
        return name === null ? null : { name, character, photo: imageUrl(entry.profile_path, 'w185') };
    }).filter((person): person is Person => person !== null).slice(0, MAX_CAST);
    const studios = list(answer.production_companies).map((company) => isRecord(company) ? text(company.name) : null)
        .filter((name): name is string => name !== null).slice(0, MAX_STUDIOS);
    const providers = isRecord(answer['watch/providers']) && isRecord(answer['watch/providers'].results) ? answer['watch/providers'].results : {};
    const here = COUNTRY.test(country) && Object.hasOwn(providers, country) ? providers[country] : null;
    if (!isRecord(here)) return { cast, studios, offers: null };
    const link = typeof here.link === 'string' && /^https:\/\/www\.themoviedb\.org\/[A-Za-z0-9/?=&._-]+$/.test(here.link) ? here.link : null;
    const offers: Offers = { link, included: providerNames(here.flatrate), rent: providerNames(here.rent), buy: providerNames(here.buy) };
    return { cast, studios, offers: offers.included.length + offers.rent.length + offers.buy.length > 0 ? offers : null };
};

const readComingSoon = (answer: unknown): Upcoming[] => list(isRecord(answer) ? answer.results : null).map((entry): Upcoming | null => {
    if (!isRecord(entry)) return null;
    const id = tmdbId(entry.id);
    const title = text(entry.title, 120);
    const poster = imageUrl(entry.poster_path, 'w342');
    const date = typeof entry.release_date === 'string' && DATE.test(entry.release_date) ? entry.release_date : null;
    return id === null || title === null || poster === null || date === null || entry.adult === true ? null : { tmdbId: id, title, poster, date };
}).filter((film): film is Upcoming => film !== null).slice(0, MAX_UPCOMING);

const readImdbId = (answer: unknown): string | null => isRecord(answer) && typeof answer.imdb_id === 'string' && IMDB_ID.test(answer.imdb_id) ? answer.imdb_id : null;

const LANGUAGE_COUNTRY: Record<string, string> = { he: 'IL', iw: 'IL', ar: 'SA', pt: 'BR', ru: 'RU', en: 'US' };

/**
 * The country stores are looked up in, from the browser's language setting ("he-IL" is Israel), never from where
 * the viewer is. A language without a country falls back to that language's largest one.
 */
const countryOf = (browserLanguage: unknown): string => {
    if (typeof browserLanguage !== 'string') return 'US';
    const [language, region] = browserLanguage.split('-');
    if (typeof region === 'string' && COUNTRY.test(region.toUpperCase())) return region.toUpperCase();
    return LANGUAGE_COUNTRY[language.toLowerCase()] ?? 'US';
};

export { checkRequest, comingSoonRequest, countryOf, detailsRequest, externalIdsRequest, findRequest, imageUrl, keyKind, readComingSoon, readDetails, readFind, readImdbId };
export type { Details, Offers, Person, Request, TmdbKind, Upcoming };
