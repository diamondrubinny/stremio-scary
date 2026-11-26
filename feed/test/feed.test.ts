// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ALL_CATALOG, PAGE_SIZE, buildAll, buildLanguage, toMeta } from '../src/addon.ts';
import type { Manifest, MetaPreview } from '../src/addon.ts';
import { LANGUAGES, ROW_LABELS, SUBGENRE_LABELS } from '../src/labels.ts';
import { FeedError, MIN_FILMS, parseFearLevels, parseFeed } from '../src/validate.ts';

const YEAR = 2026;
const imdb = (n: number): string => `tt${String(n).padStart(7, '0')}`;
const film = (n: number, extra: Record<string, unknown> = {}): Record<string, unknown> =>
    ({ imdb: imdb(n), t: { en: `Film ${n}` }, y: 1990, ...extra });
const feedOf = (films: unknown[], rows: unknown[] = [], extra: Record<string, unknown> = {}): string =>
    JSON.stringify({ version: 1, generated: '2026-11-24', films, rows, ...extra });
const manyFilms = (count: number = MIN_FILMS): Record<string, unknown>[] => Array.from({ length: count }, (_, n) => film(n + 1));
const parse = (text: string, fear = new Map<string, number>()) => parseFeed(text, fear, YEAR);

test('a file that is not a usable feed is refused whole', () => {
    assert.throws(() => parse('not json'), FeedError);
    assert.throws(() => parse('[]'), FeedError);
    assert.throws(() => parse(feedOf(manyFilms(), [], { version: 2 })), /unsupported feed version/);
    assert.throws(() => parse(feedOf(manyFilms(), [], { generated: 'yesterday' })), /without a date/);
    assert.throws(() => parse(feedOf(manyFilms(MIN_FILMS - 1))), /too few films/);
    assert.throws(() => parse(feedOf(manyFilms(12_001))), /too many/);
    assert.throws(() => parse(' '.repeat(3_000_001)), /too large/);
});

test('a film that breaks a rule is dropped and counted', () => {
    const bad = [
        { imdb: 'nm0000001', t: { en: 'A person' }, y: 1990 },
        { imdb: 'tt123', t: { en: 'Short id' }, y: 1990 },
        film(900_001, { y: 1800 }),
        film(900_002, { y: YEAR + 1 }),
        film(900_003, { t: { he: 'בלי אנגלית' } }),
        film(900_004, { t: { en: 'ok', xx: 'unknown language' } }),
        film(900_005, { t: { en: 'bidi ‮ override' } }),
        film(900_006, { t: { en: 'line\nbreak' } }),
        film(900_007, { t: { en: 'x'.repeat(121) } }),
        film(900_008, { g: ['<script>'] }),
        film(900_009, { r: 11 }),
        film(900_010, { k: 'documentary' }),
        film(900_011, { e: 2000 }),
        film(900_012, { d: '' }),
        film(1),
        'not an object',
    ];
    const feed = parse(feedOf([...manyFilms(), ...bad]));
    assert.equal(feed.films.length, MIN_FILMS);
    assert.equal(feed.droppedFilms, bad.length);
});

test('films are read as what the feed says they are', () => {
    const feed = parse(feedOf([
        ...manyFilms(),
        film(800_001, { k: 'thriller', g: ['Crime'], r: 8.6, m: 119, d: ' Jonathan Demme ', s: ['crime', 'psychological', 'made_up', 'crime'], p: 103 }),
        film(800_002, { k: 'series', y: 2016, e: 2025, m: 50 }),
        film(800_003, { k: 'series', y: 2022, on: true }),
        film(800_004, { m: 9000, r: null }),
    ]), new Map([[imdb(800_001), 4]]));
    const byId = new Map(feed.films.map((entry) => [entry.imdb, entry]));
    const thriller = byId.get(imdb(800_001))!;
    assert.deepEqual(
        [thriller.type, thriller.thriller, thriller.director, thriller.minutes, thriller.rating, thriller.fear, thriller.prominence],
        ['movie', true, 'Jonathan Demme', 119, 8.6, 4, 103],
    );
    assert.deepEqual(thriller.subgenres, ['crime', 'psychological']);
    assert.deepEqual(toMeta(thriller, 'en').genres, ['Thriller', 'Crime']);
    assert.equal(toMeta(byId.get(imdb(800_002))!, 'en').releaseInfo, '2016-2025');
    assert.equal(toMeta(byId.get(imdb(800_003))!, 'en').releaseInfo, '2022-');
    assert.equal(byId.get(imdb(800_004))!.minutes, 0);
    assert.equal(byId.get(imdb(1))!.fear, null);
});

test('a row keeps only known films, and needs a name and enough films', () => {
    const ids = Array.from({ length: 100 }, (_, n) => imdb(n + 1));
    const feed = parse(feedOf(manyFilms(), [
        { id: 'slashers', films: [...ids, ...ids, 'tt9999999', 42] },
        { id: 'zombies', films: ids.slice(0, 7) },
        { id: 'made_up_row', films: ids },
        { id: 'slashers', films: ids },
        { id: 'Bad Id', films: ids },
        'not a row',
    ]));
    assert.deepEqual(feed.rows.map((row) => [row.id, row.films.length]), [['slashers', 80]]);
    assert.equal(feed.droppedRows, 5);
});

test('scare levels come only from a well-formed legacy file', () => {
    const levels = parseFearLevels(JSON.stringify({ films: {
        a: { imdb: 'tt0081505', fear: 5 }, b: { imdb: 'tt0000001', fear: 6 }, c: { imdb: 'bad', fear: 3 }, d: { imdb: 'tt0000002', fear: 2.5 }, e: 'x',
    } }));
    assert.deepEqual([...levels], [['tt0081505', 5]]);
    assert.equal(parseFearLevels('not json').size, 0);
    assert.equal(parseFearLevels('[]').size, 0);
});

test('titles follow the language and fall back to English', () => {
    const feed = parse(feedOf([...manyFilms(), film(700_001, { t: { en: 'The Shining', he: 'הניצוץ' } })]));
    const shining = feed.films.at(-1)!;
    assert.equal(toMeta(shining, 'he').name, 'הניצוץ');
    assert.equal(toMeta(shining, 'ru').name, 'The Shining');
    assert.equal(toMeta(shining, 'he').poster, `https://images.metahub.space/poster/small/${imdb(700_001)}/img`);
});

test('pages: both orders of skip and genre, and an empty page at the end', () => {
    const films = Array.from({ length: MIN_FILMS }, (_, n) => film(n + 1, { s: n < 250 ? ['zombie'] : n < 255 ? ['witch'] : [], p: MIN_FILMS - n }));
    const files = buildLanguage(parse(feedOf(films)), 'en');
    const metas = (path: string): MetaPreview[] => (files.get(path) as { metas: MetaPreview[] }).metas;
    const base = `catalog/movie/${ALL_CATALOG.movie}`;
    assert.equal(metas(`${base}.json`).length, PAGE_SIZE);
    assert.equal(metas(`${base}.json`)[0].id, imdb(1));
    assert.equal(metas(`${base}/skip=900.json`).length, PAGE_SIZE);
    assert.equal(metas(`${base}/skip=1000.json`).length, 0);
    assert.equal(metas(`${base}/genre=zombie.json`).length, PAGE_SIZE);
    assert.equal(metas(`${base}/skip=200&genre=zombie.json`).length, 50);
    assert.deepEqual(files.get(`${base}/genre=zombie&skip=200.json`), files.get(`${base}/skip=200&genre=zombie.json`));
    assert.equal(metas(`${base}/skip=300&genre=zombie.json`).length, 0);
    // Five films are too few for a filter of their own.
    assert.equal(files.has(`${base}/genre=witch.json`), false);
    const manifest = files.get('manifest.json') as Manifest;
    assert.deepEqual(manifest.catalogs.at(-1)!.extra, [{ name: 'genre', options: ['zombie'] }, { name: 'skip' }]);
    assert.equal(manifest.version, '1.20261124.0');
    assert.deepEqual(manifest.resources, ['catalog']);
});

test('every label exists in every language', () => {
    for (const labels of [...Object.values(ROW_LABELS), ...Object.values(SUBGENRE_LABELS)]) {
        for (const language of LANGUAGES) assert.ok(labels[language].trim().length > 0);
    }
});

test('the bundled feed builds, in every language', () => {
    const fear = parseFearLevels(readFileSync(new URL('../data/legacy.json', import.meta.url), 'utf8'));
    const feed = parseFeed(readFileSync(new URL('../data/feed.json', import.meta.url), 'utf8'), fear);
    assert.ok(feed.films.length >= 4_000);
    assert.equal(feed.droppedFilms, 0);
    assert.equal(feed.droppedRows, 0);
    assert.equal(feed.rows.length, Object.keys(ROW_LABELS).length);
    assert.ok(feed.films.filter((entry) => entry.fear !== null).length >= 300);
    const files = buildAll(feed);
    for (const language of LANGUAGES) {
        const manifest = files.get(`${language}/manifest.json`) as Manifest;
        assert.equal(manifest.catalogs.length, feed.rows.length + 2);
        for (const catalog of manifest.catalogs) {
            assert.ok(files.has(`${language}/catalog/${catalog.type}/${catalog.id}.json`), `${language}/${catalog.id}`);
            for (const option of catalog.extra?.find((extra) => extra.name === 'genre')?.options ?? []) {
                assert.match(option, /^[a-z_]+$/);
                assert.ok(files.has(`${language}/catalog/${catalog.type}/${catalog.id}/genre=${option}.json`));
            }
        }
    }
    for (const path of files.keys()) assert.match(path, /^[a-z0-9_/=&.]+$/);
    assert.ok(files.has('index.json'));
});
