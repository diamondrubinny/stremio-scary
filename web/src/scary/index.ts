// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Everything SCARY adds to Stremio Web starts here. Loaded once from src/index.js, before the app renders.
import { addScaryStrings } from './i18n/register';
import { installNetworkGuard } from './network/guard';

require('./theme/theme.less');

installNetworkGuard(window as never);
addScaryStrings();
