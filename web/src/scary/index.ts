// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Everything SCARY adds to Stremio Web starts here. Loaded once from src/index.js, before the app renders.
import { addScaryStrings } from './i18n/register';
import { installNetworkGuard } from './network/guard';
import { markChooserShown, profilesStore } from './state/profiles';
import { store } from './state/store';

require('./theme/theme.less');

// A change of profile that was asked for is done now, before the engine or anything else reads the storage.
if (profilesStore.start()) {
    store.reload();
    markChooserShown();
}

installNetworkGuard(window as never);
addScaryStrings();
