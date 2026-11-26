// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import { discoverHref, feedBaseUrl, feedLanguageOf, isRtl, isScaryCatalog, isScaryTransportUrl, transportUrlOf, transportUrlOfDiscoverLink } from '../../src/scary/content/addon';
import { engineRange, scaryRows } from '../../src/scary/content/board';
import { defaultDiscoverRequest, narrowDiscover } from '../../src/scary/content/discover';
import { normalize, readIndex, searchFilms } from '../../src/scary/content/search';

const PAGE = 'https://scary.example/app/#/discover';
const HE = 'https://scary.example/app/feed/he/manifest.json';

describe('SCARY add-on addresses', () => {
    test('the feed is served beside the page, whatever the page address', () => {
        expect(feedBaseUrl(PAGE)).toBe('https://scary.example/app/feed/');
        expect(feedBaseUrl('http://localhost:8080/')).toBe('http://localhost:8080/feed/');
        expect(transportUrlOf('he', PAGE)).toBe(HE);
    });

    test('interface languages map to the five feed languages', () => {
        expect(['he-IL', 'heb', 'ar-AR', 'pt-BR', 'pt-PT', 'por', 'ru-RU', 'en-US', 'eng'].map(feedLanguageOf))
            .toEqual(['he', 'he', 'ar', 'pt', 'pt', 'pt', 'ru', 'en', 'en']);
        expect(['fr-FR', '', null, undefined, 42].map(feedLanguageOf)).toEqual(['en', 'en', 'en', 'en', 'en']);
        expect([isRtl('he'), isRtl('ar'), isRtl('en'), isRtl('ru'), isRtl('pt')]).toEqual([true, true, false, false, false]);
    });

    test('only SCARY\'s own manifests count as SCARY', () => {
        expect(isScaryTransportUrl(HE, PAGE)).toBe(true);
        expect(isScaryTransportUrl('https://scary.example/app/feed/xx/manifest.json', PAGE)).toBe(false);
        expect(isScaryTransportUrl('https://scary.example/app/feed/he/manifest.json?x=1', PAGE)).toBe(false);
        expect(isScaryTransportUrl('https://evil.example/app/feed/he/manifest.json', PAGE)).toBe(false);
        expect(isScaryTransportUrl('https://scary.example.evil.org/app/feed/he/manifest.json', PAGE)).toBe(false);
        expect(isScaryTransportUrl(undefined, PAGE)).toBe(false);
    });

    test('a catalog is SCARY\'s by its add-on address or by its Discover link', () => {
        const link = discoverHref(HE, 'movie', 'scary_slashers');
        expect(link).toBe('#/discover/https%3A%2F%2Fscary.example%2Fapp%2Ffeed%2Fhe%2Fmanifest.json/movie/scary_slashers');
        expect(transportUrlOfDiscoverLink(link)).toBe(HE);
        expect(transportUrlOfDiscoverLink(`${link}?genre=zombie`)).toBe(HE);
        expect(transportUrlOfDiscoverLink('#/discover/%E0%A4%A/movie/x')).toBeNull();
        expect(transportUrlOfDiscoverLink('#/library')).toBeNull();
        expect(isScaryCatalog({ deepLinks: { discover: link } }, PAGE)).toBe(true);
        expect(isScaryCatalog({ addon: { transportUrl: HE } }, PAGE)).toBe(true);
        expect(isScaryCatalog({ deepLinks: { discover: '#/discover/https%3A%2F%2Fv3-cinemeta.strem.io%2Fmanifest.json/movie/top' } }, PAGE)).toBe(false);
        expect(isScaryCatalog(null, PAGE)).toBe(false);
    });
});

describe('home rows', () => {
    const other = { deepLinks: { discover: '#/discover/https%3A%2F%2Fv3-cinemeta.strem.io%2Fmanifest.json/movie/top' } };
    const scary = (id: string) => ({ id, deepLinks: { discover: discoverHref(HE, 'movie', id) } });

    test('only SCARY\'s rows are shown, and ranges are translated to the engine\'s numbers', () => {
        const rows = scaryRows([other, other, scary('a'), scary('b'), other, scary('c')], PAGE);
        expect(rows.catalogs.map((row) => (row as { id: string }).id)).toEqual(['a', 'b', 'c']);
        expect(rows.indexes).toEqual([2, 3, 5]);
        expect(engineRange(rows.indexes, { start: 0, end: 1 })).toEqual({ start: 2, end: 3 });
        expect(engineRange(rows.indexes, { start: 1, end: 9 })).toEqual({ start: 3, end: 5 });
        expect(engineRange(rows.indexes, { start: -3, end: 0 })).toEqual({ start: 2, end: 2 });
        expect(engineRange([], { start: 0, end: 4 })).toBeNull();
        expect(scaryRows(null, PAGE)).toEqual({ catalogs: [], indexes: [] });
    });
});

describe('Discover', () => {
    test('offers SCARY\'s films and series only', () => {
        const discover = {
            catalog: null,
            selectable: {
                types: ['movie', 'series', 'channel', 'tv'].map((type) => ({ type, selected: type === 'movie', deepLinks: { discover: `#/discover/x/${type}/top` } })),
                catalogs: [
                    { id: 'top', deepLinks: { discover: '#/discover/https%3A%2F%2Fv3-cinemeta.strem.io%2Fmanifest.json/movie/top' } },
                    { id: 'scary_slashers', deepLinks: { discover: discoverHref(HE, 'movie', 'scary_slashers') } },
                ],
                extra: [],
            },
        };
        const narrowed = narrowDiscover(discover, HE, PAGE);
        expect(narrowed.selectable.types.map(({ type, deepLinks }) => [type, deepLinks.discover])).toEqual([
            ['movie', discoverHref(HE, 'movie', 'scary_movies')],
            ['series', discoverHref(HE, 'series', 'scary_series')],
        ]);
        expect(narrowed.selectable.catalogs.map((catalog) => (catalog as { id: string }).id)).toEqual(['scary_slashers']);
        expect(narrowed.selectable.extra).toBe(discover.selectable.extra);
        expect(narrowDiscover(discover, null, PAGE).selectable.types).toEqual([]);
        expect(defaultDiscoverRequest(HE)).toEqual({ base: HE, path: { resource: 'catalog', type: 'movie', id: 'scary_movies', extra: [] } });
    });
});

describe('search in the library', () => {
    const films = readIndex({ films: [
        { id: 'tt0081505', t: { en: 'The Shining', he: 'הניצוץ', ru: 'Сияние', ar: 'البريق', pt: 'O Iluminado' }, y: 1980, d: 'Stanley Kubrick' },
        { id: 'tt10000001', k: 's', t: { en: 'Shining Vale' }, y: 2022 },
        { id: 'tt0078748', t: { en: 'Alien', he: 'הנוסע השמיני' }, y: 1979, d: 'Ridley Scott' },
        { id: 'tt0090605', t: { en: 'Aliens' }, y: 1986 },
        { id: 'tt0245429', t: { en: 'Les Diaboliques', pt: 'As Diabólicas' }, y: 1955 },
        { id: 'not an id', t: { en: 'Broken' }, y: 2000 },
        { id: 'tt0000002', t: { he: 'בלי אנגלית' }, y: 2000 },
        { id: 'tt0000003', t: { en: 'Bad title', he: 5 }, y: 2000 },
        'nonsense',
    ] });
    const ids = (text: string) => searchFilms(films, text).map((film) => film.id);

    test('only well-formed films are read', () => {
        expect(films.map((film) => film.id)).toEqual(['tt0081505', 'tt10000001', 'tt0078748', 'tt0090605', 'tt0245429']);
        expect(readIndex(null)).toEqual([]);
        expect(readIndex({ films: 'x' })).toEqual([]);
    });

    test('a film is found by its title in any language', () => {
        expect(ids('shining')).toEqual(['tt10000001', 'tt0081505']);
        expect(ids('the shining')).toEqual(['tt0081505']);
        expect(ids('הניצוץ')).toEqual(['tt0081505']);
        expect(ids('сияние')).toEqual(['tt0081505']);
        expect(ids('البريق')).toEqual(['tt0081505']);
        expect(ids('iluminado')).toEqual(['tt0081505']);
        expect(ids('הנוסע')).toEqual(['tt0078748']);
    });

    test('accents, points, case and punctuation do not matter', () => {
        expect(normalize('  Les  Diabóliques! ')).toBe('les diaboliques');
        expect(normalize('הַנִּיצוֹץ')).toBe('הניצוץ');
        expect(ids('DIABOLICAS')).toEqual(['tt0245429']);
        expect(ids('diaboliques, les')).toEqual(['tt0245429']);
    });

    test('the whole title comes before a longer one, and a director after every title', () => {
        expect(ids('alien')).toEqual(['tt0078748', 'tt0090605']);
        expect(ids('aliens')).toEqual(['tt0090605']);
        expect(ids('kubrick')).toEqual(['tt0081505']);
        expect(ids('1979')).toEqual(['tt0078748']);
    });

    test('too short, empty and unmatched searches find nothing', () => {
        expect(ids('a')).toEqual([]);
        expect(ids('   ')).toEqual([]);
        expect(ids('zzzz')).toEqual([]);
        expect(searchFilms(films, 'ali', 1).length).toBe(1);
    });
});
