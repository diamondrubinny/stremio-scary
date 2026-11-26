// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import { useTranslation } from 'react-i18next';
import { useScaryRules, useScaryState } from '../hooks';

/**
 * What a poster tile shows. A film behind the parental lock shows no poster and no title, only "Locked"; opening it
 * asks for the PIN (ui/Overlays). Without a lock nothing changes, and the library is not even asked for.
 */
const useScaryTile = (id: unknown, poster: unknown, name: unknown): { poster: unknown, name: unknown } => {
    const { t } = useTranslation();
    const { lock } = useScaryState();
    const active = lock.enabled && lock.pin !== null && typeof id === 'string';
    const rules = useScaryRules(active);
    if (!active) return { poster, name };
    const film = rules.library.byId.get(id as string) ?? null;
    return rules.library.status === 'loading' || rules.isLocked(film) ? { poster: null, name: t('SCARY_LOCKED_BADGE') } : { poster, name };
};

export default useScaryTile;
