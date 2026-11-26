// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import { BLOCKED_HOSTS, installNetworkGuard, isBlockedUrl } from '../../src/scary/network/guard';

describe('network guard', () => {
    test('blocks the account services', () => {
        expect(isBlockedUrl('https://api.strem.io/api/getGeo')).toBe(true);
        expect(isBlockedUrl('https://api.strem.io/config')).toBe(true);
        expect(isBlockedUrl('http://API.STREM.IO/api/getModal')).toBe(true);
        expect(isBlockedUrl('https://www.strem.io/trakt/auth/x')).toBe(true);
        expect(isBlockedUrl('https://link.stremio.com/api/v2/create?type=Create')).toBe(true);
    });

    test('lets film information, images and add-ons through', () => {
        expect(isBlockedUrl('https://v3-cinemeta.strem.io/meta/movie/tt0081505.json')).toBe(false);
        expect(isBlockedUrl('https://images.metahub.space/poster/small/tt0081505/img')).toBe(false);
        expect(isBlockedUrl('https://example.org/manifest.json')).toBe(false);
        expect(isBlockedUrl('http://127.0.0.1:11470/settings')).toBe(false);
    });

    test('is not fooled by look-alike addresses', () => {
        expect(isBlockedUrl('https://api.strem.io.example.org/api/getGeo')).toBe(false);
        expect(isBlockedUrl('https://example.org/api.strem.io')).toBe(false);
        expect(isBlockedUrl('https://user@api.strem.io/config')).toBe(true);
        expect(isBlockedUrl('https://api.strem.io:443/config')).toBe(true);
        expect(isBlockedUrl('https://api.strem.io./config')).toBe(false);
    });

    test('allows relative and unreadable addresses', () => {
        expect(isBlockedUrl('/feed/en/manifest.json', 'https://scary.example/')).toBe(false);
        expect(isBlockedUrl('', undefined)).toBe(false);
        expect(isBlockedUrl('not a url')).toBe(false);
    });

    test('a guarded fetch rejects blocked requests and forwards the rest', async () => {
        const calls: string[] = [];
        const scope = {
            fetch: (input: never) => {
                calls.push(String(input));
                return Promise.resolve('ok');
            },
            location: { href: 'https://scary.example/' },
        };
        installNetworkGuard(scope);
        const guarded = scope.fetch as unknown as (input: unknown) => Promise<unknown>;

        await expect(guarded('https://api.strem.io/api/getGeo')).rejects.toThrow('SCARY network guard');
        await expect(guarded({ url: 'https://api.strem.io/config' })).rejects.toThrow(TypeError);
        await expect(guarded(new URL('https://www.strem.io/x'))).rejects.toThrow(TypeError);
        await expect(guarded('https://v3-cinemeta.strem.io/manifest.json')).resolves.toBe('ok');
        await expect(guarded('feed/en/manifest.json')).resolves.toBe('ok');
        expect(calls).toEqual(['https://v3-cinemeta.strem.io/manifest.json', 'feed/en/manifest.json']);
    });

    test('the list holds host names only', () => {
        for (const host of BLOCKED_HOSTS) {
            expect(host).toMatch(/^[a-z0-9.-]+$/);
        }
    });
});
