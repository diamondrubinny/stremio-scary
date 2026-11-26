// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

const ts = require('typescript');

module.exports = {
    process(source, fileName) {
        const { outputText } = ts.transpileModule(source, {
            fileName,
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
                jsx: ts.JsxEmit.React,
                esModuleInterop: true,
                sourceMap: false,
            },
        });
        return { code: outputText };
    },
};
