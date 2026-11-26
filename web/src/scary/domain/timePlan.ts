// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// "How much time do you have?", by the rules of SCARY for Android TV (TimePlan.kt): a few options for a short
// evening, or a lineup of two or three films that fills a long one, gentlest first.

import { isRated, isSeries, minutesOf } from './film';
import type { Film } from './film';

const BUDGETS = { quick: 90, evening: 120, double: 210, marathon: 300 } as const;
type Budget = keyof typeof BUDGETS;

const DOUBLE_MIN = 150;
const MARATHON_MIN = 240;
const MIN_OPTIONS = 8;
const MAX_OPTIONS = 20;
const MAX_CANDIDATES = 40;

const isLineup = (budget: Budget): boolean => budget === 'double' || budget === 'marathon';

/** A different order every day, the same all day: the film's id and the day, mixed. */
const dayRank = (film: Film, epochDay: number): number => {
    let hash = 0;
    for (let index = 0; index < film.id.length; index++) hash = (Math.imul(hash, 31) + film.id.charCodeAt(index)) | 0;
    return Math.imul(hash + epochDay, 0x9E3779B1) >>> 0;
};

const lineup = (ranked: Film[], count: number, min: number, max: number): Film[] | null => {
    const candidates = ranked.slice(0, MAX_CANDIDATES);
    const search = (start: number, chosen: Film[], total: number): Film[] | null => {
        if (chosen.length === count) return total >= min && total <= max ? chosen : null;
        for (let index = start; index < candidates.length; index++) {
            const next = candidates[index];
            if (total + minutesOf(next) > max) continue;
            const found = search(index + 1, [...chosen, next], total + minutesOf(next));
            if (found !== null) return found;
        }
        return null;
    };
    return search(0, [], 0)?.sort((a, b) => (a.f ?? 0) - (b.f ?? 0) || minutesOf(a) - minutesOf(b)) ?? null;
};

type PlanOptions = {
    epochDay: number,
    watched?: ReadonlySet<string>,
    exclude?: ReadonlySet<string>,
    isHidden?: (film: Film) => boolean,
};

/** Films for the time there is: unwatched ones first, and watched ones only when too few are left. */
const planTime = (films: Film[], budget: Budget, { epochDay, watched = new Set(), exclude = new Set(), isHidden = () => false }: PlanOptions): Film[] => {
    const rank = (list: Film[]): Film[] => [...list].sort((a, b) => dayRank(a, epochDay) - dayRank(b, epochDay));
    const pool = rank(films.filter((film) => isRated(film) && !isSeries(film) && minutesOf(film) > 0 && !exclude.has(film.id) && !isHidden(film)));
    const fresh = pool.filter((film) => !watched.has(film.id));
    const options = (fits: (film: Film) => boolean): Film[] => {
        const unseen = fresh.filter(fits);
        const all = unseen.length >= MIN_OPTIONS ? unseen : [...unseen, ...pool.filter((film) => fits(film) && !unseen.includes(film))];
        return all.slice(0, MAX_OPTIONS);
    };
    switch (budget) {
        case 'quick': return options((film) => minutesOf(film) <= BUDGETS.quick);
        case 'evening': return options((film) => minutesOf(film) > BUDGETS.quick && minutesOf(film) <= BUDGETS.evening);
        case 'double': return lineup(fresh, 2, DOUBLE_MIN, BUDGETS.double) ?? lineup(pool, 2, DOUBLE_MIN, BUDGETS.double) ?? [];
        case 'marathon': return lineup(fresh, 3, MARATHON_MIN, BUDGETS.marathon) ?? lineup(pool, 3, MARATHON_MIN, BUDGETS.marathon) ?? [];
    }
};

export { BUDGETS, isLineup, planTime };
export type { Budget };
