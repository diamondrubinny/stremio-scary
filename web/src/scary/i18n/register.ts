// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Adds SCARY's words to the translations Stremio Web already carries (i18next).

import i18n from 'i18next';
import { FEED_LANGUAGES } from '../content/addon';
import type { FeedLanguage } from '../content/addon';
import { STRINGS } from './strings';

/** The interface languages (as Stremio Web names them) served by each of SCARY's languages. */
const INTERFACE_CODES: Record<FeedLanguage, string[]> = {
    en: ['en-US'],
    he: ['he-IL'],
    ar: ['ar-AR'],
    pt: ['pt-BR', 'pt-PT'],
    ru: ['ru-RU'],
};

const SUBGENRE_ID = /^[a-z][a-z_]{1,31}$/;
const MAX_LABEL = 60;

const addBundle = (language: FeedLanguage, strings: Record<string, string>): void => {
    for (const code of INTERFACE_CODES[language]) {
        i18n.addResourceBundle(code, 'translation', strings, true, true);
    }
};

const addScaryStrings = (): void => {
    const add = () => FEED_LANGUAGES.forEach((language) => addBundle(language, STRINGS[language]));
    if (i18n.isInitialized) add();
    else i18n.on('initialized', add);
};

/**
 * The names of the subgenres (the "genre" filter of Discover), from feed/labels.json: { slasher: { en, he, … }, … }.
 * Read as untrusted: only plain ids and short strings are taken.
 */
const addSubgenreLabels = (subgenres: unknown): void => {
    if (typeof subgenres !== 'object' || subgenres === null) return;
    for (const language of FEED_LANGUAGES) {
        const strings: Record<string, string> = {};
        for (const [id, labels] of Object.entries(subgenres as Record<string, unknown>)) {
            const label = (labels as Record<string, unknown> | null)?.[language];
            if (SUBGENRE_ID.test(id) && typeof label === 'string' && label.length > 0 && label.length <= MAX_LABEL) {
                strings[id] = label;
            }
        }
        addBundle(language, strings);
    }
};

export { INTERFACE_CODES, addScaryStrings, addSubgenreLabels };
