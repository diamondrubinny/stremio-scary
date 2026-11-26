// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// A film of SCARY's library, as the app holds it (feed/index.json), and the few questions every feature asks of it.

import type { IndexFilm } from '../content/search';

type Film = IndexFilm;

const isSeries = (film: Film): boolean => film.k === 's';
const isThriller = (film: Film): boolean => film.k === 't';
/** A film somebody rated by hand: what tonight's picks, the moods, family night and the time planner choose from. */
const isRated = (film: Film): film is Film & { f: number } => typeof film.f === 'number';
/** Unknown fear counts as the maximum for the parental lock, so unrated films stay behind the PIN. */
const fearForLock = (film: Film | null | undefined): number => film?.f ?? 5;
const decadeOf = (film: Film): number => Math.floor(film.y / 10) * 10;
const minutesOf = (film: Film): number => film.m ?? 0;

export { decadeOf, fearForLock, isRated, isSeries, isThriller, minutesOf };
export type { Film };
