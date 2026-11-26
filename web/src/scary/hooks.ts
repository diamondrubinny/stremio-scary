// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// What SCARY's screens read: the saved state, the state of this visit, the library, and the rules that follow from them.

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { feedLanguageOf } from './content/addon';
import type { FeedLanguage } from './content/addon';
import { useScaryLibrary } from './content/library';
import type { Library } from './content/library';
import type { Film } from './domain/film';
import { familyAllows, needsPin } from './domain/lock';
import { getSession, isUnlocked, subscribeSession } from './state/session';
import type { Session } from './state/session';
import { store } from './state/store';
import type { ScaryState } from './state/store';

const useScaryState = (): ScaryState => useSyncExternalStore(store.subscribe, store.getState, store.getState);
const useSession = (): Session => useSyncExternalStore(subscribeSession, getSession, getSession);
const useFeedLanguage = (): FeedLanguage => feedLanguageOf(useTranslation().i18n.language);

type Rules = {
    library: Library,
    familyNight: boolean,
    /** Not shown at all: family night hides every film that is not among the gentlest. */
    isHidden: (film: Film | null | undefined) => boolean,
    /** Shown, but behind the parental PIN. */
    isLocked: (film: Film | null | undefined) => boolean,
    /** Not suggested: hidden, or marked "not for me". */
    isUnwanted: (film: Film) => boolean,
};

/** Family night and the parental lock, as questions about a film. `wanted` false does not download the library. */
const useScaryRules = (wanted = true): Rules => {
    const { familyNight, lock, notForMe } = useScaryState();
    const session = useSession();
    const lockActive = lock.enabled && lock.pin !== null;
    const library = useScaryLibrary(wanted || familyNight);
    const unlocked = isUnlocked() && session.unlockedAt !== null;
    const isHidden = useCallback((film: Film | null | undefined) => familyNight && !familyAllows(film), [familyNight]);
    const isLocked = useCallback((film: Film | null | undefined) => needsPin(lockActive, unlocked, lock.fromFear, film), [lockActive, unlocked, lock.fromFear]);
    const isUnwanted = useCallback((film: Film) => isHidden(film) || notForMe.includes(film.id), [isHidden, notForMe]);
    return useMemo(() => ({ library, familyNight, isHidden, isLocked, isUnwanted }), [library, familyNight, isHidden, isLocked, isUnwanted]);
};

/** Why a film is held back: by family night, by the parental lock, not yet known ('loading'), or not at all. */
type Hold = 'no' | 'loading' | 'by-family' | 'by-lock';

/**
 * Whether family night or the parental lock stands in front of a film. A film SCARY does not know (no id, or an id
 * that is not in the library) is treated as the scariest, as on Android TV; while the library has not answered, the
 * film is held; and a correct PIN opens what is held, for a while. Asks for nothing when nothing guards.
 */
const useScaryHold = (id: string | null | undefined): Hold => {
    const { familyNight, lock } = useScaryState();
    const guarded = familyNight || (lock.enabled && lock.pin !== null);
    const rules = useScaryRules(guarded);
    if (!guarded) return 'no';
    if (rules.library.status === 'loading') return 'loading';
    const film = typeof id === 'string' ? rules.library.byId.get(id) ?? null : null;
    if (rules.isHidden(film) && !isUnlocked()) return 'by-family';
    return rules.isLocked(film) ? 'by-lock' : 'no';
};

export { useFeedLanguage, useScaryHold, useScaryRules, useScaryState, useSession };
export type { Hold, Rules };
