// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import { createHash } from 'crypto';
import { qrCode, qrPath } from '../../src/scary/domain/qr';

const picture = (modules: boolean[][]): string => modules.map((row) => row.map((dark) => dark ? '#' : '.').join('')).join('\n');

describe('the QR code of a film\'s IMDb address', () => {
    test('has the right size for its length', () => {
        expect(qrCode('A')!.length).toBe(21);
        expect(qrCode('x'.repeat(14))!.length).toBe(21);
        expect(qrCode('x'.repeat(15))!.length).toBe(25);
        expect(qrCode('https://www.imdb.com/title/tt0081505/')!.length).toBe(29);
        expect(qrCode('https://www.imdb.com/title/tt12345678/')!.length).toBe(29);
        expect(qrCode('x'.repeat(43))).toBeNull();
    });

    test('carries the three finder patterns and the timing lines', () => {
        const rows = picture(qrCode('https://www.imdb.com/title/tt0081505/')!).split('\n');
        expect(rows[0].slice(0, 8)).toBe('#######.');
        expect(rows[0].slice(-8)).toBe('.#######');
        expect(rows[28].slice(0, 8)).toBe('#######.');
        expect(rows[3].slice(0, 7)).toBe('#.###.#');
        expect(rows[6].slice(8, 21)).toBe('#.#.#.#.#.#.#');
    });

    // These exact modules were read back as the same address by an independent QR reader (jsQR 1.4.0).
    test('is the code that was checked with a reader', () => {
        const code = picture(qrCode('https://www.imdb.com/title/tt0081505/')!);
        expect(createHash('sha256').update(code).digest('hex')).toBe('1bfcdd6d61c22f86ba9982983312c969b56b35d207f436145bf56e7a5d369294');
    });

    test('draws one square per dark module', () => {
        const modules = qrCode('A')!;
        const dark = modules.reduce((count, row) => count + row.filter(Boolean).length, 0);
        expect(qrPath(modules).split('M').length - 1).toBe(dark);
    });
});
