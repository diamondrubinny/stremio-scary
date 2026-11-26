// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import { useMemo } from 'react';
import { useProfile } from 'stremio/common';
import { feedLanguageOf, transportUrlOf } from './addon';

/** The address of SCARY's add-on in the interface language, once it is installed in the local profile; else null. */
const useScaryAddon = (): string | null => {
    const profile = useProfile() as Profile;
    return useMemo(() => {
        const transportUrl = transportUrlOf(feedLanguageOf(profile.settings?.interfaceLanguage));
        return Array.isArray(profile.addons) && profile.addons.some((addon) => addon.transportUrl === transportUrl) ? transportUrl : null;
    }, [profile.addons, profile.settings?.interfaceLanguage]);
};

export default useScaryAddon;
