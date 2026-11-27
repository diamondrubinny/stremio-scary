// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The day a week starts on, in the calendar. Stremio Web's calendar always starts on Monday; a Hebrew calendar starts
// on Sunday, an Arabic one on Saturday. Days are counted as Stremio Web counts them: Monday is 0, Sunday is 6.

const WEEK_DAYS: readonly string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONDAY = 0;
const SATURDAY = 5;
const SUNDAY = 6;

/** The first day of the week for an interface language ("he-IL", "pt-BR"). Monday where SCARY does not know better. */
const weekStartOf = (language: unknown): number => {
    const code = typeof language === 'string' ? language.toLowerCase() : '';
    if (code.startsWith('ar')) return SATURDAY;
    if (code.startsWith('he') || code.startsWith('en') || code === 'pt-br') return SUNDAY;
    return MONDAY;
};

/** The seven days in the order a week shows them. */
const weekDaysFrom = (start: number): string[] => WEEK_DAYS.map((_, index) => WEEK_DAYS[(start + index) % 7]);

/** How many empty places come before the first of the month, when it falls on `firstWeekday` (Monday is 0). */
const leadingDays = (firstWeekday: unknown, start: number): number =>
    typeof firstWeekday === 'number' && Number.isInteger(firstWeekday) && firstWeekday >= 0 && firstWeekday < 7 ? (firstWeekday - start + 7) % 7 : 0;

export { leadingDays, weekDaysFrom, weekStartOf };
