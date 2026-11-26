// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The parental PIN: 4 to 8 digits, kept only as a salted PBKDF2 hash ("iterations:salt:hash", the format of SCARY
// for Android TV's Pin.kt). It guards a setting on a shared screen; anyone who can clear the browser's data can
// remove it, which the settings say.

const MIN_LENGTH = 4;
const MAX_LENGTH = 8;
const DEFAULT_ITERATIONS = 60_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const isValidPin = (pin: string): boolean => /^\d+$/.test(pin) && pin.length >= MIN_LENGTH && pin.length <= MAX_LENGTH;

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));

const fromBase64 = (text: string): Uint8Array | null => {
    try {
        return Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
    } catch {
        return null;
    }
};

const derive = async (pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> => {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, KEY_BITS);
    return new Uint8Array(bits);
};

/** The stored form of a new PIN. Throws when the PIN is not 4 to 8 digits. */
const hashPin = async (pin: string, iterations: number = DEFAULT_ITERATIONS): Promise<string> => {
    if (!isValidPin(pin)) throw new Error('The PIN needs 4 to 8 digits');
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    return `${iterations}:${toBase64(salt)}:${toBase64(await derive(pin, salt, iterations))}`;
};

/** True when `pin` is the one behind `stored`. A stored value that cannot be read matches nothing. */
const verifyPin = async (pin: string, stored: string | null | undefined): Promise<boolean> => {
    if (!isValidPin(pin) || typeof stored !== 'string') return false;
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    const iterations = Number(parts[0]);
    const salt = fromBase64(parts[1]);
    const expected = fromBase64(parts[2]);
    if (!Number.isInteger(iterations) || iterations <= 0 || iterations > 10_000_000 || salt === null || expected === null) return false;
    const actual = await derive(pin, salt, iterations);
    if (actual.length !== expected.length) return false;
    // Every byte is compared, so the time taken says nothing about where the first difference is.
    let difference = 0;
    for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
    return difference === 0;
};

export { MAX_LENGTH, MIN_LENGTH, hashPin, isValidPin, verifyPin };
