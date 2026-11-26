// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The engine's worker, behind the network guard. The guard must be installed before the engine loads, so the engine
// is required (not imported) after it.
import { installNetworkGuard } from './network/guard';

installNetworkGuard(self as never);

require('@stremio/stremio-core-web/worker.js');
