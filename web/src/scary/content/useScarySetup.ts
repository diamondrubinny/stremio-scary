// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Keeps the viewer's local profile set up for SCARY: its catalogs installed in the interface language, the spotlight
// fed from them, and the page's language and direction. Everything here stays in this browser: there is no account,
// so nothing is synchronised anywhere.

import { useEffect } from 'react';
import { useCore } from 'stremio/core';
import { addSubgenreLabels } from '../i18n/register';
import { ADDON_ID, SPOTLIGHT_CATALOGS, feedBaseUrl, feedLanguageOf, isRtl, isScaryTransportUrl, transportUrlOf } from './addon';

const SETUP_KEY = 'scary.setup';
const SETUP_VERSION = '1';

/** Stremio's general catalogs that a new profile comes with and SCARY has no use for. Removed once, on first run. */
const isGeneralCatalogAddon = (transportUrl: string): boolean =>
    transportUrl.startsWith('https://v3-channels.strem.io/') || transportUrl.startsWith('https://caching.stremio.net/publicdomainmovies');

const manifests = new Map<string, Promise<AddonManifest | null>>();

const isScaryManifest = (value: unknown): value is AddonManifest => {
    const manifest = value as Partial<AddonManifest> | null;
    return typeof manifest === 'object' && manifest !== null && manifest.id === ADDON_ID &&
        typeof manifest.version === 'string' && Array.isArray(manifest.catalogs);
};

/** SCARY's manifest at `url`, asked for once per page load; null when it cannot be read or is not SCARY's. */
const loadManifest = (url: string): Promise<AddonManifest | null> => {
    let manifest = manifests.get(url);
    if (manifest === undefined) {
        manifest = fetch(url, { cache: 'no-cache' })
            .then((response) => response.ok ? response.json() : null)
            .then((value: unknown) => isScaryManifest(value) ? value : null)
            .catch(() => null);
        manifests.set(url, manifest);
    }
    return manifest;
};

let labelsRequested = false;

const loadLabels = (): void => {
    if (labelsRequested) return;
    labelsRequested = true;
    fetch(`${feedBaseUrl()}labels.json`, { cache: 'no-cache' })
        .then((response) => response.ok ? response.json() : null)
        .then((value: unknown) => addSubgenreLabels((value as { subgenres?: unknown } | null)?.subgenres))
        .catch(() => undefined);
};

const firstRunDone = (): boolean => {
    try {
        return window.localStorage.getItem(SETUP_KEY) === SETUP_VERSION;
    } catch {
        return true;
    }
};

const markFirstRunDone = (): void => {
    try {
        window.localStorage.setItem(SETUP_KEY, SETUP_VERSION);
    } catch {
        // Without storage the cleanup simply runs again; it only removes what is there.
    }
};

const useScarySetup = (profile: Profile): void => {
    const core = useCore();
    const language = feedLanguageOf(profile.settings?.interfaceLanguage);
    const addons = profile.addons;
    const spotlight = profile.settings?.boardSpotlight;

    useEffect(() => {
        document.documentElement.setAttribute('lang', language);
        document.documentElement.setAttribute('dir', isRtl(language) ? 'rtl' : 'ltr');
    }, [language]);

    useEffect(() => {
        loadLabels();
    }, []);

    // SCARY's catalogs, in the interface language and of the newest feed.
    useEffect(() => {
        if (!Array.isArray(addons)) return;
        let cancelled = false;
        const transportUrl = transportUrlOf(language);
        loadManifest(transportUrl).then((manifest) => {
            if (cancelled || manifest === null) return;
            const installed = addons.filter((addon) => isScaryTransportUrl(addon.transportUrl));
            const isCurrent = (addon: Addon): boolean => addon.transportUrl === transportUrl && addon.manifest.version === manifest.version;
            for (const addon of installed.filter((addon) => !isCurrent(addon))) {
                core.transport.dispatch({ action: 'Ctx', args: { action: 'UninstallAddon', args: addon } });
            }
            if (!installed.some(isCurrent)) {
                core.transport.dispatch({
                    action: 'Ctx',
                    args: {
                        action: 'InstallAddon',
                        args: { transportUrl, manifest, flags: { official: false, protected: false } },
                    },
                });
            }
        });
        return () => {
            cancelled = true;
        };
    }, [addons, language, core.transport]);

    // Once per browser: remove the general catalogs a new profile comes with.
    useEffect(() => {
        if (!Array.isArray(addons) || firstRunDone()) return;
        for (const addon of addons.filter((addon) => isGeneralCatalogAddon(addon.transportUrl))) {
            core.transport.dispatch({ action: 'Ctx', args: { action: 'UninstallAddon', args: addon } });
        }
        markFirstRunDone();
    }, [addons, core.transport]);

    // The spotlight shows SCARY's rows. A viewer's own choice among them is kept.
    useEffect(() => {
        if (!Array.isArray(addons) || !spotlight) return;
        const transportUrl = transportUrlOf(language);
        const scary = addons.find((addon) => addon.transportUrl === transportUrl);
        if (scary === undefined) return;
        if (spotlight.catalogs.length > 0 && spotlight.catalogs.every((request) => request.base === transportUrl)) return;
        const catalogs = SPOTLIGHT_CATALOGS
            .filter(({ type, id }) => (scary.manifest.catalogs ?? []).some((catalog) => catalog.type === type && catalog.id === id))
            .map(({ type, id }) => ({ base: transportUrl, path: { resource: 'catalog', type, id, extra: [] } }));
        if (catalogs.length === 0) return;
        core.transport.dispatch({
            action: 'Ctx',
            args: {
                action: 'UpdateSettings',
                args: { ...profile.settings, boardSpotlight: { ...spotlight, catalogs } },
            },
        });
    }, [addons, language, spotlight, profile.settings, core.transport]);
};

export default useScarySetup;
