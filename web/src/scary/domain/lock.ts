// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Family night and the parental lock, by the rules of SCARY for Android TV (FamilyNight.kt, ParentalGate.kt, Pin.kt).

import { fearForLock } from './film';
import type { Film } from './film';

const FAMILY_MAX_FEAR = 2;
/** How long one correct PIN keeps the lock open. */
const UNLOCK_WINDOW_MS = 30 * 60_000;
const FREE_ATTEMPTS = 3;
const BASE_WAIT_MS = 30_000;
const MAX_WAIT_MS = 15 * 60_000;

type Lockout = { failedAttempts: number, lockedUntil: number };

/** Family night shows only the gentlest films: rated, and no higher than 2. A film nobody rated is not shown. */
const familyAllows = (film: Film | null | undefined): boolean =>
    film !== null && film !== undefined && typeof film.f === 'number' && film.f <= FAMILY_MAX_FEAR;

/** True when the PIN stands between the viewer and this film. A film SCARY does not know is treated as the scariest. */
const needsPin = (lockEnabled: boolean, unlocked: boolean, lockFromFear: number, film: Film | null | undefined): boolean =>
    lockEnabled && !unlocked && fearForLock(film) >= lockFromFear;

const stillUnlocked = (unlockedAt: number, now: number): boolean =>
    now >= unlockedAt && now - unlockedAt <= UNLOCK_WINDOW_MS;

const remainingWait = (lockout: Lockout, now: number): number => Math.max(0, lockout.lockedUntil - now);

/** Three free tries, then a wait that doubles from 30 seconds up to 15 minutes. */
const afterWrongPin = (lockout: Lockout, now: number): Lockout => {
    const failedAttempts = lockout.failedAttempts + 1;
    if (failedAttempts < FREE_ATTEMPTS) return { failedAttempts, lockedUntil: 0 };
    const doublings = Math.min(failedAttempts - FREE_ATTEMPTS, 10);
    return { failedAttempts, lockedUntil: now + Math.min(BASE_WAIT_MS * 2 ** doublings, MAX_WAIT_MS) };
};

const NO_LOCKOUT: Lockout = { failedAttempts: 0, lockedUntil: 0 };

export { FAMILY_MAX_FEAR, NO_LOCKOUT, UNLOCK_WINDOW_MS, afterWrongPin, familyAllows, needsPin, remainingWait, stillUnlocked };
export type { Lockout };
