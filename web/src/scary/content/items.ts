// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// A film of the library in the shape Stremio Web's poster tiles and rows already draw.

import { ADDON_ID } from './addon';
import type { FeedLanguage } from './addon';
import type { IndexFilm } from './search';

const typeOf = (film: IndexFilm): 'movie' | 'series' => film.k === 's' ? 'series' : 'movie';
const titleOf = (film: IndexFilm, language: FeedLanguage): string => film.t[language] ?? film.t.en;
const detailsHref = (film: IndexFilm): string => typeOf(film) === 'series' ? `#/detail/series/${film.id}` : `#/detail/movie/${film.id}/${film.id}`;
// Built from the IMDb id only: the addresses Cinemeta's own films carry.
const posterOf = (id: string): string => `https://images.metahub.space/poster/small/${id}/img`;
const backgroundOf = (id: string): string => `https://images.metahub.space/background/medium/${id}/img`;
const logoOf = (id: string): string => `https://images.metahub.space/logo/medium/${id}/img`;

const toItem = (film: IndexFilm, language: FeedLanguage) => {
    const type = typeOf(film);
    return {
        id: film.id,
        type,
        name: titleOf(film, language),
        poster: posterOf(film.id),
        posterShape: 'poster',
        inLibrary: false,
        watched: false,
        deepLinks: {
            metaDetailsVideos: type === 'series' ? detailsHref(film) : null,
            metaDetailsStreams: type === 'movie' ? detailsHref(film) : null,
            player: null,
        },
    };
};

/** A row for Stremio Web's MetaRow: a title and films, or a message in their place. */
const toRow = (id: string, name: string, type: string, content: unknown) => ({
    id,
    name,
    type,
    addon: { manifest: { id: ADDON_ID, name: 'SCARY' } },
    content,
    deepLinks: {},
});

export { backgroundOf, detailsHref, logoOf, posterOf, titleOf, toItem, toRow, typeOf };
