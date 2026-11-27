// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// On the search screen: "Not found? Describe the film to Ask SCARY". Leads to the page with what was typed already
// in place; nothing is sent by following it.

import React from 'react';
import { useTranslation } from 'react-i18next';
import Chip from './Chip';
import styles from './scary.less';

const AskLink = ({ query }: { query?: string | null }) => {
    const { t } = useTranslation();
    const typed = typeof query === 'string' ? query.slice(0, 300) : '';
    return (
        <div className={styles['section']}>
            <div className={styles['chips-line']}>
                <Chip label={t('SCARY_AI_SMART_SEARCH')} quiet={true} href={`#/scary/ask?find=${encodeURIComponent(typed)}`} />
            </div>
        </div>
    );
};

export default AskLink;
