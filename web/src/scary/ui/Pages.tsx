// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// SCARY's own screens, at #/scary/<page>: "What do you love?", the bucket list, and "Your year in fear".

import React, { useMemo, useState } from 'react';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import Icon from '@stremio/stremio-icons/react';
import { Button, MainNavBars } from 'stremio/components';
import { detailsHref, posterOf, titleOf } from '../content/items';
import type { Film } from '../domain/film';
import { isRated, isSeries, minutesOf } from '../domain/film';
import { fearStats, moveInList, toggleInList } from '../domain/lists';
import { useFeedLanguage, useScaryRules, useScaryState } from '../hooks';
import { store } from '../state/store';
import AskPage from './AskPage';
import Chip from './Chip';
import FearMeter from './FearMeter';
import { ProfilesPage } from './Profiles';
import styles from './scary.less';

const hoursAndMinutes = (minutes: number): string => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

const Taste = () => {
    const { t } = useTranslation();
    const language = useFeedLanguage();
    const { loved } = useScaryState();
    const rules = useScaryRules();
    const [series, setSeries] = useState(false);
    const films = useMemo(() => rules.library.films.filter((film) => isRated(film) && isSeries(film) === series && !rules.isHidden(film) && !rules.isLocked(film)), [rules, series]);
    return (
        <React.Fragment>
            <h1 className={styles['page-title']}>{t('SCARY_TASTE_TITLE')}</h1>
            <div className={styles['section']}>
                <div className={styles['chips-line']}>
                    <Chip label={t('SCARY_TAB_MOVIES')} chosen={!series} onClick={() => setSeries(false)} />
                    <Chip label={t('SCARY_TAB_SERIES')} chosen={series} onClick={() => setSeries(true)} />
                    <Chip label={t('SCARY_TASTE_DONE')} quiet={true} href={'#/'} />
                </div>
            </div>
            <div className={styles['grid']}>
                {films.map((film) => (
                    <Button
                        key={film.id}
                        className={classnames(styles['pick'], { [styles['chosen']]: loved.includes(film.id) })}
                        title={titleOf(film, language)}
                        aria-pressed={loved.includes(film.id)}
                        onClick={() => store.update((state) => ({ loved: toggleInList(state.loved, film.id), notForMe: state.notForMe.filter((id) => id !== film.id) }))}
                    >
                        <img src={posterOf(film.id)} alt={''} loading={'lazy'} />
                        {titleOf(film, language)}
                    </Button>
                ))}
            </div>
        </React.Fragment>
    );
};

const Bucket = () => {
    const { t } = useTranslation();
    const language = useFeedLanguage();
    const { bucket } = useScaryState();
    const rules = useScaryRules();
    const films = bucket.map((id) => rules.library.byId.get(id)).filter((film): film is Film => film !== undefined);
    const total = films.reduce((sum, film) => sum + minutesOf(film), 0);
    const move = (id: string, by: number) => store.update((state) => ({ bucket: moveInList(state.bucket, id, by) }));
    // A film that family night or the parental lock holds back keeps its place in the list, without poster or name.
    const nameOf = (film: Film): string => rules.isHidden(film) || rules.isLocked(film) ? t('SCARY_LOCKED_BADGE') : titleOf(film, language);
    return (
        <React.Fragment>
            <h1 className={styles['page-title']}>{t('SCARY_BUCKET_TITLE')}</h1>
            {
                films.length === 0 ?
                    <div className={styles['section']}>
                        <h2 className={styles['section-title']}>{t('SCARY_BUCKET_EMPTY_TITLE')}</h2>
                        <p className={styles['section-note']}>{t('SCARY_BUCKET_EMPTY_BODY')}</p>
                    </div>
                    :
                    <React.Fragment>
                        <div className={styles['section']}>
                            <p className={styles['section-note']}>{t('SCARY_BUCKET_TOTAL', { a: films.length, b: hoursAndMinutes(total) })}</p>
                            <div className={styles['chips-line']}>
                                <Chip label={t('SCARY_BUCKET_START')} chosen={true} href={detailsHref(films[0])} />
                                <Chip label={t('SCARY_BUCKET_CLEAR')} quiet={true} onClick={() => store.update(() => ({ bucket: [] }))} />
                            </div>
                        </div>
                        <ol className={styles['bucket']}>
                            {films.map((film, index) => (
                                <li key={film.id} className={styles['bucket-film']}>
                                    <span className={styles['bucket-number']} aria-hidden={'true'}>{index + 1}</span>
                                    {rules.isHidden(film) || rules.isLocked(film) ? <div className={styles['bucket-held']} aria-hidden={'true'} /> : <img src={posterOf(film.id)} alt={''} loading={'lazy'} />}
                                    <a className={styles['bucket-name']} href={detailsHref(film)}>{nameOf(film)}</a>
                                    <span className={styles['bucket-time']}>{minutesOf(film) > 0 ? t('SCARY_MINUTES', { a: minutesOf(film) }) : ''}</span>
                                    <Button className={styles['icon-button']} title={t('SCARY_BUCKET_MOVE_UP', { a: nameOf(film) })} disabled={index === 0} onClick={() => move(film.id, -1)}>
                                        <Icon name={'caret-up'} />
                                    </Button>
                                    <Button className={styles['icon-button']} title={t('SCARY_BUCKET_MOVE_DOWN', { a: nameOf(film) })} disabled={index === films.length - 1} onClick={() => move(film.id, 1)}>
                                        <Icon name={'caret-down'} />
                                    </Button>
                                    <Button className={styles['icon-button']} title={t('SCARY_BUCKET_REMOVE', { a: nameOf(film) })} onClick={() => store.update((state) => ({ bucket: state.bucket.filter((id) => id !== film.id) }))}>
                                        <Icon name={'close'} />
                                    </Button>
                                </li>
                            ))}
                        </ol>
                    </React.Fragment>
            }
        </React.Fragment>
    );
};

const Stats = () => {
    const { t } = useTranslation();
    const language = useFeedLanguage();
    const { history, loved } = useScaryState();
    const rules = useScaryRules();
    const stats = useMemo(() => {
        const watched = [...new Set(history.map(({ id }) => id))].map((id) => rules.library.byId.get(id)).filter((film): film is Film => film !== undefined);
        return fearStats(watched, loved.length);
    }, [history, loved, rules.library]);
    const stat = (label: string, value: React.ReactNode) => (
        <div className={styles['stat']}>
            <div className={styles['stat-value']}>{value}</div>
            <div className={styles['stat-label']}>{label}</div>
        </div>
    );
    return (
        <React.Fragment>
            <h1 className={styles['page-title']}>{t('SCARY_SETTINGS_STATS')}</h1>
            {
                stats.watched === 0 && stats.loved === 0 ?
                    <div className={styles['section']}>
                        <h2 className={styles['section-title']}>{t('SCARY_STATS_EMPTY_TITLE')}</h2>
                        <p className={styles['section-note']}>{t('SCARY_STATS_EMPTY_BODY')}</p>
                    </div>
                    :
                    <div className={styles['stats']}>
                        {stat(t('SCARY_STATS_WATCHED'), stats.watched)}
                        {stat(t('SCARY_STATS_HOURS'), Math.round(stats.minutes / 60))}
                        {stat(t('SCARY_STATS_LOVED'), stats.loved)}
                        {stats.averageFear !== null ? stat(t('SCARY_STATS_AVERAGE_FEAR'), <FearMeter level={Math.round(stats.averageFear)} />) : null}
                        {stats.scariest !== null && !rules.isHidden(stats.scariest) && !rules.isLocked(stats.scariest) ? stat(t('SCARY_STATS_SCARIEST'), titleOf(stats.scariest, language)) : null}
                        {stats.favoriteSubgenre !== null ? stat(t('SCARY_STATS_FAVORITE_SUBGENRE'), t(stats.favoriteSubgenre)) : null}
                        {stats.favoriteDecade !== null ? stat(t('SCARY_STATS_FAVORITE_DECADE'), t('SCARY_DECADE_LABEL', { a: stats.favoriteDecade })) : null}
                    </div>
            }
        </React.Fragment>
    );
};

const Pages = () => {
    const { page } = useParams();
    return (
        <MainNavBars className={styles['page-container']} route={'scary'}>
            <main className={styles['page']}>
                {page === 'taste' ? <Taste /> : page === 'bucket' ? <Bucket /> : page === 'profiles' ? <ProfilesPage /> : page === 'ask' ? <AskPage /> : <Stats />}
            </main>
        </MainNavBars>
    );
};

export default Pages;
