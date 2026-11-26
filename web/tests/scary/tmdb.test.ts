// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import { checkRequest, comingSoonRequest, countryOf, detailsRequest, findRequest, imageUrl, keyKind, readComingSoon, readDetails, readFind, readImdbId } from '../../src/scary/tmdb/client';

const V3 = '0123456789abcdef0123456789abcdef';
const V4 = `${'a'.repeat(20)}.${'b'.repeat(40)}.${'c'.repeat(30)}`;

describe('TMDB requests', () => {
    test('a key is an API key or an access token, and nothing else', () => {
        expect([keyKind(V3), keyKind(V3.toUpperCase()), keyKind(V4)]).toEqual(['v3', 'v3', 'v4']);
        expect([keyKind(''), keyKind('abc'), keyKind(`${V3}0`), keyKind('a.b.c'), keyKind(null), keyKind(`${V3}&x=1`), keyKind('x'.repeat(700))]).toEqual([null, null, null, null, null, null, null]);
    });

    test('an API key goes in the address, an access token in a header', () => {
        expect(checkRequest(V3)).toEqual({ url: `https://api.themoviedb.org/3/configuration?api_key=${V3}`, headers: { accept: 'application/json' } });
        expect(checkRequest(V4)).toEqual({ url: 'https://api.themoviedb.org/3/configuration', headers: { accept: 'application/json', authorization: `Bearer ${V4}` } });
        expect(findRequest(V3, 'tt0081505').url).toBe(`https://api.themoviedb.org/3/find/tt0081505?external_source=imdb_id&api_key=${V3}`);
        expect(detailsRequest(V4, 'movie', 694).url).toBe('https://api.themoviedb.org/3/movie/694?append_to_response=credits%2Cwatch%2Fproviders');
        expect(detailsRequest(V4, 'tv', 66732).url).toContain('aggregate_credits');
    });

    test('coming soon: horror, from tomorrow to six months on, in the viewer\'s country', () => {
        const url = new URL(comingSoonRequest(V4, '2026-11-26', 'IL').url);
        expect(Object.fromEntries(url.searchParams)).toEqual({
            with_genres: '27',
            sort_by: 'popularity.desc',
            'primary_release_date.gte': '2026-11-27',
            'primary_release_date.lte': '2027-05-26',
            region: 'IL',
        });
        expect(new URL(comingSoonRequest(V4, '2026-11-26', 'x').url).searchParams.has('region')).toBe(false);
    });

    test('the country comes from the language setting', () => {
        expect(['he-IL', 'en-GB', 'pt-PT', 'he', 'iw', 'ru', 'ar', 'pt', 'en', 'fr', 'xx-zz1', null].map(countryOf))
            .toEqual(['IL', 'GB', 'PT', 'IL', 'IL', 'RU', 'SA', 'BR', 'US', 'US', 'US', 'US']);
    });
});

describe('TMDB answers are read as untrusted', () => {
    test('pictures come only from TMDB, by a plain file name', () => {
        expect(imageUrl('/abcDEF123.jpg', 'w185')).toBe('https://image.tmdb.org/t/p/w185/abcDEF123.jpg');
        for (const path of ['//evil.example/x.jpg', '/../x.jpg', 'https://evil.example/x.jpg', '/a b.jpg', '/x.jpg?y', '/x.exe', null, 5]) {
            expect(imageUrl(path, 'w185')).toBeNull();
        }
    });

    test('find gives the id of the right kind', () => {
        const answer = { movie_results: [{ id: 694 }], tv_results: [{ id: 'x' }] };
        expect([readFind(answer, 'movie'), readFind(answer, 'tv'), readFind({}, 'movie'), readFind(null, 'movie'), readFind({ movie_results: [{ id: -1 }] }, 'movie')])
            .toEqual([694, null, null, null, null]);
    });

    test('details: cast, makers and the stores of one country', () => {
        const details = readDetails({
            credits: { cast: [
                { name: 'Jack Nicholson', character: 'Jack Torrance', profile_path: '/jack123.jpg' },
                { name: 'Shelley Duvall', character: 'Wendy', profile_path: '//evil.example/x.jpg' },
                { name: 'bad‮name', character: 'x' },
                { character: 'nobody' },
                'nonsense',
            ] },
            production_companies: [{ name: 'Hawk Films' }, { name: '' }, { name: 'Peregrine' }, 7],
            'watch/providers': { results: {
                IL: { link: 'https://www.themoviedb.org/movie/694-the-shining/watch?locale=IL', flatrate: [{ provider_name: 'Netflix' }, { provider_name: 'Netflix' }], rent: [{ provider_name: 'Apple TV' }], buy: [{ provider_name: 5 }] },
                US: { link: 'javascript:alert(1)', buy: [{ provider_name: 'Amazon Video' }] },
            } },
        }, 'IL');
        expect(details.cast).toEqual([
            { name: 'Jack Nicholson', character: 'Jack Torrance', photo: 'https://image.tmdb.org/t/p/w185/jack123.jpg' },
            { name: 'Shelley Duvall', character: 'Wendy', photo: null },
        ]);
        expect(details.studios).toEqual(['Hawk Films', 'Peregrine']);
        expect(details.offers).toEqual({ link: 'https://www.themoviedb.org/movie/694-the-shining/watch?locale=IL', included: ['Netflix'], rent: ['Apple TV'], buy: [] });
        expect(readDetails({ 'watch/providers': { results: { US: { link: 'javascript:alert(1)', buy: [{ provider_name: 'Amazon Video' }] } } } }, 'US').offers)
            .toEqual({ link: null, included: [], rent: [], buy: ['Amazon Video'] });
        expect(readDetails({ 'watch/providers': { results: { US: {} } } }, 'US').offers).toBeNull();
        expect(readDetails({}, 'constructor').offers).toBeNull();
        expect(readDetails('x', 'IL')).toEqual({ cast: [], studios: [], offers: null });
        expect(readDetails({ aggregate_credits: { cast: [{ name: 'A', roles: [{ character: 'B' }] }] } }, 'IL').cast).toEqual([{ name: 'A', character: 'B', photo: null }]);
    });

    test('coming soon keeps only complete films, and an IMDb id must look like one', () => {
        expect(readComingSoon({ results: [
            { id: 1, title: 'One', poster_path: '/one1.jpg', release_date: '2027-01-02' },
            { id: 2, title: 'No poster', release_date: '2027-01-02' },
            { id: 3, title: 'Adult', poster_path: '/three.jpg', release_date: '2027-01-02', adult: true },
            { id: 4, title: 'Bad date', poster_path: '/four.jpg', release_date: 'soon' },
            'x',
        ] })).toEqual([{ tmdbId: 1, title: 'One', poster: 'https://image.tmdb.org/t/p/w342/one1.jpg', date: '2027-01-02' }]);
        expect(readComingSoon(null)).toEqual([]);
        expect([readImdbId({ imdb_id: 'tt1234567' }), readImdbId({ imdb_id: 'nm1234567' }), readImdbId({}), readImdbId(null)]).toEqual(['tt1234567', null, null, null]);
    });
});
