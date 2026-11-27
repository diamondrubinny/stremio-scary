// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// "Who is watching?", by the rules of SCARY for Android TV (Profiles.kt): up to five viewers in one browser, each
// with their own lists. A profile is a name and a colour, nothing else: no photo, age or account. The first profile
// is what the browser always held and cannot be removed. A "gentle" profile always shows only what family night
// shows; leaving it asks for the PIN when one is set.

const MAX_PROFILES = 5;
const MAX_NAME = 20;
const COLOURS = 6;
const FIRST = 'p1';
const IDS: readonly string[] = ['p1', 'p2', 'p3', 'p4', 'p5'];

/** `name` is empty only for the first profile before anyone named it; the screen then shows a default name. */
type Profile = { id: string, name: string, colour: number, gentle: boolean };

const FIRST_PROFILE: Profile = { id: FIRST, name: '', colour: 0, gentle: false };

/** Control characters, and the invisible ones that turn the direction of the text around them. */
const isUnsafe = (code: number): boolean =>
    code < 0x20 || (code >= 0x7F && code <= 0x9F) || (code >= 0x200B && code <= 0x200F) || (code >= 0x202A && code <= 0x202E) ||
    (code >= 0x2066 && code <= 0x2069) || code === 0xFEFF;

/**
 * A name as it is kept, or null when nothing is left of it: one line, no control or direction characters (a name
 * must not turn the text around it), single spaces, at most MAX_NAME characters.
 */
const cleanName = (text: unknown): string | null => {
    if (typeof text !== 'string') return null;
    const safe = Array.from(text.slice(0, 400)).map((letter) => isUnsafe(letter.codePointAt(0) ?? 0) ? ' ' : letter).join('');
    const name = Array.from(safe.trim().replace(/\s+/g, ' ')).slice(0, MAX_NAME).join('').trim();
    return name.length > 0 ? name : null;
};

const colourOf = (value: unknown): number =>
    typeof value === 'number' && Number.isInteger(value) ? Math.min(Math.max(value, 0), COLOURS - 1) : 0;

/** A stored list, read as untrusted: always the first profile, then at most four more, each id once. */
const readProfiles = (value: unknown): Profile[] => {
    const read: Profile[] = [];
    for (const item of Array.isArray(value) ? value.slice(0, 50) : []) {
        if (typeof item !== 'object' || item === null) continue;
        const { id, name, c, g } = item as Record<string, unknown>;
        if (typeof id !== 'string' || !IDS.includes(id) || read.some((profile) => profile.id === id)) continue;
        const clean = cleanName(name) ?? '';
        if (clean.length === 0 && id !== FIRST) continue;
        read.push({ id, name: clean, colour: colourOf(c), gentle: g === true });
    }
    const first = read.find((profile) => profile.id === FIRST) ?? FIRST_PROFILE;
    return [first, ...read.filter((profile) => profile.id !== FIRST)].slice(0, MAX_PROFILES);
};

const writeProfiles = (profiles: Profile[]): { id: string, name: string, c: number, g: boolean }[] =>
    profiles.map(({ id, name, colour, gentle }) => ({ id, name, c: colour, g: gentle }));

/** The profile on screen: the one named when it still exists, else the first. */
const activeOf = (profiles: Profile[], activeId: unknown): Profile =>
    profiles.find((profile) => profile.id === activeId) ?? profiles.find((profile) => profile.id === FIRST) ?? FIRST_PROFILE;

/** The list with a new profile, and that profile; null when the name is empty or there are already five. */
const addProfile = (profiles: Profile[], name: unknown, colour: number, gentle: boolean): { profiles: Profile[], added: Profile } | null => {
    const clean = cleanName(name);
    const id = IDS.find((free) => !profiles.some((profile) => profile.id === free));
    if (clean === null || id === undefined || profiles.length >= MAX_PROFILES) return null;
    const added: Profile = { id, name: clean, colour: colourOf(colour), gentle };
    return { profiles: [...profiles, added], added };
};

/** The list with one profile's name, colour and gentleness changed; null for an empty name or an unknown id. */
const updateProfile = (profiles: Profile[], id: string, name: unknown, colour: number, gentle: boolean): Profile[] | null => {
    const clean = cleanName(name);
    if (clean === null || !profiles.some((profile) => profile.id === id)) return null;
    return profiles.map((profile) => profile.id === id ? { id, name: clean, colour: colourOf(colour), gentle } : profile);
};

/** The list without one profile; null for the first (it is the browser's own lists) or an unknown id. */
const removeProfile = (profiles: Profile[], id: string): Profile[] | null =>
    id === FIRST || !profiles.some((profile) => profile.id === id) ? null : profiles.filter((profile) => profile.id !== id);

/** The colour a new profile gets: the first one no profile uses yet. */
const nextColour = (profiles: Profile[]): number => {
    for (let colour = 0; colour < COLOURS; colour++) {
        if (!profiles.some((profile) => profile.colour === colour)) return colour;
    }
    return 0;
};

/** What goes after a storage key for a profile that is not on screen: "@p2". */
const suffixOf = (id: string): string => IDS.includes(id) ? `@${id}` : '';

export { COLOURS, FIRST, FIRST_PROFILE, IDS, MAX_NAME, MAX_PROFILES, activeOf, addProfile, cleanName, nextColour, readProfiles, removeProfile, suffixOf, updateProfile, writeProfiles };
export type { Profile };
