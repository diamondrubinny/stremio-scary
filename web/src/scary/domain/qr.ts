// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// A small QR code writer, for "scan to share this film": the film's IMDb address, drawn in the browser, with nothing
// sent anywhere. It writes what that needs and no more: bytes, error correction level M, versions 1 to 3 (up to 42
// bytes), one fixed mask. ISO/IEC 18004.

/** Data and error-correction codewords for versions 1 to 3 at level M (one block each). */
const VERSIONS = [{ data: 16, ec: 10 }, { data: 28, ec: 16 }, { data: 44, ec: 26 }];
/** Level M with mask 0, with its own error correction and the fixed XOR already applied. */
const FORMAT_BITS = 0b101010000010010;
const MAX_BYTES = 42;

// Arithmetic in GF(256) with the polynomial x^8 + x^4 + x^3 + x^2 + 1.
const EXP: number[] = [];
const LOG: number[] = [];
for (let power = 0, value = 1; power < 255; power++) {
    EXP[power] = value;
    LOG[value] = power;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
}
const multiply = (a: number, b: number): number => a === 0 || b === 0 ? 0 : EXP[(LOG[a] + LOG[b]) % 255];

/** The Reed-Solomon error-correction codewords for `data`. */
const errorCorrection = (data: number[], count: number): number[] => {
    let generator = [1];
    for (let power = 0; power < count; power++) {
        const next = new Array<number>(generator.length + 1).fill(0);
        generator.forEach((coefficient, index) => {
            next[index] ^= coefficient;
            next[index + 1] ^= multiply(coefficient, EXP[power]);
        });
        generator = next;
    }
    const remainder = new Array<number>(count).fill(0);
    for (const byte of data) {
        const factor = byte ^ remainder[0];
        remainder.shift();
        remainder.push(0);
        for (let index = 0; index < count; index++) remainder[index] ^= multiply(generator[index + 1], factor);
    }
    return remainder;
};

const utf8 = (text: string): number[] => Array.from(new TextEncoder().encode(text));

/**
 * The QR code of `text`: rows of modules, true for dark. Null when the text is longer than 42 bytes.
 * Draw it with a quiet zone of four light modules around.
 */
const qrCode = (text: string): boolean[][] | null => {
    const bytes = utf8(text);
    if (bytes.length > MAX_BYTES) return null;
    const version = VERSIONS.findIndex(({ data }) => bytes.length + 2 <= data) + 1;
    const { data: dataCount, ec: ecCount } = VERSIONS[version - 1];
    const size = 17 + 4 * version;

    // The message: byte mode, the length, the bytes, a terminator, then padding to the version's capacity.
    const bits: number[] = [];
    const push = (value: number, length: number) => {
        for (let bit = length - 1; bit >= 0; bit--) bits.push((value >> bit) & 1);
    };
    push(0b0100, 4);
    push(bytes.length, 8);
    bytes.forEach((byte) => push(byte, 8));
    push(0, Math.min(4, dataCount * 8 - bits.length));
    while (bits.length % 8 !== 0) bits.push(0);
    const codewords: number[] = [];
    for (let index = 0; index < bits.length; index += 8) codewords.push(parseInt(bits.slice(index, index + 8).join(''), 2));
    for (let pad = 0; codewords.length < dataCount; pad++) codewords.push(pad % 2 === 0 ? 0xec : 0x11);
    const stream: number[] = [];
    [...codewords, ...errorCorrection(codewords, ecCount)].forEach((codeword) => {
        for (let bit = 7; bit >= 0; bit--) stream.push((codeword >> bit) & 1);
    });

    const dark: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
    const reserved: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
    const set = (row: number, column: number, value: boolean) => {
        if (row < 0 || column < 0 || row >= size || column >= size) return;
        dark[row][column] = value;
        reserved[row][column] = true;
    };

    // The three finder patterns, each with its light border.
    for (const [top, left] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
        for (let row = -1; row <= 7; row++) {
            for (let column = -1; column <= 7; column++) {
                const ring = Math.max(Math.abs(row - 3), Math.abs(column - 3));
                set(top + row, left + column, ring <= 1 || ring === 3);
            }
        }
    }
    // The alignment pattern (versions 2 and 3 have one).
    if (version >= 2) {
        const centre = size - 7;
        for (let row = -2; row <= 2; row++) {
            for (let column = -2; column <= 2; column++) set(centre + row, centre + column, Math.max(Math.abs(row), Math.abs(column)) !== 1);
        }
    }
    // The timing patterns, and the module that is always dark.
    for (let index = 8; index < size - 8; index++) {
        set(6, index, index % 2 === 0);
        set(index, 6, index % 2 === 0);
    }
    set(size - 8, 8, true);
    // The format information, twice: around the top-left finder, and split between the other two.
    for (let index = 0; index < 15; index++) {
        const bit = ((FORMAT_BITS >> (14 - index)) & 1) === 1;
        const [row, column] = index < 6 ? [8, index] : index === 6 ? [8, 7] : index === 7 ? [8, 8] : index === 8 ? [7, 8] : [14 - index, 8];
        set(row, column, bit);
        if (index < 7) set(size - 1 - index, 8, bit);
        else set(8, size - 15 + index, bit);
    }

    // The data, in pairs of columns from the bottom right, upwards then downwards, skipping the timing column.
    let next = 0;
    let upwards = true;
    for (let right = size - 1; right > 0; right -= 2) {
        if (right === 6) right--;
        for (let step = 0; step < size; step++) {
            const row = upwards ? size - 1 - step : step;
            for (const column of [right, right - 1]) {
                if (reserved[row][column]) continue;
                const bit = next < stream.length ? stream[next] === 1 : false;
                next++;
                // Mask 0: every module where row + column is even is flipped.
                dark[row][column] = bit !== ((row + column) % 2 === 0);
            }
        }
        upwards = !upwards;
    }
    return dark;
};

/** The same code as the `d` of one SVG path, one unit per module, starting at (0, 0). */
const qrPath = (modules: boolean[][]): string => modules
    .map((row, y) => row.map((isDark, x) => isDark ? `M${x} ${y}h1v1h-1z` : '').join(''))
    .join('');

export { MAX_BYTES, qrCode, qrPath };
