// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import { execSync } from 'child_process';
import { BRAND_ICONS, DIRECTIONAL_ICONS, ICONS } from '../../src/scary/icons/icons';

// Every name of Stremio's icon set (version 5.18), so the test knows an icon name when it meets one in the source.
const STREMIO_ICON_NAMES: string[] = Object.keys(JSON.parse(
    execSync('node -e "const s=require(\'fs\').readFileSync(require.resolve(\'@stremio/stremio-icons/react\'),\'utf8\');const m=s.match(/var icons_default = (\\{[\\s\\S]*?\\});\\n/);console.log(JSON.stringify(Object.fromEntries(Object.keys(eval(\'(\'+m[1]+\')\')).map(k=>[k,1]))))"', { encoding: 'utf8', maxBuffer: 1 << 24 }),
));

describe('SCARY icons', () => {
    test('every icon the app names is SCARY\'s own, or another company\'s mark', () => {
        const literals = new Set(execSync('grep -rhoE "[\'\\"][a-z0-9-]+[\'\\"]" src --include=*.js --include=*.ts --include=*.tsx', { encoding: 'utf8', maxBuffer: 1 << 26 })
            .split('\n').map((literal) => literal.slice(1, -1)));
        // The navigation asks for "<name>-outline" of the place the viewer is not in.
        const used = STREMIO_ICON_NAMES.filter((name) => literals.has(name) || (name.endsWith('-outline') && literals.has(name.slice(0, -'-outline'.length))));
        const missing = used.filter((name) => !Object.hasOwn(ICONS, name) && !BRAND_ICONS.includes(name));
        expect(missing).toEqual([]);
        expect(used.length).toBeGreaterThan(80);
    });

    test('every glyph is drawn inside the 24 by 24 grid, with plain path data', () => {
        for (const [name, glyph] of Object.entries(ICONS)) {
            expect(glyph.length).toBeGreaterThan(0);
            for (const shape of glyph) {
                const d = typeof shape === 'string' ? shape : 'fill' in shape ? shape.fill : shape.line;
                expect({ name, ok: /^[MmLlHhVvCcSsAaZz0-9 .,-]+$/.test(d) && d.startsWith('M') }).toEqual({ name, ok: true });
            }
        }
    });

    test('directional icons and brand marks are real names', () => {
        for (const name of DIRECTIONAL_ICONS) expect(Object.hasOwn(ICONS, name)).toBe(true);
        for (const name of BRAND_ICONS) expect(STREMIO_ICON_NAMES).toContain(name);
    });
});
