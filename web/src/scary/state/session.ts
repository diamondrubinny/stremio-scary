// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// What holds only while the page is open: that the PIN was entered, a running sleep timer, a question waiting for
// the PIN. Never saved: closing the tab locks everything again.

import { stillUnlocked } from '../domain/lock';

type PinRequest = { purpose: 'verify' | 'create', resolve: (pin: string | null) => void };

type Session = {
    unlockedAt: number | null,
    /** When the sleep timer ends (epoch milliseconds), or null. */
    sleepUntil: number | null,
    pinRequest: PinRequest | null,
};

let session: Session = { unlockedAt: null, sleepUntil: null, pinRequest: null };
const listeners = new Set<() => void>();

const set = (change: Partial<Session>): void => {
    session = { ...session, ...change };
    listeners.forEach((listener) => listener());
};

const getSession = (): Session => session;
const subscribeSession = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const isUnlocked = (now: number = Date.now()): boolean => session.unlockedAt !== null && stillUnlocked(session.unlockedAt, now);
const unlock = (now: number = Date.now()): void => set({ unlockedAt: now });
const lockAgain = (): void => set({ unlockedAt: null });
const setSleepTimer = (minutes: number, now: number = Date.now()): void => set({ sleepUntil: minutes > 0 ? now + minutes * 60_000 : null });

/**
 * Asks the viewer for a PIN through the dialog the app keeps open for it (ui/PinDialog). Resolves with the digits
 * typed ("create": typed twice the same), or null when the viewer gives up. One question at a time.
 */
const askPin = (purpose: PinRequest['purpose']): Promise<string | null> => new Promise((resolve) => {
    session.pinRequest?.resolve(null);
    set({ pinRequest: { purpose, resolve: (pin) => {
        set({ pinRequest: null });
        resolve(pin);
    } } });
});

export { askPin, getSession, isUnlocked, lockAgain, setSleepTimer, subscribeSession, unlock };
export type { PinRequest, Session };
