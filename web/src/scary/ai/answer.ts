// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// What an AI service answered, read as untrusted (docs/AI_PLAN.md). A film is shown only when it is one of the films
// that were offered, or one the library itself knows by that name and year: the service cannot make a film up, nor
// bring back one that is held from this viewer. Words of the service are shown as plain text, cleaned and cut.

import { normalize, searchFilms } from '../content/search';
import type { IndexFilm } from '../content/search';
import type { Candidate } from './prompt';

const MAX_ANSWER_CHARS = 20_000;
const MAX_PICKS = 6;
const MAX_WHY = 220;
const MAX_ABOUT = 1_400;

type Pick = { film: IndexFilm, why: string };

/** Text of the service as it may be shown: no control or direction characters, no runs of spaces, of a bounded length. */
const cleanText = (text: unknown, max: number, keepLines = false): string => {
    if (typeof text !== 'string') return '';
    const safe = Array.from(text.slice(0, MAX_ANSWER_CHARS)).map((letter) => {
        const code = letter.codePointAt(0) ?? 0;
        if (keepLines && code === 0x0A) return '\n';
        return code < 0x20 || (code >= 0x7F && code <= 0x9F) || (code >= 0x200B && code <= 0x200F) || (code >= 0x202A && code <= 0x202E) || (code >= 0x2066 && code <= 0x2069) || code === 0xFEFF ? ' ' : letter;
    }).join('');
    const tidy = keepLines ? safe.split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter((line) => line.length > 0).join('\n') : safe.replace(/\s+/g, ' ').trim();
    return Array.from(tidy).slice(0, max).join('');
};

/** The JSON object inside an answer, wherever the service put it (some wrap it in a code fence or a sentence). */
const objectIn = (answer: unknown): Record<string, unknown> | null => {
    if (typeof answer !== 'string' || answer.length > MAX_ANSWER_CHARS) return null;
    const start = answer.indexOf('{');
    const end = answer.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
        const value: unknown = JSON.parse(answer.slice(start, end + 1));
        return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
    } catch {
        return null;
    }
};

/** The films chosen from the list that was sent, each once, in the service's order. Null: the answer cannot be read. */
const readPicks = (answer: unknown, candidates: Candidate[]): Pick[] | null => {
    const picks = objectIn(answer)?.picks;
    if (!Array.isArray(picks)) return null;
    const chosen: Pick[] = [];
    for (const pick of picks.slice(0, 30)) {
        if (typeof pick !== 'object' || pick === null) continue;
        const { n, why } = pick as Record<string, unknown>;
        if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > candidates.length) continue;
        const { film } = candidates[n - 1];
        if (chosen.some((other) => other.film.id === film.id)) continue;
        chosen.push({ film, why: cleanText(why, MAX_WHY) });
        if (chosen.length >= MAX_PICKS) break;
    }
    return chosen;
};

/**
 * The films of the library that the service named: the same name (in any of the library's languages) and the same
 * year, give or take one. A name the library does not know is dropped. `films` holds only what this viewer may see.
 */
const readTitles = (answer: unknown, films: IndexFilm[]): Pick[] | null => {
    const titles = objectIn(answer)?.titles;
    if (!Array.isArray(titles)) return null;
    const found: Pick[] = [];
    for (const item of titles.slice(0, 12)) {
        if (typeof item !== 'object' || item === null) continue;
        const { title, year } = item as Record<string, unknown>;
        const name = cleanText(title, 120);
        if (name.length < 2 || typeof year !== 'number' || !Number.isInteger(year)) continue;
        const wanted = normalize(name);
        const film = searchFilms(films, name, 8).find((candidate) =>
            Math.abs(candidate.y - year) <= 1 && Object.values(candidate.t).some((known) => typeof known === 'string' && normalize(known) === wanted));
        if (film === undefined || found.some((other) => other.film.id === film.id)) continue;
        found.push({ film, why: '' });
        if (found.length >= MAX_PICKS) break;
    }
    return found;
};

/** A few paragraphs about a film, as plain text. Empty when there is nothing to show. */
const readAbout = (answer: unknown): string => cleanText(answer, MAX_ABOUT, true);

export { cleanText, readAbout, readPicks, readTitles };
export type { Pick };
