// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// SCARY's library (feed/index.json): every film, with its titles in five languages, its subgenres, its length and its
// scare level. Downloaded once per visit, when something first asks for it, and shared by search, the fear meter,
// the moods, the lock and the rest.

import { useEffect, useState } from 'react';
import { feedBaseUrl } from './addon';
import { readIndex } from './search';
import type { IndexFilm } from './search';

type Library = { status: 'loading' | 'ready' | 'failed', films: IndexFilm[], byId: Map<string, IndexFilm> };

const LOADING: Library = { status: 'loading', films: [], byId: new Map() };
const FAILED: Library = { status: 'failed', films: [], byId: new Map() };

let request: Promise<Library> | null = null;
let loaded: Library | null = null;

const loadLibrary = (): Promise<Library> => {
    if (request === null) {
        request = fetch(`${feedBaseUrl()}index.json`)
            .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
            .then((file: unknown) => {
                const films = readIndex(file);
                loaded = { status: 'ready', films, byId: new Map(films.map((film) => [film.id, film])) };
                return loaded;
            })
            .catch((error: unknown) => {
                // The next one to ask tries again.
                request = null;
                throw error;
            });
    }
    return request;
};

/** The library, once it is there. `wanted` false (nothing on the screen needs it yet) does not download it. */
const useScaryLibrary = (wanted = true): Library => {
    const [library, setLibrary] = useState<Library>(loaded ?? LOADING);
    useEffect(() => {
        if (!wanted || library.status === 'ready') return;
        let cancelled = false;
        loadLibrary().then(
            (ready) => !cancelled && setLibrary(ready),
            () => !cancelled && setLibrary(FAILED),
        );
        return () => {
            cancelled = true;
        };
    }, [wanted, library.status]);
    return library;
};

export { loadLibrary, useScaryLibrary };
export type { Library };
