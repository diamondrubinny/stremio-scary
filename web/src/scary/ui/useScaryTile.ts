// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import { useTranslation } from 'react-i18next';
import { filmIdOfLinks } from '../domain/paths';
import { useScaryHold } from '../hooks';

/**
 * What a poster tile shows. A film that family night or the parental lock holds back shows no poster and no title,
 * only "Locked"; opening it meets the gate (ui/HeldDialog). The film is known by its id, or, where the screen gives
 * the tile none (Discover, the library, "continue watching"), by where the tile leads. Without a guard nothing
 * changes, and the library is not even asked for.
 */
const useScaryTile = (id: unknown, poster: unknown, name: unknown, links?: unknown): { poster: unknown, name: unknown } => {
    const { t } = useTranslation();
    const held = useScaryHeld(typeof id === 'string' ? id : filmIdOfLinks(links));
    return held ? { poster: null, name: t('SCARY_LOCKED_BADGE') } : { poster, name };
};

/** True when nothing of this film may be shown for now. */
const useScaryHeld = (id: string | null | undefined): boolean => useScaryHold(id) !== 'no';

export default useScaryTile;
export { useScaryHeld };
