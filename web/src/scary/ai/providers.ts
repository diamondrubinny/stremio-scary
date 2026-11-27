// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The AI services "Ask SCARY" can speak to (docs/AI_PLAN.md): one that needs no key, and the viewer's own key for the
// rest. All but Anthropic speak the same "chat completions" form; Anthropic is spoken to through its own library.
// Addresses are the services' own, checked against their servers; a model's name is never guessed, except the two
// that were checked or are given by the service's own guidance.

const PROVIDER_IDS = ['pollinations', 'pollinations-key', 'openai', 'anthropic', 'gemini', 'groq', 'openrouter', 'mistral', 'deepseek', 'custom'] as const;
type ProviderId = typeof PROVIDER_IDS[number];

type Provider = {
    /** The service's own name: shown as it is, in every language. */
    name: string,
    kind: 'chat-completions' | 'anthropic',
    /** Where "/chat/completions" and "/models" are added; null: the viewer gives it (custom), or the library knows (Anthropic). */
    base: string | null,
    /** The whole address of the chat, where it is not base + "/chat/completions". */
    chat?: string,
    key: 'none' | 'needed' | 'optional',
    /** The model asked for when the viewer chose none; null: one must be chosen from the service's own list. */
    model: string | null,
};

const PROVIDERS: Record<ProviderId, Provider> = {
    'pollinations': { name: 'Pollinations', kind: 'chat-completions', base: null, chat: 'https://text.pollinations.ai/openai', key: 'none', model: 'openai' },
    'pollinations-key': { name: 'Pollinations', kind: 'chat-completions', base: 'https://gen.pollinations.ai/v1', key: 'needed', model: null },
    'openai': { name: 'OpenAI', kind: 'chat-completions', base: 'https://api.openai.com/v1', key: 'needed', model: null },
    'anthropic': { name: 'Anthropic (Claude)', kind: 'anthropic', base: null, key: 'needed', model: 'claude-opus-5-5' },
    'gemini': { name: 'Google Gemini', kind: 'chat-completions', base: 'https://generativelanguage.googleapis.com/v1beta/openai', key: 'needed', model: null },
    'groq': { name: 'Groq', kind: 'chat-completions', base: 'https://api.groq.com/openai/v1', key: 'needed', model: null },
    'openrouter': { name: 'OpenRouter', kind: 'chat-completions', base: 'https://openrouter.ai/api/v1', key: 'needed', model: null },
    'mistral': { name: 'Mistral', kind: 'chat-completions', base: 'https://api.mistral.ai/v1', key: 'needed', model: null },
    'deepseek': { name: 'DeepSeek', kind: 'chat-completions', base: 'https://api.deepseek.com', key: 'needed', model: null },
    'custom': { name: 'OpenAI-compatible', kind: 'chat-completions', base: null, key: 'optional', model: null },
};

const isProviderId = (value: unknown): value is ProviderId => typeof value === 'string' && (PROVIDER_IDS as readonly string[]).includes(value);

/** A key as a service gives it: printable characters without spaces. Anything else is not sent anywhere. */
const KEY_PATTERN = /^[\x21-\x7E]{8,400}$/;
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,119}$/;

const cleanKey = (value: unknown): string | null => typeof value === 'string' && KEY_PATTERN.test(value.trim()) ? value.trim() : null;
const cleanModel = (value: unknown): string | null => typeof value === 'string' && MODEL_PATTERN.test(value.trim()) ? value.trim() : null;

/**
 * The address of a service the viewer runs or chose themselves, without a trailing slash; null when it cannot be used.
 * Only https, so that a key is never sent in the clear; plain http is taken for this computer alone.
 */
const customBaseOf = (value: unknown): string | null => {
    if (typeof value !== 'string' || value.length > 300) return null;
    let url: URL;
    try {
        url = new URL(value.trim());
    } catch {
        return null;
    }
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null;
    if (url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') return null;
    return (url.origin + url.pathname).replace(/\/+$/, '');
};

type Settings = { provider: ProviderId, key: string | null, model: string | null, customUrl: string | null };

const baseOf = (settings: Settings): string | null => settings.provider === 'custom' ? customBaseOf(settings.customUrl) : PROVIDERS[settings.provider].base;

/** Where a question is sent; null when the service is not fully set. */
const chatUrlOf = (settings: Settings): string | null => {
    const { chat } = PROVIDERS[settings.provider];
    if (chat !== undefined) return chat;
    const base = baseOf(settings);
    return base !== null ? `${base}/chat/completions` : null;
};

/** Where the service lists its models; null when it has no such list here. */
const modelsUrlOf = (settings: Settings): string | null => {
    const base = baseOf(settings);
    return base !== null ? `${base}/models` : null;
};

const modelOf = (settings: Settings): string | null => cleanModel(settings.model) ?? PROVIDERS[settings.provider].model;

/** What is missing before a question can be sent: nothing, a key, an address, or a model. */
const missingOf = (settings: Settings): 'nothing' | 'key' | 'address' | 'model' => {
    const provider = PROVIDERS[settings.provider];
    if (provider.key === 'needed' && cleanKey(settings.key) === null) return 'key';
    if (provider.kind === 'chat-completions' && chatUrlOf(settings) === null) return 'address';
    return modelOf(settings) === null ? 'model' : 'nothing';
};

/** The host a question goes to, to tell the viewer before they agree. */
const hostOf = (settings: Settings): string => {
    if (settings.provider === 'anthropic') return 'api.anthropic.com';
    const url = chatUrlOf(settings);
    try {
        return url !== null ? new URL(url).host : '';
    } catch {
        return '';
    }
};

export { PROVIDERS, PROVIDER_IDS, chatUrlOf, cleanKey, cleanModel, customBaseOf, hostOf, isProviderId, missingOf, modelOf, modelsUrlOf };
export type { Provider, ProviderId, Settings };
