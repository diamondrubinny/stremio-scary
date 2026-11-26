// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

const crypto = require('crypto');
const fs = require('fs');
const ts = require('typescript');

const THIS_FILE = fs.readFileSync(__filename, 'utf8');

module.exports = {
    // A change to this file (the compiler options below) must not be answered from Jest's cache.
    getCacheKey(source, fileName) {
        return crypto.createHash('sha256').update(THIS_FILE).update(ts.version).update(fileName).update(source).digest('hex');
    },
    process(source, fileName) {
        const { outputText } = ts.transpileModule(source, {
            fileName,
            // The same language level as the build (tsconfig.json: ES5 with downlevelIteration), so a test fails
            // where the built app would: spreading a Set or looping over a Map is rewritten the same way here.
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES5,
                downlevelIteration: true,
                jsx: ts.JsxEmit.React,
                esModuleInterop: true,
                sourceMap: false,
            },
        });
        return { code: outputText };
    },
};
