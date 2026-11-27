// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import { HELLO, PLAYER_ORIGIN, embedUrl, filmOfHref, metaUrl, readPlayerMessage, trailerIdOf } from '../../src/scary/domain/trailer';
import { isBlockedUrl } from '../../src/scary/network/guard';

describe('a trailer that plays by itself', () => {
    test('knows the film a tile leads to', () => {
        expect(filmOfHref('#/detail/movie/tt0081505/tt0081505')).toEqual({ type: 'movie', id: 'tt0081505' });
        expect(filmOfHref('#/detail/series/tt4574334')).toEqual({ type: 'series', id: 'tt4574334' });
        expect(filmOfHref('#/metadetails/movie/tt12345678/x')).toEqual({ type: 'movie', id: 'tt12345678' });
        for (const href of ['#/detail/movie/kitsu:1', '#/detail/tv/tt0081505', '#/player/x/tt0081505', 'https://evil.example/#/detail/movie/tt0081505', '#/detail/movie/tt0081505x', null, 7, '#/detail/movie/' + 'tt0081505/'.repeat(40)]) {
            expect(filmOfHref(href)).toBeNull();
        }
    });

    test('asks Cinemeta about the film, at an address the network guard lets through', () => {
        expect(metaUrl('movie', 'tt0081505')).toBe('https://v3-cinemeta.strem.io/meta/movie/tt0081505.json');
        expect(isBlockedUrl(metaUrl('movie', 'tt0081505'))).toBe(false);
    });

    test('takes a trailer id only when it is YouTube\'s eleven characters', () => {
        expect(trailerIdOf({ meta: { trailerStreams: [{ title: 'The Shining', ytId: 'FZQvIJxG9Xs' }] } })).toBe('FZQvIJxG9Xs');
        expect(trailerIdOf({ meta: { trailers: [{ source: 'S014oGZiSdI', type: 'Trailer' }] } })).toBe('S014oGZiSdI');
        expect(trailerIdOf({ meta: { trailerStreams: [{ ytId: '"><script>' }, { ytId: 'a'.repeat(12) }, null, { ytId: 5 }], trailers: [{ source: 'ok_ID-12345' }] } })).toBe('ok_ID-12345');
        for (const answer of [null, 'x', {}, { meta: null }, { meta: { trailerStreams: 'FZQvIJxG9Xs' } }, { meta: { trailers: [{ source: 'https://youtu.be/FZQvIJxG9Xs' }] } }]) {
            expect(trailerIdOf(answer)).toBeNull();
        }
    });

    test('plays in YouTube\'s privacy-enhanced player, muted and without controls', () => {
        const url = new URL(embedUrl('FZQvIJxG9Xs', 'https://scary.example') ?? '');
        expect(url.origin).toBe(PLAYER_ORIGIN);
        expect(url.pathname).toBe('/embed/FZQvIJxG9Xs');
        expect(Object.fromEntries(url.searchParams)).toEqual({ autoplay: '1', mute: '1', controls: '0', rel: '0', playsinline: '1', fs: '0', disablekb: '1', iv_load_policy: '3', enablejsapi: '1', origin: 'https://scary.example' });
        for (const id of ['FZQvIJxG9Xs?x=1', '../evil', '', null, 'FZQvIJxG9X']) expect(embedUrl(id, 'https://scary.example')).toBeNull();
    });

    test('understands only what the player may say', () => {
        expect(HELLO.map((words) => JSON.parse(words))).toEqual([
            { event: 'listening', id: 1, channel: 'widget' },
            { event: 'command', func: 'addEventListener', args: ['onStateChange'], id: 1, channel: 'widget' },
            { event: 'command', func: 'addEventListener', args: ['onError'], id: 1, channel: 'widget' },
        ]);
        expect(readPlayerMessage('{"event":"onStateChange","info":1}')).toBe('playing');
        expect(readPlayerMessage('{"event":"infoDelivery","info":{"playerState":1}}')).toBe('playing');
        expect(readPlayerMessage('{"event":"infoDelivery","info":{"playerState":0}}')).toBe('ended');
        expect(readPlayerMessage('{"event":"onStateChange","info":0}')).toBe('ended');
        expect(readPlayerMessage('{"event":"onError","info":150}')).toBe('error');
        for (const data of ['{"event":"infoDelivery","info":{"playerState":2}}', '{"event":"infoDelivery","info":null}', '{"event":"initialDelivery"}', 'not json', '[]', 'null', { event: 'onError' }, '{"event":"onError"}'.padEnd(30_000, ' ')]) {
            expect(readPlayerMessage(data)).toBeNull();
        }
    });
});
