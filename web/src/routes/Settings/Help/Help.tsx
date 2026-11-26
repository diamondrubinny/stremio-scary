// Copyright (C) 2017-2026 Smart code 203358507

import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlatform, useToast } from 'stremio/common';
import { Group, LinkRow, Row, RowButton } from '../components';
import { SOURCE_URL } from 'stremio/scary/about';
import styles from './Help.less';

type Props = {
    streamingServer: StreamingServer,
};

const Help = ({ streamingServer }: Props) => {
    const { t } = useTranslation();
    const { shell } = usePlatform();
    const toast = useToast();

    const versions = useMemo(() => {
        const settings = streamingServer?.settings?.type === 'Ready' ?
            streamingServer.settings.content as StreamingServerSettings : null;

        return [
            { id: 'vApp', label: t('SETTINGS_APP_VERSION'), value: process.env.VERSION, display: process.env.VERSION },
            { id: 'vBuild', label: t('SETTINGS_BUILD_VERSION'), value: process.env.COMMIT_HASH, display: process.env.COMMIT_HASH?.slice(0, 13) },
            ...(settings?.serverVersion ? [{ id: 'vServer', label: t('SETTINGS_SERVER_VERSION'), value: settings.serverVersion, display: settings.serverVersion }] : []),
            ...(typeof shell.state.version === 'string' ? [{ id: 'vShell', label: t('SETTINGS_SHELL_VERSION'), value: shell.state.version, display: shell.state.version }] : []),
        ];
    }, [t, streamingServer?.settings, shell.state.version]);

    const onCopyDetails = useCallback(() => {
        navigator.clipboard.writeText(versions.map(({ label, value }) => `${label}: ${value}`).join('\n'));

        toast.show({
            type: 'success',
            title: t('SETTINGS_VERSIONS_COPIED'),
            timeout: 2500,
        });
    }, [versions, t, toast]);

    return (
        <React.Fragment>
            <Group title={t('SCARY_ABOUT')}>
                <Row rowId={'scaryNotice'} label={t('SCARY_ABOUT_NOTICE')} variant={'thin'} />
                {
                    versions.map(({ id, label, value, display }) => (
                        <Row key={id} rowId={id} label={label} variant={'thin'}>
                            <div className={styles['value']} title={value}>{display}</div>
                        </Row>
                    ))
                }
                <Row rowId={'copyDetails'} variant={'end'}>
                    <RowButton label={t('SETTINGS_COPY_DETAILS')} onClick={onCopyDetails} />
                </Row>
            </Group>
            <Group title={t('SETTINGS_GROUP_LEGAL')}>
                <LinkRow label={t('SETTINGS_SOURCE_CODE')} href={`${SOURCE_URL}/tree/${process.env.COMMIT_HASH}`} />
                <LinkRow label={t('SCARY_LICENSE')} href={`${SOURCE_URL}/blob/${process.env.COMMIT_HASH}/NOTICE`} />
                <LinkRow label={t('SCARY_BASED_ON')} href={'https://github.com/Stremio/stremio-web'} />
                <LinkRow label={'Powered by SCARY · Open source'} href={'https://github.com/diamondrubinny/Scary'} />
                <LinkRow label={'Big Buck Bunny © 2008 Blender Foundation · CC BY 3.0'} href={'https://peach.blender.org/about/'} />
            </Group>
        </React.Fragment>
    );
};

export default Help;
