// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The AI part of "SCARY settings" (docs/AI_PLAN.md): which service "Ask SCARY" speaks to, the viewer's own key for it,
// the model, whether their taste goes along, and taking back what they agreed to. A key is checked by asking the
// service for its list of models, and is kept in this browser only.

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from 'stremio/common';
import { Chips, Toggle } from 'stremio/components';
import { Group, Row, RowButton } from 'stremio/routes/Settings/components';
import { listModels } from '../ai/client';
import { PROVIDERS, PROVIDER_IDS, cleanKey, cleanModel, customBaseOf, modelOf } from '../ai/providers';
import type { ProviderId } from '../ai/providers';
import { failureText, useAi } from '../ai/useAi';
import { useScaryState } from '../hooks';
import { store } from '../state/store';
import styles from './scary.less';

const named = (label: string) => ({ 'aria-label': label }) as Record<string, string>;
const row = { display: 'flex', flexWrap: 'wrap' as const, gap: '0.6rem', padding: '0.75rem 1rem', alignItems: 'center' };

const AiSettings = () => {
    const { t } = useTranslation();
    const toast = useToast();
    const { ai: saved } = useScaryState();
    const ai = useAi();
    const provider = PROVIDERS[saved.provider];
    const [typedKey, setTypedKey] = useState('');
    const [typedUrl, setTypedUrl] = useState(saved.customUrl ?? '');
    const [typedModel, setTypedModel] = useState(saved.models[saved.provider] ?? '');
    const [models, setModels] = useState<string[]>([]);
    const [checking, setChecking] = useState(false);

    // Another service: what was typed and listed for the one before is not this one's.
    useEffect(() => {
        setTypedKey('');
        setModels([]);
        setTypedModel(store.getState().ai.models[saved.provider] ?? '');
    }, [saved.provider]);

    const labelOf = (id: ProviderId): string =>
        id === 'custom' ? t('SCARY_AI_CUSTOM') : id === 'pollinations' ? t('SCARY_AI_FREE', { a: PROVIDERS[id].name }) : id === 'pollinations-key' ? t('SCARY_AI_WITH_KEY', { a: PROVIDERS[id].name }) : PROVIDERS[id].name;

    const saveUrl = useCallback((event?: React.FormEvent) => {
        event?.preventDefault();
        const url = customBaseOf(typedUrl);
        if (url === null) {
            toast.show({ type: 'error', title: t('SCARY_AI_ADDRESS_BAD'), timeout: 8_000 });
            return;
        }
        store.update((state) => ({ ai: { ...state.ai, customUrl: url } }));
        toast.show({ type: 'success', title: t('SCARY_AI_SAVED'), timeout: 3_000 });
    }, [typedUrl, toast, t]);

    /** Saves the key only once the service has answered with it: a key that does not work is not kept. */
    const check = useCallback(async (event?: React.FormEvent) => {
        event?.preventDefault();
        const key = typedKey.trim().length > 0 ? cleanKey(typedKey) : cleanKey(saved.keys[saved.provider]);
        if (provider.key === 'needed' && key === null) {
            toast.show({ type: 'error', title: t('SCARY_AI_KEY_BAD'), timeout: 8_000 });
            return;
        }
        setChecking(true);
        const answer = await listModels({ ...ai.settings, key });
        setChecking(false);
        if (!answer.ok) {
            toast.show({ type: 'error', title: failureText(t, answer.why), timeout: 8_000 });
            return;
        }
        if (key !== null) store.update((state) => ({ ai: { ...state.ai, keys: { ...state.ai.keys, [state.ai.provider]: key } } }));
        setTypedKey('');
        setModels(answer.models);
        toast.show({ type: 'success', title: t('SCARY_AI_CHECK_OK', { a: answer.models.length }), timeout: 5_000 });
    }, [typedKey, saved.keys, saved.provider, provider.key, ai.settings, toast, t]);

    const deleteKey = useCallback(() => {
        store.update((state) => {
            const keys = { ...state.ai.keys };
            delete keys[state.ai.provider];
            return { ai: { ...state.ai, keys } };
        });
        setModels([]);
    }, []);

    const saveModel = useCallback((event?: React.FormEvent) => {
        event?.preventDefault();
        const model = cleanModel(typedModel);
        store.update((state) => {
            const chosen = { ...state.ai.models };
            if (model !== null) chosen[state.ai.provider] = model;
            else delete chosen[state.ai.provider];
            return { ai: { ...state.ai, models: chosen } };
        });
        toast.show({ type: 'success', title: t('SCARY_AI_SAVED'), timeout: 3_000 });
    }, [typedModel, toast, t]);

    const hasKey = saved.keys[saved.provider] !== undefined;
    const model = modelOf(ai.settings);
    return (
        <Group rowId={'scary-ai'} title={t('SCARY_AI_TITLE')} description={t('SCARY_AI_SETTINGS_NOTE')}>
            <Row rowId={'scary-ai-open'} label={t('SCARY_AI_TITLE')}>
                <RowButton label={t('SCARY_AI_TITLE')} href={'#/scary/ask'} />
            </Row>
            <Row rowId={'scary-ai-provider'} label={t('SCARY_AI_PROVIDER')} control={'wide'} stackOnPhone={true}>
                <Chips
                    options={PROVIDER_IDS.map((id) => ({ label: labelOf(id), value: id }))}
                    selected={[saved.provider]}
                    onSelect={((value: string) => store.update((state) => ({ ai: { ...state.ai, provider: value as ProviderId } }))) as never}
                />
            </Row>
            {
                saved.provider === 'custom' ?
                    <form onSubmit={saveUrl} style={row}>
                        <input className={styles['text-input']} type={'url'} dir={typedUrl.length > 0 ? 'ltr' : undefined} autoComplete={'off'} spellCheck={false} maxLength={300} value={typedUrl} placeholder={'https://…/v1'} aria-label={t('SCARY_AI_ADDRESS')} onChange={(event) => setTypedUrl(event.target.value)} />
                        <RowButton label={t('SCARY_PROFILE_SAVE')} variant={'primary'} disabled={typedUrl.trim().length === 0} onClick={() => saveUrl()} />
                    </form>
                    :
                    null
            }
            {
                provider.key !== 'none' ?
                    <form onSubmit={check} style={row}>
                        <input className={styles['text-input']} type={'password'} dir={typedKey.length > 0 ? 'ltr' : undefined} autoComplete={'off'} spellCheck={false} maxLength={400} value={typedKey} placeholder={hasKey ? '••••••••' : t('SCARY_AI_KEY')} aria-label={`${t('SCARY_AI_KEY')}: ${labelOf(saved.provider)}`} onChange={(event) => setTypedKey(event.target.value)} />
                        <RowButton label={checking ? t('SCARY_AI_CHECKING') : t('SCARY_AI_KEY_SAVE')} variant={'primary'} disabled={checking || (typedKey.trim().length === 0 && !hasKey && provider.key === 'needed')} onClick={() => check()} />
                        {hasKey ? <RowButton label={t('SCARY_AI_KEY_DELETE')} variant={'danger'} onClick={deleteKey} /> : null}
                    </form>
                    :
                    null
            }
            {
                provider.key !== 'none' ?
                    <form onSubmit={saveModel} style={row}>
                        <input className={styles['text-input']} type={'text'} dir={typedModel.length > 0 ? 'ltr' : undefined} autoComplete={'off'} spellCheck={false} maxLength={120} list={'scary-ai-models'} value={typedModel} placeholder={provider.model !== null ? t('SCARY_AI_MODEL_DEFAULT', { a: provider.model }) : t('SCARY_AI_MODEL')} aria-label={t('SCARY_AI_MODEL')} aria-describedby={'scary-ai-model-note'} onChange={(event) => setTypedModel(event.target.value)} />
                        <datalist id={'scary-ai-models'}>
                            {models.map((id) => <option key={id} value={id} />)}
                        </datalist>
                        <RowButton label={t('SCARY_PROFILE_SAVE')} variant={'primary'} disabled={typedModel.trim() === (saved.models[saved.provider] ?? '')} onClick={() => saveModel()} />
                        <span id={'scary-ai-model-note'} className={styles['section-note']} style={{ padding: 0, flexBasis: '100%' }}>
                            {model !== null ? `${t('SCARY_AI_MODEL')}: ${model}` : t('SCARY_AI_MODEL_CHOOSE')}
                        </span>
                    </form>
                    :
                    null
            }
            <Row rowId={'scary-ai-taste'} label={t('SCARY_AI_TASTE')} description={t('SCARY_AI_TASTE_NOTE')}>
                <Toggle {...named(t('SCARY_AI_TASTE'))} checked={saved.taste} onClick={() => store.update((state) => ({ ai: { ...state.ai, taste: !state.ai.taste } }))} />
            </Row>
            <Row rowId={'scary-ai-agreed'} label={ai.agreed ? t('SCARY_AI_AGREED', { a: `${ai.name} (${ai.host})` }) : t('SCARY_AI_NOT_AGREED')}>
                {ai.agreed ? <RowButton label={t('SCARY_AI_WITHDRAW')} onClick={() => store.update((state) => ({ ai: { ...state.ai, agreed: null } }))} /> : null}
            </Row>
        </Group>
    );
};

export default AiSettings;
