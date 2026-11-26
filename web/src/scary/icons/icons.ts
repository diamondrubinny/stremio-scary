// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// SCARY's own icons, drawn for SCARY Web: thin bone lines with sharp corners on a 24 by 24 grid, and a few shapes
// from the genre where they still read at a glance (a coffin for the library, a saw blade for the settings, a slit
// pupil in the eye). They answer to the names Stremio Web already asks for, so no screen had to change.

/**
 * A drawn line, a line of its own thickness, or a filled shape (even-odd, so a second outline inside the first cuts a
 * hole).
 */
type Shape = string | { fill: string } | { line: string, width: number };
type Glyph = Shape[];

const fill = (d: string): Shape => ({ fill: d });
const circle = (x: number, y: number, r: number): string => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const dot = (x: number, y: number, r = 1.3): Shape => fill(circle(x, y, r));

const HOUSE = 'M12 2.5 2.5 11H5v10.5h14V11h2.5z';
const DOOR = 'M9.8 21.5v-5.2l2.2-2.6 2.2 2.6v5.2z';
const COMPASS = circle(12, 12, 9.3);
const NEEDLE = 'M16.2 7.8 13.6 13.6 7.8 16.2 10.4 10.4z';
const COFFIN = 'M9 2.5h6L18.5 8l-3 13.5h-7L5.5 8z';
const CROSS = 'M12 6.8v7.2M9.6 9.3h4.8';
const CALENDAR = 'M3.5 5.5h17v15h-17z';
const THIRTEEN = ['M8.6 12.8v5', 'M12.3 12.8h3.3l-2 2.2a1.5 1.5 0 1 1-1.5 2.2'];
const PUZZLE = 'M4 8h4.5V6.4a2 2 0 1 1 4 0V8H17v4.5h1.6a2 2 0 1 1 0 4H17V21h-4.5v-1.6a2 2 0 1 0-4 0V21H4v-4.5h1.6a2 2 0 1 0 0-4H4z';
const SAW = 'M12 2.4 15 6.1l3.8-.9-.5 4.8 3.3 2-3.7 3 .9 3.8-4.8-.5-2 3.3-3-3.7-3.8.9.5-4.8-3.3-2 3.7-3-.9-3.8 4.8.5z';
const HUB = circle(12, 12, 2.6);
const SPEAKER = 'M3 9.5h4L12 5v14l-5-4.5H3z';
const HEART = 'M12 20.5 3.6 11.6a4.9 4.9 0 0 1 8.4-4.3 4.9 4.9 0 0 1 8.4 4.3z';
const THUMB = ['M3.5 10.5H7v10H3.5z', 'M7 11l4-7.5c1.7 0 2.6 1.3 2.2 2.9l-.7 3.1h6.2a1.8 1.8 0 0 1 1.7 2.3l-1.9 7a2.3 2.3 0 0 1-2.2 1.7H7'];
const SCREEN = 'M3 5h18v14H3z';
const FILM = ['M4 4h16v16H4z', 'M8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4'];
const SERIES = ['M3 8h18v12H3z', 'M8 4l4 4 4-4'];
const PERSON = [circle(12, 8, 3.7), 'M4.5 21c0-4.6 3-7 7.5-7s7.5 2.4 7.5 7'];
const BIN = ['M4 6.5h16', 'M9 6.5V4h6v2.5', 'M6 6.5l1 14h10l1-14', 'M10 10.5v6M14 10.5v6'];
const FRAME = 'M3 5.5h18v13H3z';

const ICONS: Record<string, Glyph> = {
    // The six places of the app: drawn in outline, and filled for the one the viewer is in.
    'home-outline': [HOUSE, DOOR],
    'home': [fill(`${HOUSE}${DOOR}`)],
    'discover-outline': [COMPASS, NEEDLE],
    'discover': [fill(`${COMPASS}${NEEDLE}`)],
    'library-outline': [COFFIN, CROSS],
    'library': [fill(`${COFFIN}M11.1 6h1.8v2.4h2.4v1.8h-2.4V14h-1.8v-3.8H8.7V8.4h2.4z`)],
    'calendar-outline': [CALENDAR, 'M3.5 9.5h17', 'M8 3v4M16 3v4', ...THIRTEEN],
    'calendar-thin': [CALENDAR, 'M3.5 9.5h17', 'M8 3v4M16 3v4', ...THIRTEEN],
    'calendar': [CALENDAR, fill('M3.5 5.5h17v4.5h-17z'), 'M8 3v4M16 3v4', ...THIRTEEN],
    'addons-outline': [PUZZLE],
    'addons': [fill(PUZZLE)],
    'settings-outline': [SAW, HUB],
    'settings': [fill(`${SAW}${HUB}`)],

    // Finding and moving about.
    'search': [circle(10.5, 10.5, 6.8), 'M15.5 15.5 21 21'],
    'close': ['M5 5l14 14M19 5 5 19'],
    'add': ['M12 4v16M4 12h16'],
    'remove': ['M4 12h16'],
    'checkmark': ['M4 12.5 9.5 18 20 6.5'],
    'chevron-back': ['M15 4l-8 8 8 8'],
    'chevron-forward': ['M9 4l8 8-8 8'],
    'caret-down': [fill('M5 9h14l-7 8z')],
    'caret-up': [fill('M5 15h14l-7-8z')],
    'caret-left': [fill('M15 5v14l-8-7z')],
    'caret-right': [fill('M9 5v14l8-7z')],
    'more-horizontal': [dot(5, 12, 1.7), dot(12, 12, 1.7), dot(19, 12, 1.7)],
    'more-vertical': [dot(12, 5, 1.7), dot(12, 12, 1.7), dot(12, 19, 1.7)],
    'filters': ['M4 7h8M17 7h3M4 12h2M11 12h9M4 17h10M19 17h1', circle(14.5, 7, 2.2), circle(8.5, 12, 2.2), circle(16.5, 17, 2.2)],
    'list': ['M8.5 6H20M8.5 12H20M8.5 18H20', dot(4.5, 6), dot(4.5, 12), dot(4.5, 18)],
    'grid': ['M4 4h6.5v6.5H4z', 'M13.5 4H20v6.5h-6.5z', 'M4 13.5h6.5V20H4z', 'M13.5 13.5H20V20h-6.5z'],
    'details': ['M4 4h16v16H4z', 'M8 9h8M8 12.5h8M8 16h5'],
    'exit': ['M14 4h6v16h-6', 'M4 12h11', 'M11 8l4 4-4 4'],
    'reset': ['M5 12a7 7 0 1 1 2.6 5.4', 'M4 19.5v-4.6h4.6'],
    'open-in-browser': ['M10 5H5v14h14v-5', 'M14 4h6v6', 'M20 4l-9 9'],
    'download': ['M12 4v11', 'M7 11l5 5 5-5', 'M4.5 20h15'],
    'share': [circle(6, 12, 2.4), circle(18, 6, 2.4), circle(18, 18, 2.4), 'M8.1 11 15.9 7M8.1 13l7.8 4'],
    'link': ['M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1.2 1.2', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2'],
    'magnet-link': ['M5 4v8a7 7 0 0 0 14 0V4h-4.5v8a2.5 2.5 0 0 1-5 0V4z', 'M5 7.8h4.5M14.5 7.8H19'],

    // Playing.
    'play': [fill('M7 3.5v17L20.5 12z')],
    'pause': [fill('M6 4h4v16H6zM14 4h4v16h-4z')],
    'next': [fill('M5 4v16l11-8zM17.5 4h2.5v16h-2.5z')],
    'volume-high': [SPEAKER, 'M15.5 9.5a3.6 3.6 0 0 1 0 5', 'M17.8 7a7 7 0 0 1 0 10', 'M20 4.6a10.5 10.5 0 0 1 0 14.8'],
    'volume-medium': [SPEAKER, 'M15.5 9.5a3.6 3.6 0 0 1 0 5', 'M17.8 7a7 7 0 0 1 0 10'],
    'volume-low': [SPEAKER, 'M15.5 9.5a3.6 3.6 0 0 1 0 5'],
    'volume-mute': [SPEAKER, 'M16 9.5l5 5M21 9.5l-5 5'],
    'volume-off': [SPEAKER, 'M3.5 3.5l17 17'],
    'audio': [SPEAKER, 'M15.5 9.5a3.6 3.6 0 0 1 0 5', 'M17.8 7a7 7 0 0 1 0 10'],
    'audio-tracks': ['M5 10v4M9.5 5v14M14.5 8v8M19 11v2'],
    'subtitles': [FRAME, 'M6.5 11h4M12.5 11h5M6.5 14.5h7M15.5 14.5h2'],
    'maximize': ['M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5'],
    'minimize': ['M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5'],
    'aspect-ratio': [FRAME, 'M7 12V9h3M17 12v3h-3'],
    'scale': [FRAME, 'M7 12V9h3M17 12v3h-3'],
    'video-scale-fit': [SCREEN, 'M7 8.5h10v7H7z'],
    'video-scale-crop': ['M3 7h18v10H3z', 'M7 3.5v17M17 3.5v17'],
    'video-scale-stretch': [SCREEN, 'M7 12h10', 'M9 9.5 6.5 12 9 14.5M15 9.5l2.5 2.5-2.5 2.5'],
    'speed': ['M4.6 17.5a8.6 8.6 0 1 1 14.8 0', 'M12 13.5l4-5.5', dot(12, 13.5, 1.5)],
    'clock': [circle(12, 12, 9.3), 'M12 6.5V12l3.6 2.6'],
    'hdr': [FRAME, 'M6 9.5v5M6 12h2.4M8.4 9.5v5', 'M10.9 9.5v5h.8a2.5 2.5 0 0 0 0-5z', 'M15.6 14.5v-5h1.3a1.5 1.5 0 0 1 0 3h-1.3M17 12.5l1.2 2'],
    'cast': ['M3 8.5V5.5h18v13h-7', 'M3 12a7 7 0 0 1 7 7', 'M3 15.5A3.5 3.5 0 0 1 6.5 19', dot(3.6, 18.9, 1.1)],
    'tv': ['M3 5.5h18v12H3z', 'M8 21h8M12 17.5V21'],

    // Films, series and people.
    'movies-outline': FILM,
    'movies': [fill('M8 4h8v16H8z'), ...FILM],
    'series': SERIES,
    'channels-outline': [SCREEN, 'M10 9v6l5.2-3z'],
    'channels': [SCREEN, fill('M10 9v6l5.2-3z')],
    'episodes': ['M3 8h14v11H3z', 'M7 4.5h14v11'],
    'trailer': ['M4 10.5h16V20H4z', 'M4 10.5l-.8-3.6 15.6-3.3.8 3.6z', 'M8.2 5.9l1.9 3.5M13 4.9l1.9 3.4'],
    'actors': [circle(9, 8.5, 3.2), 'M2.8 20.5c0-4 2.6-6.2 6.2-6.2s6.2 2.2 6.2 6.2', circle(17.3, 9.3, 2.4), 'M17 14.3c2.7.2 4.4 2 4.4 5.2'],
    'person-outline': PERSON,
    'person': [fill(`${circle(12, 8, 3.7)}M4.5 21.5c0-4.9 3-7.5 7.5-7.5s7.5 2.6 7.5 7.5z`)],
    'account': [circle(12, 12, 9.3), circle(12, 10, 3), 'M6.3 19c.7-2.8 2.9-4.3 5.7-4.3s5 1.5 5.7 4.3'],

    // What the viewer keeps and marks. The eye has a slit pupil.
    'eye': ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z', fill('M12 8.3c1.9 1.5 1.9 5.9 0 7.4-1.9-1.5-1.9-5.9 0-7.4z')],
    'heart-outline': [HEART],
    'heart': [fill(HEART)],
    'thumbs-up-outline': THUMB,
    'thumbs-up': [fill('M3.5 10.5H7v10H3.5z'), fill('M8.3 11l3.4-7.5c1.5.2 2.1 1.5 1.8 2.9l-.7 3.1h6.2a1.8 1.8 0 0 1 1.7 2.3l-1.9 7a2.3 2.3 0 0 1-2.2 1.7H8.3z')],
    'add-to-library': ['M8 2.5h5.5L16.8 8l-2.6 11.5H7.6L4.8 8z', 'M18.5 14.5v6M15.5 17.5h6'],
    'cloud-library': ['M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.3A3.9 3.9 0 0 1 17.5 18.5z', 'M9.3 13.6l2 2 3.6-3.8'],
    'bin': BIN,
    'delete': BIN,

    // Notices and the rest.
    'warning': ['M12 3.5 22 20.5H2z', 'M12 10v5', dot(12, 17.6, 1.1)],
    'help': [circle(12, 12, 9.3), 'M9.3 9.6a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9', dot(12, 16.8, 1.1)],
    'about': [circle(12, 12, 9.3), 'M12 11v6', dot(12, 7.8, 1.1)],
    'notifications': ['M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15z', 'M10 21.5h4'],
    'megaphone': ['M4 10v4h3l8 4.5v-13L7 10z', 'M18 9.5a4 4 0 0 1 0 5'],
    'network': [circle(12, 12, 9.3), 'M2.7 12h18.6', 'M12 2.7c3.6 3.6 3.6 15 0 18.6', 'M12 2.7c-3.6 3.6-3.6 15 0 18.6'],
    'keyboard': ['M2.5 6.5h19v11h-19z', 'M8 14.5h8', dot(6.5, 10.3, 0.9), dot(10.2, 10.3, 0.9), dot(13.8, 10.3, 0.9), dot(17.5, 10.3, 0.9)],
    'day': [circle(12, 12, 4), 'M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1'],

    // Outline twins of icons above, for wherever Stremio Web asks for "<name>-outline".
    'search-outline': [circle(10.5, 10.5, 6.8), 'M15.5 15.5 21 21'],
    'filters-outline': ['M4 7h8M17 7h3M4 12h2M11 12h9M4 17h10M19 17h1', circle(14.5, 7, 2.2), circle(8.5, 12, 2.2), circle(16.5, 17, 2.2)],
    'notifications-outline': ['M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15z', 'M10 21.5h4'],
    'play-outline': ['M7 3.5v17L20.5 12z'],
    'series-outline': SERIES,
    'tv-outline': ['M3 5.5h18v12H3z', 'M8 21h8M12 17.5V21'],

    // SCARY's own mark, where Stremio Web shows Stremio's: the S, with the drop that runs from it.
    'symbol': [
        { line: 'M16.6 8.2C16.1 5.9 14.4 4.6 12 4.6c-2.6 0-4.4 1.4-4.4 3.5 0 4.5 8.9 2.6 8.9 7.3 0 2.2-1.9 3.7-4.4 3.7-2.5 0-4.3-1.3-4.800-3.5', width: 3.2 },
        fill('M17.3 17.2c.9 1.5 1.4 2.4 1.4 3.1a1.4 1.4 0 0 1-2.800 0c0-.7.5-1.600 1.4-3.1z'),
    ],
};

/** Icons that point along the reading direction: mirrored where the page reads right to left. */
const DIRECTIONAL_ICONS: readonly string[] = ['chevron-back', 'chevron-forward', 'caret-left', 'caret-right', 'exit'];

/** Marks that belong to other companies. They are not SCARY's to redraw and stay as Stremio Web has them. */
const BRAND_ICONS: readonly string[] = ['facebook', 'reddit', 'x', 'imdb', 'imdb-outline', 'trakt', 'vlc', 'android', 'linux', 'macos', 'windows'];

export { BRAND_ICONS, DIRECTIONAL_ICONS, ICONS };
export type { Glyph, Shape };
