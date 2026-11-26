// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Builds the static catalog files.
//   node src/cli.ts --feed data/feed.json --legacy data/legacy.json --out dist [--min-films 4000]
// Exits with an error, and writes nothing, when the feed is refused or holds fewer films than --min-films.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { buildAll } from './addon.ts';
import { FeedError, parseFearLevels, parseFeed } from './validate.ts';

const main = async (): Promise<void> => {
    const { values } = parseArgs({
        options: {
            feed: { type: 'string' },
            legacy: { type: 'string' },
            out: { type: 'string' },
            'min-films': { type: 'string' },
        },
    });
    if (values.feed === undefined || values.out === undefined) {
        throw new FeedError('usage: node src/cli.ts --feed <feed.json> [--legacy <legacy.json>] --out <directory> [--min-films <n>]');
    }
    const fearLevels = values.legacy === undefined ? new Map<string, number>() : parseFearLevels(await readFile(values.legacy, 'utf8'));
    const feed = parseFeed(await readFile(values.feed, 'utf8'), fearLevels);
    const minFilms = Number(values['min-films'] ?? 0);
    if (!Number.isInteger(minFilms) || minFilms < 0) throw new FeedError('--min-films must be a whole number');
    if (feed.films.length < minFilms) {
        throw new FeedError(`the feed shrank: ${feed.films.length} films, at least ${minFilms} expected`);
    }

    const files = buildAll(feed);
    const out = resolve(values.out);
    await rm(out, { recursive: true, force: true });
    let bytes = 0;
    for (const [path, value] of files) {
        const target = join(out, ...path.split('/'));
        await mkdir(dirname(target), { recursive: true });
        const text = JSON.stringify(value);
        bytes += Buffer.byteLength(text);
        await writeFile(target, text);
    }
    const rated = feed.films.filter((film) => film.fear !== null).length;
    console.log(`feed of ${feed.generated}: ${feed.films.length} films (${rated} with a scare level), ${feed.rows.length} rows`);
    console.log(`dropped: ${feed.droppedFilms} films, ${feed.droppedRows} rows`);
    console.log(`wrote ${files.size} files, ${(bytes / 1_048_576).toFixed(1)} MB, to ${out}`);
};

main().catch((error: unknown) => {
    console.error(error instanceof FeedError ? `feed refused: ${error.message}` : error);
    process.exitCode = 1;
});
