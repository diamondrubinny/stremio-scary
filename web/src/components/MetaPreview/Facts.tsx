// Copyright (C) 2017-2026 Smart code 203358507

import React from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Icon from '@stremio/stremio-icons/react';
import Button from 'stremio/components/Button';
import type { MetaLink } from 'stremio/common/useMetaLinks';
import styles from './Facts.less';

type Props = {
    className?: string,
    items: (string | null | undefined)[],
    imdb: MetaLink | null,
    children?: React.ReactNode,
};

const Facts = ({ className, items, imdb, children }: Props) => {
    const { t } = useTranslation();
    const facts = items.filter((item): item is string => typeof item === 'string' && item.length > 0);
    if (facts.length === 0 && imdb === null && !children) {
        return null;
    }

    return (
        <div className={classNames(className, styles['facts'])}>
            {
                facts.map((fact, index) => (
                    // SCARY: "119 min" in the interface language; each fact keeps its own direction ("2026-" stays as written).
                    <div key={index} className={styles['fact']} dir={'auto'}>{/^\d{1,4} min$/.test(fact) ? t('SCARY_MINUTES', { a: parseInt(fact, 10) }) : fact}</div>
                ))
            }
            {
                imdb !== null ?
                    <Button className={styles['imdb']} title={imdb.label} href={imdb.href} target={'_blank'}>
                        <div className={styles['rating']}>{imdb.label}</div>
                        <Icon className={styles['icon']} name={'imdb'} />
                    </Button>
                    :
                    null
            }
            {children}
        </div>
    );
};

export default Facts;
