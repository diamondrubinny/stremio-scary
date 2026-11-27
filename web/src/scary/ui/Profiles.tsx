// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// "Who is watching?" (docs/PROFILES_PLAN.md): the page that chooses, adds, changes and removes profiles, the same
// question asked once when the app opens with two profiles or more. (The menu's row is ui/ProfileMenuRow.)
// Choosing a profile starts the page again: the switch itself is done before anything reads the storage.

import React, { useCallback, useState } from 'react';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useToast } from 'stremio/common';
import { Button } from 'stremio/components';
import { COLOURS, FIRST, MAX_NAME, MAX_PROFILES, cleanName, nextColour } from '../domain/profiles';
import type { Profile } from '../domain/profiles';
import { useProfiles, useScaryState } from '../hooks';
import { chooserWasShown, markChooserShown, profilesStore } from '../state/profiles';
import { askPin, lockAgain } from '../state/session';
import Chip from './Chip';
import Dialog from './Dialog';
import styles from './scary.less';

type Translate = (key: string, values?: Record<string, unknown>) => string;

const nameOf = (profile: Profile, t: Translate): string => profile.name.length > 0 ? profile.name : t('SCARY_PROFILE_DEFAULT_NAME');
const initialOf = (name: string): string => (Array.from(name)[0] ?? '?').toUpperCase();

/**
 * Asks for the PIN when one is set: every time, also inside the half hour a PIN keeps the films open. The PIN given
 * here is for this one thing, so it does not open the locked films as well.
 */
const allowed = async (hasPin: boolean): Promise<boolean> => {
    if (!hasPin) return true;
    const given = await askPin('verify') !== null;
    lockAgain();
    return given;
};

/** The app starts again on the home screen, with the profile that was asked for. */
const startAgain = (): void => {
    markChooserShown();
    window.location.hash = '#/';
    window.location.reload();
};

const Avatar = ({ profile, name }: { profile: Profile, name: string }) => (
    <span className={classnames(styles['profile-avatar'], styles[`profile-colour-${profile.colour}`])} aria-hidden={'true'}>{initialOf(name)}</span>
);

type ListProps = {
    /** Called when the profile already on screen is chosen. */
    onStay: () => void,
    onEdit?: (profile: Profile) => void,
};

/** One button per profile, read as its name, with "Gentle" and "watching now" where they hold. */
const ProfileList = ({ onStay, onEdit }: ListProps) => {
    const { t } = useTranslation();
    const toast = useToast();
    const { list, active } = useProfiles();
    const { lock } = useScaryState();
    const hasPin = lock.pin !== null;

    const choose = useCallback(async (profile: Profile) => {
        if (profile.id === active.id) {
            onStay();
            return;
        }
        // Leaving a gentle profile takes the PIN.
        if (active.gentle && !await allowed(hasPin)) return;
        if (profilesStore.choose(profile.id)) startAgain();
        else toast.show({ type: 'error', title: t('SCARY_PROFILE_FAILED'), timeout: 6_000 });
    }, [active, hasPin, onStay, toast, t]);

    return (
        <ul className={styles['profiles']}>
            {list.map((profile) => {
                const name = nameOf(profile, t);
                const current = profile.id === active.id;
                const spoken = [name, profile.gentle ? t('SCARY_PROFILE_GENTLE_BADGE') : null, current ? t('SCARY_PROFILE_CURRENT') : null].filter(Boolean).join(', ');
                return (
                    <li key={profile.id} className={styles['profile']}>
                        <Button className={classnames(styles['profile-button'], { [styles['current']]: current })} title={spoken} aria-label={spoken} aria-current={current ? 'true' : undefined} onClick={() => choose(profile)}>
                            <Avatar profile={profile} name={name} />
                            <span className={styles['profile-name']} dir={'auto'}>{name}</span>
                            <span className={styles['profile-notes']}>
                                {profile.gentle ? <span className={styles['profile-badge']}>{t('SCARY_PROFILE_GENTLE_BADGE')}</span> : null}
                                {current ? <span className={styles['profile-current']}>{t('SCARY_PROFILE_CURRENT')}</span> : null}
                            </span>
                        </Button>
                        {onEdit ? <Chip label={t('SCARY_PROFILE_EDIT_TITLE')} title={t('SCARY_PROFILE_EDIT', { a: name })} quiet={true} onClick={() => onEdit(profile)} /> : null}
                    </li>
                );
            })}
        </ul>
    );
};

type FormProps = {
    /** The profile being changed, or null for a new one. */
    profile: Profile | null,
    onClose: () => void,
};

const ProfileForm = ({ profile, onClose }: FormProps) => {
    const { t } = useTranslation();
    const toast = useToast();
    const { list } = useProfiles();
    const { lock } = useScaryState();
    const [name, setName] = useState(profile?.name ?? '');
    const [colour, setColour] = useState(profile?.colour ?? nextColour(list));
    const [gentle, setGentle] = useState(profile?.gentle ?? false);
    const [error, setError] = useState('');
    const [removing, setRemoving] = useState(false);
    const title = profile === null ? t('SCARY_PROFILE_NEW_TITLE') : t('SCARY_PROFILE_EDIT_TITLE');

    const save = (event?: React.FormEvent) => {
        event?.preventDefault();
        if (cleanName(name) === null) {
            setError(t('SCARY_PROFILE_BAD_NAME'));
            return;
        }
        const saved = profile === null ? profilesStore.add(name, colour, gentle) !== null : profilesStore.update(profile.id, name, colour, gentle);
        if (saved) onClose();
        else setError(t('SCARY_PROFILE_FAILED'));
    };

    const remove = () => {
        if (profile === null) return;
        const result = profilesStore.remove(profile.id);
        if (result === 'restart') {
            startAgain();
        } else if (result === 'removed') {
            toast.show({ type: 'success', title: t('SCARY_PROFILE_REMOVED'), timeout: 4_000 });
            onClose();
        } else {
            setRemoving(false);
            setError(t('SCARY_PROFILE_FAILED'));
        }
    };

    if (removing && profile !== null) {
        return (
            <Dialog label={t('SCARY_PROFILE_REMOVE')} onClose={() => setRemoving(false)}>
                <p className={styles['gate-text']}>{t('SCARY_PROFILE_REMOVE_CONFIRM', { a: nameOf(profile, t) })}</p>
                <div className={styles['chips-line']} style={{ display: 'flex', gap: '0.6rem' }}>
                    <Chip label={t('SCARY_PROFILE_KEEP')} chosen={true} onClick={() => setRemoving(false)} />
                    <Chip label={t('SCARY_PROFILE_REMOVE_YES')} onClick={remove} />
                </div>
            </Dialog>
        );
    }

    return (
        <Dialog label={title} onClose={onClose}>
            <form className={styles['profile-form']} onSubmit={save} noValidate={true}>
                <h2 className={styles['profile-form-title']}>{title}</h2>
                <label className={styles['pin-label']} htmlFor={'scary-profile-name'}>{t('SCARY_PROFILE_NAME_LABEL')}</label>
                <input
                    id={'scary-profile-name'}
                    className={styles['profile-input']}
                    type={'text'}
                    dir={'auto'}
                    autoComplete={'off'}
                    maxLength={MAX_NAME}
                    autoFocus={true}
                    value={name}
                    aria-describedby={'scary-profile-error'}
                    aria-invalid={error.length > 0}
                    onChange={(event) => {
                        setName(event.target.value);
                        setError('');
                    }}
                />
                <fieldset className={styles['profile-colours']}>
                    <legend className={styles['pin-label']}>{t('SCARY_PROFILE_COLOUR_LABEL')}</legend>
                    {/* The app moves the focus with the arrows itself, so a colour is chosen as the focus reaches it, as in any radio group. */}
                    {Array.from({ length: COLOURS }, (_, index) => (
                        <label key={index} className={classnames(styles['profile-swatch'], styles[`profile-colour-${index}`], { [styles['picked']]: colour === index })}>
                            <input type={'radio'} name={'scary-profile-colour'} checked={colour === index} aria-label={t('SCARY_PROFILE_COLOUR', { a: index + 1, b: COLOURS })} onChange={() => setColour(index)} onFocus={() => setColour(index)} />
                            <span aria-hidden={'true'}>{index + 1}</span>
                        </label>
                    ))}
                </fieldset>
                <label className={styles['profile-check']}>
                    <input type={'checkbox'} checked={gentle} aria-describedby={'scary-profile-gentle'} onChange={(event) => setGentle(event.target.checked)} />
                    <span>{t('SCARY_PROFILE_GENTLE')}</span>
                </label>
                <p id={'scary-profile-gentle'} className={styles['profile-help']}>
                    {t('SCARY_PROFILE_GENTLE_WHAT')}
                    {gentle && lock.pin === null ? ` ${t('SCARY_PROFILE_GENTLE_NO_PIN')}` : ''}
                </p>
                <div id={'scary-profile-error'} className={styles['pin-error']} role={'alert'}>{error}</div>
                <div className={styles['chips-line']} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {/* Enter anywhere in the form saves it: this is the form's own submit button, the chip is what is seen. */}
                    <button type={'submit'} hidden={true} tabIndex={-1} aria-hidden={'true'} />
                    <Chip label={t('SCARY_PROFILE_SAVE')} chosen={true} onClick={() => save()} />
                    <Chip label={t('SCARY_PIN_CANCEL')} onClick={onClose} />
                    {profile !== null && profile.id !== FIRST ? <Chip label={t('SCARY_PROFILE_REMOVE')} quiet={true} onClick={() => setRemoving(true)} /> : null}
                </div>
            </form>
        </Dialog>
    );
};

/** The page: #/scary/profiles. */
const ProfilesPage = () => {
    const { t } = useTranslation();
    const { list } = useProfiles();
    const { lock } = useScaryState();
    const hasPin = lock.pin !== null;
    // undefined: no form; null: a new profile; else the profile being changed.
    const [editing, setEditing] = useState<Profile | null | undefined>(undefined);

    // Adding, changing or removing any profile takes the PIN: otherwise a child would switch their own gentleness off.
    const open = useCallback(async (profile: Profile | null) => {
        if (await allowed(hasPin)) setEditing(profile);
    }, [hasPin]);
    const goHome = useCallback(() => {
        window.location.hash = '#/';
    }, []);

    return (
        <React.Fragment>
            <h1 className={styles['page-title']}>{t('SCARY_PROFILES_TITLE')}</h1>
            <div className={styles['section']}>
                <p className={styles['section-note']} style={{ maxWidth: '52rem' }}>{t('SCARY_PROFILES_NOTE')}</p>
            </div>
            <ProfileList onStay={goHome} onEdit={open} />
            <div className={styles['section']}>
                {list.length < MAX_PROFILES ? <div className={styles['chips-line']}><Chip label={t('SCARY_PROFILES_ADD')} chosen={true} onClick={() => open(null)} /></div> : null}
            </div>
            {editing !== undefined ? <ProfileForm key={editing?.id ?? 'new'} profile={editing} onClose={() => setEditing(undefined)} /> : null}
        </React.Fragment>
    );
};

let asking: boolean | null = null;

/**
 * Whether to ask who is watching. Decided once, as the app opens: a second profile added later does not bring the
 * question up by itself.
 */
const askedAtOpening = (): boolean => {
    if (asking === null) {
        asking = !chooserWasShown() && profilesStore.getState().list.length >= 2;
        markChooserShown();
    }
    return asking;
};

/** Asked once each time the browser opens the app, when there are two profiles or more. */
const ProfileChooser = () => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(askedAtOpening);
    const close = useCallback(() => {
        asking = false;
        setOpen(false);
    }, []);
    if (!open) return null;
    return (
        <Dialog label={t('SCARY_PROFILES_TITLE')} onClose={close}>
            <h2 className={styles['profile-form-title']}>{t('SCARY_PROFILES_TITLE')}</h2>
            <ProfileList onStay={close} />
        </Dialog>
    );
};

export { ProfileChooser, ProfilesPage };
