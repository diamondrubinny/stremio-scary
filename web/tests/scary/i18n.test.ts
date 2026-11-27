// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import i18n from 'i18next';
import { GAP_STRINGS } from '../../src/scary/i18n/gaps';
import { addSubgenreLabels } from '../../src/scary/i18n/register';
import { NATIVE_STRINGS } from '../../src/scary/i18n/native';
import { STRINGS } from '../../src/scary/i18n/strings';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const english = require('stremio-translations/en-US.json') as Record<string, string>;

const placeholders = (text: string): string[] => (text.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? []).map((name) => name.replace(/\s/g, '')).sort();
const languages = ['he', 'ar', 'pt', 'ru'] as const;

describe('SCARY words', () => {
    test('names of subgenres from the feed are taken as plain words only', async () => {
        await i18n.init({ lng: 'en-US', resources: {} });
        addSubgenreLabels({ slasher: { en: 'Slasher', he: 'סלאשר' }, constructor: { en: 'x' }, toString: { en: 'x' }, __proto__: { en: 'x' }, 'Bad Id': { en: 'x' }, ghosts: { en: { deep: 'object' } }, long: { en: 'x'.repeat(61) } });
        const bundle = i18n.getResourceBundle('en-US', 'translation') as Record<string, unknown>;
        expect(Object.keys(bundle)).toEqual(['slasher']);
        expect(i18n.getResourceBundle('he-IL', 'translation')).toEqual({ slasher: 'סלאשר' });
        expect(({} as Record<string, unknown>).x).toBeUndefined();
    });

    test('a word filled in for Stremio Web exists there, and keeps its blanks', () => {
        const wrong: string[] = [];
        for (const language of languages) {
            for (const [key, text] of Object.entries(GAP_STRINGS[language])) {
                // A count has more forms in some languages than in English ("two", "few", "many"), and a form that
                // names the number in a word ("one catalog") needs no blank for it.
                const counted = /_(zero|one|two|few|many|other)$/.test(key);
                const source = english[key] ?? (counted ? english[key.replace(/_[a-z]+$/, '_other')] : undefined);
                const blanks = placeholders(text);
                if (typeof source !== 'string') wrong.push(`${language}.${key}: not a word of Stremio Web`);
                else if (counted ? !blanks.every((blank) => placeholders(source).includes(blank)) || (key.endsWith('_other') && !blanks.includes('{{count}}')) : blanks.join() !== placeholders(source).join()) wrong.push(`${language}.${key}: blanks differ`);
                else if (/stremio/i.test(text)) wrong.push(`${language}.${key}: names Stremio`);
            }
        }
        expect(wrong).toEqual([]);
    });

    test('every language has every one of SCARY\'s own words, with the same blanks', () => {
        const wrong: string[] = [];
        for (const [name, table] of [['native', NATIVE_STRINGS], ['web', STRINGS]] as const) {
            const source = table.en as Record<string, string>;
            for (const language of languages) {
                const words = table[language] as Record<string, string>;
                for (const [key, text] of Object.entries(source)) {
                    if (typeof words[key] !== 'string' || words[key].length === 0) wrong.push(`${name}.${language}.${key}: missing`);
                    else if (placeholders(words[key]).join() !== placeholders(text).join()) wrong.push(`${name}.${language}.${key}: blanks differ`);
                }
                for (const key of Object.keys(words)) if (!(key in source)) wrong.push(`${name}.${language}.${key}: not in English`);
            }
        }
        expect(wrong).toEqual([]);
    });
});
