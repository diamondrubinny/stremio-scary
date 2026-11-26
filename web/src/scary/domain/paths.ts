// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Which film an address of the app is about: the film's page, or the player.

const FILM_ID = /(?:^|\/)(tt\d{7,8})(?=[/:]|$)/g;

const isPlayerPath = (pathname: string): boolean => pathname.startsWith('/player/');
const isFilmPath = (pathname: string): boolean => /^\/(player|detail|metadetails)\//.test(pathname);

/** The film a details or player address is about, or null. */
const filmIdOfPath = (pathname: string): string | null => {
    if (!isFilmPath(pathname)) return null;
    let decoded = pathname;
    try {
        decoded = decodeURIComponent(pathname);
    } catch {
        // An address that cannot be decoded is searched as it is.
    }
    // The first id after the kind of thing ("/movie/tt…", "/series/tt…"): an episode's own id comes after it.
    const ids = decoded.match(FILM_ID);
    if (ids === null) return null;
    const afterType = /\/(?:movie|series)\/(tt\d{7,8})(?=[/:]|$)/.exec(decoded);
    return afterType !== null ? afterType[1] : ids[0].replace('/', '');
};

export { filmIdOfPath, isFilmPath, isPlayerPath };
