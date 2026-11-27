// Copyright (C) 2017-2024 Smart code 203358507

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Table.less';
import Cell from './Cell/Cell';

import { leadingDays, weekDaysFrom, weekStartOf } from 'stremio/scary/domain/week';

type Props = {
    items: CalendarItem[],
    selected: CalendarDate | null,
    monthInfo: CalendarMonthInfo,
    onChange: (date: CalendarDate) => void,
};

const Table = ({ items, selected, monthInfo, onChange }: Props) => {
    const { t, i18n } = useTranslation();
    // SCARY: the week starts on the day it starts on in the interface language (Sunday in Hebrew).
    const weekStart = weekStartOf(i18n.language);
    const WEEK_DAYS = useMemo(() => weekDaysFrom(weekStart), [weekStart]);

    const cellsOffset = useMemo(() => {
        return Array.from(Array(leadingDays(monthInfo.firstWeekday, weekStart)).keys());
    }, [monthInfo, weekStart]);

    return (
        <div className={styles['table']}>
            <div className={styles['week']}>
                {
                    WEEK_DAYS.map((day) => (
                        <div className={styles['day']} key={day}>
                            <span className={styles['long']}>
                                {t(day)}
                            </span>
                            <span className={styles['short']}>
                                {t(day).slice(0, 3)}
                            </span>
                        </div>
                    ))
                }
            </div>
            <div className={styles['grid']}>
                {
                    cellsOffset.map((day) => (
                        <span key={day} />
                    ))
                }
                {
                    items.map((item) => (
                        <Cell
                            key={item.date.day}
                            {...item}
                            selected={selected}
                            monthInfo={monthInfo}
                            onClick={onChange}
                        />
                    ))
                }
            </div>
        </div>
    );
};

export default Table;
