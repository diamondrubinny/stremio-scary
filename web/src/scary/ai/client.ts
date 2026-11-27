// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Sends a question to the AI service the viewer chose and brings back its words, or why there are none
// (docs/AI_PLAN.md). The browser speaks to the service directly: there is no server of SCARY's in between, and the
// viewer's key goes to that service only. Nothing is retried in a loop, and nothing is logged.

import { PROVIDERS, chatUrlOf, cleanKey, missingOf, modelOf, modelsUrlOf } from './providers';
import type { Settings } from './providers';
import type { Message } from './prompt';

/** Why there is no answer: the key was refused, the service that needs no key turned the request away, too many
 *  requests, no network, the service declined, the model is not known to the service, the service is not fully set,
 *  or anything else. */
type Failure = 'key' | 'blocked' | 'rate' | 'network' | 'refused' | 'model' | 'unset' | 'failed';
type Reply = { ok: true, text: string } | { ok: false, why: Failure, retryAfter: number | null };
type Models = { ok: true, models: string[] } | { ok: false, why: Failure };
type Options = { fetch?: typeof fetch, signal?: AbortSignal };

const TIMEOUT_MS = 90_000;
const MAX_REPLY_CHARS = 20_000;
const MAX_MODELS = 400;
/** Room for an answer; a model that thinks first spends part of it on thinking. */
const ANTHROPIC_MAX_TOKENS = 16_000;
/** The models for which the service can pass a declined request on to another of its models. */
const WITH_FALLBACK: readonly string[] = ['claude-fable-5-2', 'claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'];

const failed = (why: Failure, retryAfter: number | null = null): Reply => ({ ok: false, why, retryAfter });

const secondsOf = (header: string | null): number | null => {
    const seconds = header !== null ? Number(header) : NaN;
    return Number.isFinite(seconds) && seconds > 0 && seconds < 86_400 ? Math.ceil(seconds) : null;
};

const whyOf = (status: number): Failure =>
    status === 401 || status === 403 ? 'key' : status === 402 || status === 429 ? 'rate' : status === 400 || status === 404 || status === 422 ? 'model' : 'failed';

/** A signal that ends with the caller's own, or when the service takes too long. */
const withTimeout = (signal: AbortSignal | undefined): { signal: AbortSignal | undefined, done: () => void } => {
    if (typeof AbortController !== 'function') return { signal, done: () => undefined };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort);
    return { signal: controller.signal, done: () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
    } };
};

const authorization = (key: string | null): Record<string, string> => key !== null ? { Authorization: `Bearer ${key}` } : {};

const askChatCompletions = async (settings: Settings, messages: Message[], options: Options): Promise<Reply> => {
    const url = chatUrlOf(settings);
    const model = modelOf(settings);
    if (url === null || model === null) return failed('unset');
    const send = options.fetch ?? fetch;
    const { signal, done } = withTimeout(options.signal);
    try {
        const response = await send(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authorization(cleanKey(settings.key)) },
            body: JSON.stringify({ model, messages }),
            signal,
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
        });
        if (!response.ok) {
            // A service that takes no key has no key to refuse: it turned this browser away (it does so at times, to keep machines out).
            const why = whyOf(response.status);
            return failed(why === 'key' && PROVIDERS[settings.provider].key === 'none' ? 'blocked' : why, secondsOf(response.headers.get('retry-after')));
        }
        const text = await response.text();
        if (text.length > MAX_REPLY_CHARS * 4) return failed('failed');
        const content = (JSON.parse(text) as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]?.message?.content;
        return typeof content === 'string' && content.length > 0 ? { ok: true, text: content.slice(0, MAX_REPLY_CHARS) } : failed('failed');
    } catch (error) {
        return failed(error instanceof SyntaxError ? 'failed' : 'network');
    } finally {
        done();
    }
};

/** Claude, through Anthropic's own library, which is loaded only when it is the service chosen. */
const anthropicClient = async (key: string) => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    // The key is the viewer's own and stays in their browser; this is the use the option is there for.
    return { Anthropic, client: new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 0, timeout: TIMEOUT_MS }) };
};

const askAnthropic = async (settings: Settings, messages: Message[], options: Options): Promise<Reply> => {
    const key = cleanKey(settings.key);
    const model = modelOf(settings);
    if (key === null || model === null) return failed('unset');
    const { Anthropic, client } = await anthropicClient(key);
    const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n\n');
    const turns = messages.filter((message) => message.role === 'user').map((message) => ({ role: 'user' as const, content: message.content }));
    try {
        const response = WITH_FALLBACK.includes(model) ?
            // Should the model decline a request, the service itself passes it on to another of its models.
            await client.beta.messages.create({ model, max_tokens: ANTHROPIC_MAX_TOKENS, system, messages: turns, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }, { signal: options.signal })
            :
            await client.messages.create({ model, max_tokens: ANTHROPIC_MAX_TOKENS, system, messages: turns }, { signal: options.signal });
        if (response.stop_reason === 'refusal') return failed('refused');
        let text = '';
        for (const block of response.content) {
            if (block.type === 'text') text += block.text;
        }
        return text.length > 0 ? { ok: true, text: text.slice(0, MAX_REPLY_CHARS) } : failed('failed');
    } catch (error) {
        if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return failed('key');
        if (error instanceof Anthropic.RateLimitError) return failed('rate', secondsOf(error.headers?.get('retry-after') ?? null));
        if (error instanceof Anthropic.NotFoundError || error instanceof Anthropic.BadRequestError) return failed('model');
        if (error instanceof Anthropic.APIConnectionError) return failed('network');
        return failed('failed');
    }
};

/** Asks the chosen service. Never throws: what went wrong is part of the answer. */
const ask = async (settings: Settings, messages: Message[], options: Options = {}): Promise<Reply> => {
    if (missingOf(settings) !== 'nothing') return failed('unset');
    try {
        return PROVIDERS[settings.provider].kind === 'anthropic' ? await askAnthropic(settings, messages, options) : await askChatCompletions(settings, messages, options);
    } catch {
        return failed('failed');
    }
};

const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,119}$/;

/** The models the service itself lists for this key: how a key is checked, and where a model is chosen from. */
const listModels = async (settings: Settings, options: Options = {}): Promise<Models> => {
    const key = cleanKey(settings.key);
    try {
        if (PROVIDERS[settings.provider].kind === 'anthropic') {
            if (key === null) return { ok: false, why: 'unset' };
            const { Anthropic, client } = await anthropicClient(key);
            try {
                const page = await client.models.list({ limit: 100, lifecycle: ['active'] }, { signal: options.signal });
                return { ok: true, models: page.data.map((model) => model.id).filter((id) => MODEL_ID.test(id)).slice(0, MAX_MODELS) };
            } catch (error) {
                if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return { ok: false, why: 'key' };
                if (error instanceof Anthropic.RateLimitError) return { ok: false, why: 'rate' };
                return { ok: false, why: error instanceof Anthropic.APIConnectionError ? 'network' : 'failed' };
            }
        }
        const url = modelsUrlOf(settings);
        if (url === null || (PROVIDERS[settings.provider].key === 'needed' && key === null)) return { ok: false, why: 'unset' };
        const send = options.fetch ?? fetch;
        const { signal, done } = withTimeout(options.signal);
        try {
            const response = await send(url, { headers: authorization(key), signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
            if (!response.ok) return { ok: false, why: whyOf(response.status) === 'model' ? 'failed' : whyOf(response.status) };
            const text = await response.text();
            if (text.length > 4_000_000) return { ok: false, why: 'failed' };
            const body = JSON.parse(text) as { data?: unknown } | unknown[] | null;
            const list = Array.isArray(body) ? body : Array.isArray((body as { data?: unknown } | null)?.data) ? (body as { data: unknown[] }).data : [];
            const models = list.map((model) => (model as { id?: unknown } | null)?.id).filter((id): id is string => typeof id === 'string' && MODEL_ID.test(id));
            return { ok: true, models: Array.from(new Set(models)).sort().slice(0, MAX_MODELS) };
        } finally {
            done();
        }
    } catch (error) {
        return { ok: false, why: error instanceof SyntaxError ? 'failed' : 'network' };
    }
};

export { ask, listModels };
export type { Failure, Models, Reply };
