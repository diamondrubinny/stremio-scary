// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Keeps the viewer's local profile set up for SCARY: its catalogs installed in the interface language, the spotlight
// fed from them, and the page's language and direction. Everything here stays in this browser: there is no account,
// so nothing is synchronised anywhere.

import { useEffect, useState } from 'react';
import { useCore } from 'stremio/core';
import { addSubgenreLabels } from '../i18n/register';
import { ADDON_ID, SPOTLIGHT_CATALOGS, feedBaseUrl, feedLanguageOf, interfaceLanguageOfBrowser, isRtl, isScaryTransportUrl, transportUrlOf } from './addon';

const SETUP_KEY = 'scary.setup';
const SETUP_VERSION = '1';
/** How long the first run waits for the engine to take the browser's language before going on without it. */
const LANGUAGE_TIMEOUT = 3000;

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
    const interfaceLanguage = profile.settings?.interfaceLanguage;
    // On the first run the interface takes the browser's language, when it is one of SCARY's. Nothing else is set up
    // until that is settled, so no later change is made from settings that still hold the old language.
    const [settled, setSettled] = useState(firstRunDone);

    useEffect(() => {
        document.documentElement.setAttribute('lang', language);
        document.documentElement.setAttribute('dir', isRtl(language) ? 'rtl' : 'ltr');
    }, [language]);

    useEffect(() => {
        loadLabels();
    }, []);

    useEffect(() => {
        if (settled || typeof interfaceLanguage !== 'string') return;
        const wanted = interfaceLanguageOfBrowser(window.navigator?.language);
        if (wanted === null || wanted === interfaceLanguage) {
            setSettled(true);
            return;
        }
        core.transport.dispatch({
            action: 'Ctx',
            args: { action: 'UpdateSettings', args: { ...profile.settings, interfaceLanguage: wanted } },
        });
        const timer = setTimeout(() => setSettled(true), LANGUAGE_TIMEOUT);
        return () => clearTimeout(timer);
    }, [settled, interfaceLanguage, profile.settings, core.transport]);

    // SCARY's catalogs, in the interface language and of the newest feed.
    useEffect(() => {
        if (!settled || !Array.isArray(addons)) return;
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
    }, [settled, addons, language, core.transport]);

    // Once per browser: remove the general catalogs a new profile comes with.
    useEffect(() => {
        if (!settled || !Array.isArray(addons) || firstRunDone()) return;
        for (const addon of addons.filter((addon) => isGeneralCatalogAddon(addon.transportUrl))) {
            core.transport.dispatch({ action: 'Ctx', args: { action: 'UninstallAddon', args: addon } });
        }
        markFirstRunDone();
    }, [settled, addons, core.transport]);

    // The spotlight shows SCARY's rows. A viewer's own choice among them is kept.
    useEffect(() => {
        if (!settled || !Array.isArray(addons) || !spotlight) return;
        const transportUrl = transportUrlOf(language);
        const scary = addons.find((addon) => addon.transportUrl === transportUrl);
        if (scary === undefined) return;
        if (spotlight.catalogs.length > 0 && spotlight.catalogs.every((request) => request.base === transportUrl)) return;
        const catalogs = SPOTLIGHT_CATALOGS
            .filter(({ type, id }) => (scary.manifest.catalogs ?? []).some((catalog) => catalog.type === type && catalog.id === id))
            .map(({ type, id }) => ({ base: transportUrl, path: { resource: 'catalog', type, id, extra: [] } }));
        if (catalogs.length === 0) return;
        // Stremio Web ships with the spotlight off. SCARY turns it on the first time; after that (a change of
        // language moves it to the same rows in the new language) the viewer's own switch is kept.
        const wasScary = spotlight.catalogs.length > 0 && spotlight.catalogs.every((request) => isScaryTransportUrl(request.base));
        core.transport.dispatch({
            action: 'Ctx',
            args: {
                action: 'UpdateSettings',
                args: { ...profile.settings, boardSpotlight: { ...spotlight, enabled: wasScary ? spotlight.enabled : true, catalogs } },
            },
        });
    }, [settled, addons, language, spotlight, profile.settings, core.transport]);
};

export default useScarySetup;
