#!/usr/bin/env node
// SPDX-License-Identifier: GPL-2.0-only
// Renders SCARY Web's illustrations (brand/illustrations/*.svg) into the picture files Stremio Web already uses, so
// no source file has to change to show them. Needs Playwright with Chromium (a development tool, not a dependency
// of the app):   node scripts/render-illustrations.cjs
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SOURCES = path.join(ROOT, 'brand', 'illustrations');
const IMAGES = path.join(ROOT, 'web', 'assets', 'images');

// source drawing -> [file, width, height]
const TARGETS = {
    'empty.svg': [['empty.png', 300, 300]],
    'library_placeholder.svg': [['library_placeholder.png', 500, 286]],
    'calendar_placeholder.svg': [['calendar_placeholder.png', 500, 286]],
    'avatar.svg': [['anonymous.png', 512, 512], ['default_avatar.png', 512, 512]],
    'subtitles_preview.svg': [['subtitles_preview.jpg', 1280, 720]],
};

(async () => {
    const browser = await chromium.launch();
    for (const [source, targets] of Object.entries(TARGETS)) {
        const svg = fs.readFileSync(path.join(SOURCES, source), 'utf8');
        for (const [file, width, height] of targets) {
            const page = await browser.newPage({ viewport: { width, height } });
            await page.setContent(`<body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg style="display:block;width:${width}px;height:${height}px" `)}</body>`);
            const jpeg = file.endsWith('.jpg');
            await page.screenshot({ path: path.join(IMAGES, file), omitBackground: !jpeg, ...(jpeg ? { type: 'jpeg', quality: 86 } : {}) });
            await page.close();
            console.log(`${source} -> web/assets/images/${file}`);
        }
    }
    // Drawings used as they are.
    for (const file of ['background_1.svg', 'background_2.svg']) {
        fs.copyFileSync(path.join(SOURCES, file), path.join(IMAGES, file));
        console.log(`${file} -> web/assets/images/${file}`);
    }
    await browser.close();
})();
