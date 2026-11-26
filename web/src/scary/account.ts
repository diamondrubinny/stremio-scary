// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

/**
 * SCARY Web has no accounts: no login, no sign-up, nothing synchronised. The library, "continue watching" and the
 * settings live in this browser only. Every place of Stremio Web that offers or needs an account asks this.
 */
const ACCOUNTS_ENABLED = false;

/**
 * Stremio Web greets a visitor who has no streaming server with a banner that offers to install Stremio's. SCARY Web
 * shows horror and plays what the viewer adds; it does not send a first-time visitor to install anything. The server
 * is still there for whoever wants it: Settings, "Streaming".
 */
const SERVER_BANNER_ENABLED = false;

export { ACCOUNTS_ENABLED, SERVER_BANNER_ENABLED };
