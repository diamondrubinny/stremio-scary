// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// TypeScript tests run through the TypeScript compiler that is already installed; JavaScript tests run as before.
module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': '<rootDir>/tests/scary/typescriptTransform.js',
        '^.+\\.jsx?$': 'babel-jest',
    },
    moduleNameMapper: {
        '^stremio/(.*)$': '<rootDir>/src/$1',
    },
    testPathIgnorePatterns: ['/node_modules/', '/build/'],
};
