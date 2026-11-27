// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The AI service as the screens see it: what is chosen, whether the viewer agreed to it, and what is still missing.

import { useCallback, useMemo } from 'react';
import { useScaryState } from '../hooks';
import { store } from '../state/store';
import type { Failure } from './client';
import { PROVIDERS, hostOf, missingOf } from './providers';
import type { Settings } from './providers';

type Translate = (key: string, values?: Record<string, unknown>) => string;

const useAi = () => {
    const { ai } = useScaryState();
    const settings: Settings = useMemo(() => ({ provider: ai.provider, key: ai.keys[ai.provider] ?? null, model: ai.models[ai.provider] ?? null, customUrl: ai.customUrl }), [ai]);
    const host = hostOf(settings);
    /** Agreeing is to one service at one address: another service, or another address, is asked about again. */
    const agree = useCallback(() => store.update((state) => ({ ai: { ...state.ai, agreed: host } })), [host]);
    return { settings, host, name: PROVIDERS[ai.provider].name, agreed: host.length > 0 && ai.agreed === host, missing: missingOf(settings), taste: ai.taste, agree };
};

/** Why there is no answer, in the viewer's language. */
const failureText = (t: Translate, why: Failure, retryAfter: number | null = null): string =>
    why === 'rate' && retryAfter !== null ? t('SCARY_AI_ERROR_RATE_SECONDS', { a: retryAfter }) : t(`SCARY_AI_ERROR_${why.toUpperCase()}`);

export { failureText, useAi };
