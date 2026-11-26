// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// What SCARY adds to a film's page: the fear meter, "Loved it" and "Not for me", the bucket list, and "More like this".

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { detailsHref, posterOf, titleOf } from '../content/items';
import { useScaryLibrary } from '../content/library';
import { isRated, isSeries } from '../domain/film';
import { BUCKET_MAX, toggleInList } from '../domain/lists';
import { qrCode, qrPath } from '../domain/qr';
import { moreLikeThis } from '../domain/recommender';
import { useFeedLanguage, useScaryRules, useScaryState } from '../hooks';
import { store } from '../state/store';
import { useTmdbFilm } from '../tmdb/useTmdb';
import Chip from './Chip';
import FearMeter from './FearMeter';
import styles from './scary.less';

type Link = { category?: string, name?: string, url?: string, href?: string };

type Props = {
    /** The film's id, when the screen knows it; otherwise it is read from the links. */
    id?: string | null,
    /** "series" for a series; anything else is a film. */
    type?: string | null,
    links?: Link[] | null,
};

const IMDB_ID = /tt\d{7,8}/;

/** The film's IMDb id, from the links its page carries (the IMDb link). */
const filmIdOf = (links: Link[] | null | undefined): string | null => {
    for (const link of links ?? []) {
        if (typeof link?.category === 'string' && link.category.toLowerCase() === 'imdb') {
            const match = IMDB_ID.exec(`${link.url ?? ''} ${link.href ?? ''}`);
            if (match !== null) return match[0];
        }
    }
    return null;
};

const DetailsExtras = ({ id: givenId, type, links }: Props) => {
    const { t } = useTranslation();
    const language = useFeedLanguage();
    const id = typeof givenId === 'string' && new RegExp(`^${IMDB_ID.source}$`).test(givenId) ? givenId : filmIdOf(links);
    const library = useScaryLibrary(id !== null);
    const { loved, notForMe, bucket } = useScaryState();
    const rules = useScaryRules(id !== null);
    const film = id !== null ? library.byId.get(id) ?? null : null;
    const similar = useMemo(() => film === null ? [] : moreLikeThis(library.films, film, new Set(notForMe), rules.isHidden).slice(0, 12), [library.films, film, notForMe, rules.isHidden]);
    const tmdb = useTmdbFilm(id, type === 'series' || (film !== null && isSeries(film)));
    const offers = tmdb.details?.offers ?? null;
    const qr = useMemo(() => id === null ? null : qrCode(`https://www.imdb.com/title/${id}/`), [id]);
    if (id === null) return null;
    return (
        <div className={styles['details-extras']}>
            {film !== null && isRated(film) ? <div className={styles['line']}><FearMeter level={film.f} /></div> : null}
            <div className={styles['line']}>
                <Chip
                    label={loved.includes(id) ? t('SCARY_ACTION_LOVED') : t('SCARY_ACTION_LOVE')}
                    chosen={loved.includes(id)}
                    onClick={() => store.update((state) => ({ loved: toggleInList(state.loved, id), notForMe: state.notForMe.filter((other) => other !== id) }))}
                />
                <Chip
                    label={notForMe.includes(id) ? t('SCARY_ACTION_NOT_FOR_ME_ON') : t('SCARY_ACTION_NOT_FOR_ME')}
                    chosen={notForMe.includes(id)}
                    onClick={() => store.update((state) => ({ notForMe: toggleInList(state.notForMe, id), loved: state.loved.filter((other) => other !== id) }))}
                />
                {
                    film !== null ?
                        <Chip
                            label={bucket.includes(id) ? t('SCARY_ACTION_IN_BUCKET') : t('SCARY_ACTION_ADD_BUCKET')}
                            chosen={bucket.includes(id)}
                            onClick={() => store.update((state) => ({ bucket: toggleInList(state.bucket, id, BUCKET_MAX) }))}
                        />
                        :
                        null
                }
            </div>
            {
                qr !== null ?
                    <div className={styles['qr']}>
                        <svg viewBox={`-2 -2 ${qr.length + 4} ${qr.length + 4}`} role={'img'} aria-label={t('SCARY_SHARE_SCAN')} shapeRendering={'crispEdges'}>
                            <path d={qrPath(qr)} fill={'currentColor'} />
                        </svg>
                        <span>{t('SCARY_SHARE_SCAN')}</span>
                    </div>
                    :
                    null
            }
            {
                tmdb.enabled && tmdb.details !== null ?
                    <React.Fragment>
                        <div className={styles['more-title']}>{t('SCARY_RENT_BUY_TITLE', { a: tmdb.country })}</div>
                        {
                            offers === null ?
                                <div className={styles['offers']}>{t('SCARY_RENT_BUY_NONE', { a: tmdb.country })}</div>
                                :
                                <dl className={styles['offers']}>
                                    {offers.included.length > 0 ? <div><dt>{t('SCARY_RENT_BUY_INCLUDED')}</dt><dd>{offers.included.join(' · ')}</dd></div> : null}
                                    {offers.rent.length > 0 ? <div><dt>{t('SCARY_OFFER_RENT')}</dt><dd>{offers.rent.join(' · ')}</dd></div> : null}
                                    {offers.buy.length > 0 ? <div><dt>{t('SCARY_OFFER_BUY')}</dt><dd>{offers.buy.join(' · ')}</dd></div> : null}
                                    <div>
                                        <dd>
                                            {offers.link !== null ? <a href={offers.link} target={'_blank'} rel={'noreferrer noopener'}>{t('SCARY_RENT_BUY_CREDIT')}</a> : t('SCARY_RENT_BUY_CREDIT')}
                                        </dd>
                                    </div>
                                </dl>
                        }
                        {
                            tmdb.details.cast.length > 0 ?
                                <React.Fragment>
                                    <div className={styles['more-title']}>{t('SCARY_CAST_LABEL').replace(/[:：]\s*$/, '')}</div>
                                    <ul className={styles['more-strip']}>
                                        {tmdb.details.cast.map((person) => (
                                            <li key={`${person.name}:${person.character}`} className={styles['more-film']}>
                                                {person.photo !== null ? <img src={person.photo} alt={''} loading={'lazy'} referrerPolicy={'no-referrer'} /> : <div className={styles['no-photo']} aria-hidden={'true'}>{person.name.slice(0, 1)}</div>}
                                                <strong>{person.name}</strong>
                                                {person.character.length > 0 ? <span>{person.character}</span> : null}
                                            </li>
                                        ))}
                                    </ul>
                                </React.Fragment>
                                :
                                null
                        }
                        {tmdb.details.studios.length > 0 ? <div className={styles['offers']}>{t('SCARY_STUDIOS')}: {tmdb.details.studios.join(' · ')}</div> : null}
                    </React.Fragment>
                    :
                    null
            }
            {
                similar.length > 0 ?
                    <React.Fragment>
                        <div className={styles['more-title']}>{t('SCARY_ROW_MORE_LIKE')}</div>
                        <div className={styles['more-strip']}>
                            {similar.map((other) => (
                                <a key={other.id} className={styles['more-film']} href={detailsHref(other)} title={titleOf(other, language)}>
                                    <img src={posterOf(other.id)} alt={''} loading={'lazy'} />
                                    {titleOf(other, language)}
                                </a>
                            ))}
                        </div>
                    </React.Fragment>
                    :
                    null
            }
        </div>
    );
};

export default DetailsExtras;
export { filmIdOf };
