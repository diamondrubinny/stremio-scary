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
import { useScaryState, useSession } from '../hooks';
import { createBackup, readBackup, restoreBackup } from '../state/backup';
import { askPin, lockAgain, setSleepTimer } from '../state/session';
import { SLEEP_MINUTES, answerConsent, store } from '../state/store';
import type { ScaryState } from '../state/store';

type Effect = keyof ScaryState['effects'];

const SettingsPage = () => {
    const { t } = useTranslation();
    const toast = useToast();
    const { familyNight, lock, effects, bucket, loved, consent } = useScaryState();
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
        if (familyNight && !await confirmed()) return;
        store.update(() => ({ familyNight: !familyNight }));
        if (!familyNight) lockAgain();
    }, [familyNight, confirmed]);

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
            <Toggle checked={effects[id]} onClick={() => toggleEffect(id)} />
        </Row>
    );

    return (
        <React.Fragment>
            <Group title={t('SCARY_SETTINGS_SECTION_PARENTS')} description={t('SCARY_PIN_NOTE')}>
                <Row rowId={'scary-family'} label={t('SCARY_SETTINGS_FAMILY_NIGHT')}>
                    <Toggle checked={familyNight} onClick={toggleFamilyNight} />
                </Row>
                <Row rowId={'scary-lock'} label={t('SCARY_SETTINGS_PARENTAL')}>
                    <Toggle checked={lock.enabled} onClick={toggleLock} />
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
                <Row rowId={'scary-sleep'} label={t('SCARY_SETTINGS_SLEEP_TIMER')} description={sleepUntil !== null ? t('SCARY_SLEEP_LEFT', { a: sleepLeft }) : undefined} control={'wide'} stackOnPhone={true}>
                    <Chips
                        options={SLEEP_MINUTES.map((minutes) => ({ label: minutes === 0 ? t('SCARY_SLEEP_OFF') : t('SCARY_MINUTES', { a: minutes }), value: String(minutes) }))}
                        selected={[sleepUntil === null ? '0' : '']}
                        onSelect={((value: string) => setSleepTimer(Number(value))) as never}
                    />
                </Row>
            </Group>
            <Group title={t('SCARY_LISTS')}>
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
            <Group rowId={'scary-privacy'} title={t('SCARY_PRIVACY')} description={t('SCARY_CONSENT_NOTE')}>
                <Row rowId={'scary-consent-media'} label={t('SCARY_CONSENT_TRAILERS')} description={t('SCARY_CONSENT_GATE')}>
                    <Toggle checked={consent.media === true} onClick={() => store.update(() => answerConsent(consent.media !== true))} />
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
