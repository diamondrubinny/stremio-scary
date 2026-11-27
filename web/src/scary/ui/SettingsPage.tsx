// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// "SCARY settings", a page of Stremio Web's settings: family night and the parental lock, the effects, the sleep
// timer, the viewer's lists, and the backup file.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from 'stremio/common';
import { Chips, Toggle } from 'stremio/components';
import { Group, Row, RowButton } from 'stremio/routes/Settings/components';
import { hashPin } from '../domain/pin';
import { useProfiles, useScaryState, useSession } from '../hooks';
import { createBackup, readBackup, restoreBackup } from '../state/backup';
import { askPin, lockAgain, setSleepTimer } from '../state/session';
import { SLEEP_MINUTES, answerConsent, store } from '../state/store';
import { keyKind } from '../tmdb/client';
import { checkKey, forgetTmdb } from '../tmdb/useTmdb';
import styles from './scary.less';
import type { ScaryState } from '../state/store';

type Effect = keyof ScaryState['effects'];

/** The name a switch is read out by: the label of its row. */
const named = (label: string) => ({ 'aria-label': label }) as Record<string, string>;

const SettingsPage = () => {
    const { t } = useTranslation();
    const toast = useToast();
    const profiles = useProfiles();
    const { gentle } = profiles.active;
    const { familyNight, lock, effects, bucket, loved, consent, tmdbKey } = useScaryState();
    const [typedKey, setTypedKey] = useState('');
    const [checkingKey, setCheckingKey] = useState(false);
    const { sleepUntil } = useSession();
    const fileInput = useRef<HTMLInputElement>(null);
    const [, setTick] = useState(0);
    const hasPin = lock.pin !== null;

    // The minutes left on the sleep timer count down while the page is open.
    useEffect(() => {
        if (sleepUntil === null) return;
        const timer = setInterval(() => setTick((tick) => tick + 1), 30_000);
        return () => clearInterval(timer);
    }, [sleepUntil]);

    /** True when there is no PIN, or the viewer just entered it. */
    const confirmed = useCallback(async () => !hasPin || await askPin('verify') !== null, [hasPin]);

    const createPin = useCallback(async (): Promise<string | null> => {
        const pin = await askPin('create');
        return pin === null ? null : hashPin(pin);
    }, []);

    const toggleFamilyNight = useCallback(async () => {
        // Turning family night on is free; leaving it takes the PIN.
        // In a gentle profile family night is not a switch: it is what the profile is.
        if (gentle) return;
        if (familyNight && !await confirmed()) return;
        store.update(() => ({ familyNight: !familyNight }));
        if (!familyNight) lockAgain();
    }, [familyNight, gentle, confirmed]);

    const toggleLock = useCallback(async () => {
        if (lock.enabled) {
            if (await confirmed()) store.update((state) => ({ lock: { ...state.lock, enabled: false } }));
            return;
        }
        const pin = hasPin ? (await confirmed() ? lock.pin : null) : await createPin();
        if (pin !== null) {
            store.update((state) => ({ lock: { ...state.lock, enabled: true, pin } }));
            lockAgain();
        }
    }, [lock, hasPin, confirmed, createPin]);

    const setLevel = useCallback(async (value: string) => {
        if (await confirmed()) store.update((state) => ({ lock: { ...state.lock, fromFear: Number(value) } }));
    }, [confirmed]);

    const changePin = useCallback(async () => {
        if (!await confirmed()) return;
        const pin = await createPin();
        if (pin !== null) store.update((state) => ({ lock: { ...state.lock, pin } }));
    }, [confirmed, createPin]);

    const removePin = useCallback(async () => {
        if (await confirmed()) store.update((state) => ({ lock: { ...state.lock, enabled: false, pin: null } }));
    }, [confirmed]);

    const toggleEffect = useCallback((effect: Effect) => {
        store.update((state) => ({ effects: { ...state.effects, [effect]: !state.effects[effect] } }));
    }, []);

    const saveTmdbKey = useCallback(async (event?: React.FormEvent) => {
        event?.preventDefault();
        const key = typedKey.trim();
        if (keyKind(key) === null) {
            toast.show({ type: 'error', title: t('SCARY_TMDB_INVALID_FORMAT'), timeout: 8_000 });
            return;
        }
        setCheckingKey(true);
        const answer = await checkKey(key);
        setCheckingKey(false);
        if (answer !== 'ok') {
            toast.show({ type: 'error', title: t(answer === 'rejected' ? 'SCARY_TMDB_REJECTED' : 'SCARY_TMDB_UNREACHABLE'), timeout: 8_000 });
            return;
        }
        forgetTmdb();
        store.update(() => ({ tmdbKey: key }));
        setTypedKey('');
        toast.show({ type: 'success', title: t('SCARY_TMDB_SAVED'), timeout: 4_000 });
    }, [typedKey, toast, t]);

    const deleteTmdbKey = useCallback(() => {
        forgetTmdb();
        store.update(() => ({ tmdbKey: null }));
    }, []);

    const saveBackup = useCallback(() => {
        const backup = createBackup(window.localStorage);
        const name = `scary-web-backup-${backup.savedAt.slice(0, 10)}.json`;
        // Inside the Android app there is no download: the app is asked to save the file, and asks the viewer where.
        const android = (window as { ScaryAndroid?: { postMessage?: (message: string) => void } }).ScaryAndroid;
        if (typeof android?.postMessage === 'function') {
            android.postMessage(JSON.stringify({ type: 'saveFile', name, text: JSON.stringify(backup) }));
            return;
        }
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
        link.download = name;
        link.click();
        URL.revokeObjectURL(link.href);
    }, []);

    const restoreFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const entries = file.size > 30_000_000 ? null : readBackup(await file.text());
        if (entries === null) {
            toast.show({ type: 'error', title: t('SCARY_BACKUP_BAD'), timeout: 6_000 });
            return;
        }
        // Restoring replaces the lists of whoever uses this browser: with a PIN set, it takes the PIN.
        if (!await confirmed()) return;
        restoreBackup(window.localStorage, entries);
        toast.show({ type: 'success', title: t('SCARY_BACKUP_DONE'), timeout: 3_000 });
        setTimeout(() => window.location.reload(), 1_200);
    }, [confirmed, toast, t]);

    const sleepLeft = sleepUntil === null ? 0 : Math.max(1, Math.ceil((sleepUntil - Date.now()) / 60_000));
    const effect = (id: Effect, label: string) => (
        <Row rowId={`scary-${id}`} label={label}>
            <Toggle {...named(label)} checked={effects[id]} onClick={() => toggleEffect(id)} />
        </Row>
    );

    return (
        <React.Fragment>
            <Group title={t('SCARY_SETTINGS_SECTION_PARENTS')} description={t('SCARY_PIN_NOTE')}>
                <Row rowId={'scary-family'} label={t('SCARY_SETTINGS_FAMILY_NIGHT')} description={gentle ? t('SCARY_PROFILE_GENTLE_FAMILY') : undefined}>
                    <Toggle {...named(t('SCARY_SETTINGS_FAMILY_NIGHT'))} checked={familyNight} onClick={toggleFamilyNight} />
                </Row>
                <Row rowId={'scary-lock'} label={t('SCARY_SETTINGS_PARENTAL')}>
                    <Toggle {...named(t('SCARY_SETTINGS_PARENTAL'))} checked={lock.enabled} onClick={toggleLock} />
                </Row>
                <Row rowId={'scary-lock-level'} label={t('SCARY_SETTINGS_LOCK_LEVEL')} control={'wide'} stackOnPhone={true}>
                    <Chips
                        options={[1, 2, 3, 4, 5].map((level) => ({ label: t('SCARY_SETTINGS_LOCK_LEVEL_VALUE', { a: level }), value: String(level) }))}
                        selected={[String(lock.fromFear)]}
                        onSelect={setLevel as never}
                    />
                </Row>
                <Row rowId={'scary-pin'} variant={'end'}>
                    {hasPin ? <RowButton label={t('SCARY_PIN_REMOVE')} variant={'danger'} onClick={removePin} /> : null}
                    <RowButton label={t('SCARY_SETTINGS_CHANGE_PIN')} onClick={hasPin ? changePin : toggleLock} />
                </Row>
            </Group>
            <Group title={t('SCARY_SETTINGS_SECTION_DISPLAY')}>
                {effect('atmosphere', t('SCARY_SETTINGS_EFFECTS'))}
                {effect('shiver', t('SCARY_SHIVER'))}
                {effect('screensaver', t('SCARY_SETTINGS_SCREENSAVER'))}
                {effect('seasonal', t('SCARY_SETTINGS_SEASONAL'))}
            </Group>
            <Group title={t('SCARY_SETTINGS_SECTION_SOUND')}>
                {effect('sound', t('SCARY_SETTINGS_SOUNDS'))}
                <Row rowId={'scary-trailers'} label={t('SCARY_SETTINGS_TRAILER_AUTOPLAY')} description={t('SCARY_SETTINGS_TRAILER_NOTE')}>
                    <Toggle {...named(t('SCARY_SETTINGS_TRAILER_AUTOPLAY'))} checked={effects.trailers} onClick={() => toggleEffect('trailers')} />
                </Row>
                <Row rowId={'scary-sleep'} label={t('SCARY_SETTINGS_SLEEP_TIMER')} description={sleepUntil !== null ? t('SCARY_SLEEP_LEFT', { a: sleepLeft }) : undefined} control={'wide'} stackOnPhone={true}>
                    <Chips
                        options={SLEEP_MINUTES.map((minutes) => ({ label: minutes === 0 ? t('SCARY_SLEEP_OFF') : t('SCARY_MINUTES', { a: minutes }), value: String(minutes) }))}
                        selected={[sleepUntil === null ? '0' : '']}
                        onSelect={((value: string) => setSleepTimer(Number(value))) as never}
                    />
                </Row>
            </Group>
            <Group title={t('SCARY_LISTS')}>
                <Row rowId={'scary-profiles'} label={`${t('SCARY_PROFILES')} (${profiles.list.length})`}>
                    <RowButton label={t('SCARY_PROFILES_TITLE')} href={'#/scary/profiles'} />
                </Row>
                <Row rowId={'scary-taste'} label={`${t('SCARY_TASTE_TITLE')} (${loved.length})`}>
                    <RowButton label={t('SCARY_TASTE_TITLE')} href={'#/scary/taste'} />
                </Row>
                <Row rowId={'scary-bucket'} label={`${t('SCARY_BUCKET_TITLE')} (${bucket.length})`}>
                    <RowButton label={t('SCARY_BUCKET_TITLE')} href={'#/scary/bucket'} />
                </Row>
                <Row rowId={'scary-stats'} label={t('SCARY_SETTINGS_STATS')}>
                    <RowButton label={t('SCARY_SETTINGS_STATS')} href={'#/scary/stats'} />
                </Row>
            </Group>
            <Group rowId={'scary-tmdb'} title={t('SCARY_TMDB_DIALOG_TITLE')} description={t('SCARY_TMDB_NOTE')}>
                <form onSubmit={saveTmdbKey} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', padding: '0.75rem 1rem', alignItems: 'center' }}>
                    <input
                        className={styles['text-input']}
                        type={'password'}
                        autoComplete={'off'}
                        spellCheck={false}
                        maxLength={600}
                        value={typedKey}
                        placeholder={tmdbKey !== null ? '••••••••' : t('SCARY_TMDB_HINT')}
                        aria-label={t('SCARY_SETTINGS_TMDB')}
                        onChange={(event) => setTypedKey(event.target.value)}
                    />
                    <RowButton label={checkingKey ? t('SCARY_TMDB_CHECKING') : t('SCARY_TMDB_SAVE')} variant={'primary'} disabled={checkingKey || typedKey.trim().length === 0} onClick={() => saveTmdbKey()} />
                    {tmdbKey !== null ? <RowButton label={t('SCARY_TMDB_DELETE')} variant={'danger'} onClick={deleteTmdbKey} /> : null}
                </form>
            </Group>
            <Group rowId={'scary-privacy'} title={t('SCARY_PRIVACY')} description={t('SCARY_CONSENT_NOTE')}>
                <Row rowId={'scary-consent-media'} label={t('SCARY_CONSENT_TRAILERS')} description={t('SCARY_CONSENT_GATE')}>
                    <Toggle {...named(t('SCARY_CONSENT_TRAILERS'))} checked={consent.media === true} onClick={() => store.update(answerConsent(consent.media !== true))} />
                </Row>
                <Row rowId={'scary-consent-voice'} label={t('SCARY_VOICE_SEARCH')} description={t('SCARY_VOICE_TEXT')}>
                    <Toggle {...named(t('SCARY_VOICE_SEARCH'))} checked={consent.voice} onClick={() => store.update((state) => ({ consent: { ...state.consent, voice: !state.consent.voice } }))} />
                </Row>
            </Group>
            <Group title={t('SCARY_BACKUP')} description={t('SCARY_BACKUP_NOTE')}>
                <Row rowId={'scary-backup'} variant={'end'}>
                    <RowButton label={t('SCARY_BACKUP_RESTORE')} onClick={() => fileInput.current?.click()} />
                    <RowButton label={t('SCARY_BACKUP_SAVE')} variant={'primary'} onClick={saveBackup} />
                </Row>
                <input ref={fileInput} type={'file'} accept={'application/json,.json'} hidden={true} aria-label={t('SCARY_BACKUP_RESTORE')} onChange={restoreFile} />
            </Group>
        </React.Fragment>
    );
};

export default SettingsPage;
