// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The row of the app's menu that says whose profile is on screen and leads to "Who is watching?" (ui/Profiles).
// Kept apart from that page: the menu is loaded while Stremio Web's shared modules are still loading, and this row
// needs none of them.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'stremio/components';
import { useProfiles } from '../hooks';

const ProfileMenuRow = ({ className, labelClassName }: { className?: string, labelClassName?: string }) => {
    const { t } = useTranslation();
    const { active } = useProfiles();
    const label = t('SCARY_PROFILES_SWITCH', { a: active.name.length > 0 ? active.name : t('SCARY_PROFILE_DEFAULT_NAME') });
    return (
        <Button className={className} title={label} href={'#/scary/profiles'}>
            <div className={labelClassName} dir={'auto'}>{label}</div>
        </Button>
    );
};

export default ProfileMenuRow;
