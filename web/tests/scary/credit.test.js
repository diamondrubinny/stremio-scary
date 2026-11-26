// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

const fs = require('fs');
const { default: readdirp } = require('readdirp');

const LICENSE = '// SPDX-License-Identifier: GPL-2.0-only\n';
const CREDIT = '// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny\n';

describe('SCARY credit', () => {
    test('every file of the SCARY layer carries its license and credit', async () => {
        const files = [];
        for (const root of ['src/scary', 'tests/scary']) {
            for await (const { fullPath } of readdirp(root, { fileFilter: ({ basename }) => /\.(ts|tsx|js|less)$/.test(basename) })) {
                files.push(fullPath);
            }
        }
        expect(files.length).toBeGreaterThan(0);
        for (const file of files) {
            const content = await fs.promises.readFile(file, 'utf8');
            expect({ file, ok: content.startsWith(LICENSE + CREDIT) }).toEqual({ file, ok: true });
        }
    });
});
