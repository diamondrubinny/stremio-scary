// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './scary.less';

type Props = {
    level: number,
    className?: string,
};

const DROP = 'M12 2.5C8.5 8 5.5 11.6 5.5 15.2a6.5 6.5 0 0 0 13 0C18.5 11.6 15.5 8 12 2.5z';

/** SCARY's fear meter: five drops, as many filled as the film is frightening. Read out as "Fear level 4 of 5". */
const FearMeter = ({ level, className }: Props) => {
    const { t } = useTranslation();
    return (
        <div className={[styles['fear-meter'], className].filter(Boolean).join(' ')} role={'img'} aria-label={t('SCARY_FEAR_DESCRIPTION', { a: level })}>
            {
                [1, 2, 3, 4, 5].map((drop) => (
                    <svg key={drop} className={drop <= level ? styles['drop-full'] : styles['drop-empty']} viewBox={'0 0 24 24'} aria-hidden={'true'}>
                        <path d={DROP} />
                    </svg>
                ))
            }
        </div>
    );
};

export default FearMeter;
