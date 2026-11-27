// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// What SCARY adds to the home screen, under the spotlight: "What do you feel like tonight?" (moods, a decade,
// "Surprise me"), "How much time do you have?", the seasonal rows and "Because you loved…".

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MetaItem, MetaRow } from 'stremio/components';
import { discoverHref } from '../content/addon';
import { detailsHref, titleOf, toItem, toRow } from '../content/items';
import useScaryAddon from '../content/useScaryAddon';
import type { Film } from '../domain/film';
import { isRated, minutesOf } from '../domain/film';
import { pickSeason, seasonsOn } from '../domain/lists';
import { MOOD_IDS, availableDecades, pickTonight } from '../domain/moods';
import type { MoodId } from '../domain/moods';
import { becauseYouLoved } from '../domain/recommender';
import { BUDGETS, isLineup, planTime } from '../domain/timePlan';
import type { Budget } from '../domain/timePlan';
import { useFeedLanguage, useScaryRules, useScaryState } from '../hooks';
import { useComingSoon } from '../tmdb/useTmdb';
import Chip from './Chip';
import styles from './scary.less';

type Props = {
    rowClassName: string,
};

const DAY_MS = 86_400_000;
const hoursAndMinutes = (minutes: number): string => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

const BoardExtras = ({ rowClassName }: Props) => {
    const { t } = useTranslation();
    const language = useFeedLanguage();
    const scaryAddon = useScaryAddon();
    const { familyNight, loved, history, effects } = useScaryState();
    const rules = useScaryRules();
    const [mood, setMood] = useState<MoodId | null>(null);
    const [decade, setDecade] = useState<number | null>(null);
    const [budget, setBudget] = useState<Budget | null>(null);

    const films = useMemo(() => rules.library.films.filter((film) => !rules.isUnwanted(film)), [rules]);
    const decades = useMemo(() => availableDecades(films), [films]);
    const tonight = useMemo(() => pickTonight(films, mood, decade), [films, mood, decade]);
    const plan = useMemo(() => budget === null ? [] : planTime(films, budget, {
        epochDay: Math.floor(Date.now() / DAY_MS),
        watched: new Set(history.map(({ id }) => id)),
    }), [films, budget, history]);
    const seasons = useMemo(() => effects.seasonal ? seasonsOn(new Date()) : [], [effects.seasonal]);
    // Films not out yet have no scare level, so family night leaves the row out.
    const coming = useComingSoon(!familyNight);
    const because = useMemo(() => becauseYouLoved(films, [...loved].reverse()), [films, loved]);

    const row = useCallback((id: string, title: string, list: Film[], seeAll?: string) => list.length === 0 ? null : (
        <MetaRow
            key={id}
            className={rowClassName}
            title={title}
            catalog={{ ...toRow(id, title, 'movie', { type: 'Ready', content: list.map((film) => toItem(film, language)) }), deepLinks: seeAll ? { discover: seeAll } : {} }}
            itemComponent={MetaItem}
        />
    ), [rowClassName, language]);

    const surprise = useCallback(() => {
        const pool = tonight.length > 0 ? tonight : films.filter((film) => isRated(film) && !rules.isLocked(film));
        if (pool.length > 0) window.location.hash = detailsHref(pool[Math.floor(Math.random() * pool.length)]);
    }, [tonight, films, rules]);

    const moodCatalog = mood !== null && decade === null && scaryAddon !== null ? discoverHref(scaryAddon, 'movie', `scary_mood_${mood}`) : undefined;
    const planMinutes = plan.reduce((total, film) => total + minutesOf(film), 0);

    return (
        <div>
            <section className={styles['section']} aria-label={t('SCARY_ROW_MOODS')}>
                <h2 className={styles['section-title']}>
                    {t('SCARY_ROW_MOODS')}
                    {familyNight ? <span className={styles['badge']} style={{ marginInlineStart: '1rem', fontSize: '1rem' }}>{t('SCARY_FAMILY_NIGHT_BADGE')}</span> : null}
                </h2>
                <div className={styles['chips-line']}>
                    {MOOD_IDS.map((id) => (
                        <Chip key={id} label={t(`SCARY_MOOD_${id.toUpperCase()}`)} chosen={mood === id} onClick={() => setMood(mood === id ? null : id)} />
                    ))}
                    <Chip label={t('SCARY_SURPRISE_ME')} quiet={true} onClick={surprise} />
                    <Chip label={t('SCARY_AI_TITLE')} quiet={true} href={'#/scary/ask'} />
                </div>
                {
                    decades.length > 0 ?
                        <div className={styles['chips-line']} role={'group'} aria-label={t('SCARY_ROW_DECADES')}>
                            <span className={styles['section-note']}>{t('SCARY_ROW_DECADES')}</span>
                            {decades.map((value) => (
                                <Chip key={value} label={t('SCARY_DECADE_LABEL', { a: value })} chosen={decade === value} onClick={() => setDecade(decade === value ? null : value)} />
                            ))}
                        </div>
                        :
                        null
                }
            </section>
            {
                mood !== null || decade !== null ?
                    row('scary_tonight', [mood !== null ? t(`SCARY_MOOD_${mood.toUpperCase()}`) : null, decade !== null ? t('SCARY_DECADE_LABEL', { a: decade }) : null].filter(Boolean).join(' · '), tonight, moodCatalog)
                    ?? <p className={styles['section']} role={'status'}><span className={styles['section-note']}>{t('SCARY_TIME_EMPTY')}</span></p>
                    :
                    null
            }
            <section className={styles['section']} aria-label={t('SCARY_ROW_TIME')}>
                <h2 className={styles['section-title']}>{t('SCARY_ROW_TIME')}</h2>
                <div className={styles['chips-line']}>
                    {(Object.keys(BUDGETS) as Budget[]).map((id) => (
                        <Chip key={id} label={t(`SCARY_TIME_${id.toUpperCase()}`)} chosen={budget === id} onClick={() => setBudget(budget === id ? null : id)} />
                    ))}
                </div>
            </section>
            {
                budget !== null ?
                    row('scary_time', isLineup(budget) ? t('SCARY_TIME_LINEUP', { a: hoursAndMinutes(planMinutes) }) : t(`SCARY_TIME_${budget.toUpperCase()}`), plan)
                    ?? <p className={styles['section']} role={'status'}><span className={styles['section-note']}>{t('SCARY_TIME_EMPTY')}</span></p>
                    :
                    null
            }
            {seasons.map((season) => row(`scary_${season}`, t(`SCARY_ROW_${season.toUpperCase()}`), pickSeason(films, season)))}
            {
                coming.length > 0 ?
                    <MetaRow
                        className={rowClassName}
                        title={t('SCARY_ROW_COMING_SOON')}
                        catalog={toRow('scary_coming', t('SCARY_ROW_COMING_SOON'), 'movie', { type: 'Ready', content: coming.map((film) => ({
                            id: film.imdbId,
                            type: 'movie',
                            name: `${film.title} · ${t('SCARY_COMING_ON', { a: new Date(`${film.date}T00:00:00`).toLocaleDateString(language) })}`,
                            poster: film.poster,
                            posterShape: 'poster',
                            deepLinks: { metaDetailsVideos: null, metaDetailsStreams: `#/detail/movie/${film.imdbId}/${film.imdbId}`, player: null },
                        })) })}
                        itemComponent={MetaItem}
                    />
                    :
                    null
            }
            {because !== null ? row('scary_because', t('SCARY_ROW_BECAUSE_LOVED', { a: titleOf(because.because, language) }), because.films) : null}
        </div>
    );
};

export default BoardExtras;
