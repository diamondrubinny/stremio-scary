// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// A film's trailer playing by itself, by the rules of SCARY for Android TV (TRAILER_AUTOPLAY_PLAN.md): which trailer
// a film has, the address of YouTube's player in its privacy-enhanced mode, and what that player says back. Everything
// that comes from outside is read as untrusted: an id is exactly eleven of YouTube's characters or it is not used.

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYER_ORIGIN = 'https://www.youtube-nocookie.com';
/** How long the pointer or the focus rests on a film before its trailer starts. */
const REST_MS = 1_500;
const MAX_MESSAGE_CHARS = 20_000;

type FilmLink = { type: 'movie' | 'series', id: string };
type PlayerEvent = 'playing' | 'ended' | 'error';

/** The film a tile's link leads to: "#/detail/movie/tt0081505/tt0081505". Null for anything else. */
const filmOfHref = (href: unknown): FilmLink | null => {
    if (typeof href !== 'string' || href.length > 300) return null;
    const match = /^#\/(?:detail|metadetails)\/(movie|series)\/(tt\d{7,8})(?:\/|$)/.exec(href);
    return match !== null ? { type: match[1] as FilmLink['type'], id: match[2] } : null;
};

const meta = (type: string, id: string): string => `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`;

/** The YouTube id of a film's trailer, from Cinemeta's answer about the film; null when it names none. */
const trailerIdOf = (answer: unknown): string | null => {
    const film = (answer as { meta?: unknown } | null)?.meta;
    if (typeof film !== 'object' || film === null) return null;
    const { trailerStreams, trailers } = film as Record<string, unknown>;
    const candidates: unknown[] = [];
    if (Array.isArray(trailerStreams)) candidates.push(...trailerStreams.slice(0, 10).map((stream) => (stream as Record<string, unknown> | null)?.ytId));
    if (Array.isArray(trailers)) candidates.push(...trailers.slice(0, 10).map((trailer) => (trailer as Record<string, unknown> | null)?.source));
    const id = candidates.find((candidate): candidate is string => typeof candidate === 'string' && YOUTUBE_ID.test(candidate));
    return id ?? null;
};

/**
 * YouTube's player for one trailer: muted, no controls, no related videos, and only the documented parameters.
 * Null for anything that is not a YouTube id. `origin` is this app's own address, which the player asks for.
 */
const embedUrl = (id: unknown, origin: string): string | null => {
    if (typeof id !== 'string' || !YOUTUBE_ID.test(id)) return null;
    const query = new URLSearchParams({ autoplay: '1', mute: '1', controls: '0', rel: '0', playsinline: '1', fs: '0', disablekb: '1', iv_load_policy: '3', enablejsapi: '1', origin });
    return `${PLAYER_ORIGIN}/embed/${id}?${query.toString()}`;
};

/**
 * What the page says to the player once it has loaded, so that the player reports when it plays, ends or fails
 * (the same words YouTube's own IFrame API says; no script of YouTube's is loaded into the app for it).
 */
const HELLO: readonly string[] = [
    JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
    ...['onStateChange', 'onError'].map((name) => JSON.stringify({ event: 'command', func: 'addEventListener', args: [name], id: 1, channel: 'widget' })),
];
/** How long the player has to start playing before the trailer is given up. */
const START_MS = 10_000;

/** What a message of the player means, from a closed list; null for anything else. */
const readPlayerMessage = (data: unknown): PlayerEvent | null => {
    if (typeof data !== 'string' || data.length > MAX_MESSAGE_CHARS) return null;
    let message: unknown;
    try {
        message = JSON.parse(data);
    } catch {
        return null;
    }
    if (typeof message !== 'object' || message === null) return null;
    const { event, info } = message as Record<string, unknown>;
    if (event === 'onError') return 'error';
    const state = event === 'onStateChange' ? info : event === 'infoDelivery' ? (info as Record<string, unknown> | null)?.playerState : undefined;
    return state === 0 ? 'ended' : state === 1 ? 'playing' : null;
};

export { HELLO, PLAYER_ORIGIN, REST_MS, START_MS, embedUrl, filmOfHref, meta as metaUrl, readPlayerMessage, trailerIdOf };
export type { FilmLink, PlayerEvent };
