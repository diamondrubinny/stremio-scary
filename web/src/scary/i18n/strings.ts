// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The words SCARY Web adds to Stremio Web's own translations, in SCARY's five languages.

import type { FeedLanguage } from '../content/addon';

type ScaryStrings = {
    SCARY_SEARCH_FILMS: string,
    SCARY_SEARCH_SERIES: string,
    SCARY_SEARCH_EMPTY: string,
    SCARY_SEARCH_UNAVAILABLE: string,
};

const STRINGS: Record<FeedLanguage, ScaryStrings> = {
    en: {
        SCARY_SEARCH_FILMS: 'Films',
        SCARY_SEARCH_SERIES: 'Series',
        SCARY_SEARCH_EMPTY: 'Nothing in the library answers this search. SCARY holds horror, thriller and mystery only.',
        SCARY_SEARCH_UNAVAILABLE: 'The library could not be loaded. Check the connection and try again.',
    },
    he: {
        SCARY_SEARCH_FILMS: 'סרטים',
        SCARY_SEARCH_SERIES: 'סדרות',
        SCARY_SEARCH_EMPTY: 'לא נמצא במאגר דבר שמתאים לחיפוש. ב־SCARY יש רק אימה, מתח ומסתורין.',
        SCARY_SEARCH_UNAVAILABLE: 'לא ניתן לטעון את המאגר. בדקו את החיבור ונסו שוב.',
    },
    ar: {
        SCARY_SEARCH_FILMS: 'أفلام',
        SCARY_SEARCH_SERIES: 'مسلسلات',
        SCARY_SEARCH_EMPTY: 'لا شيء في المكتبة يطابق هذا البحث. في SCARY رعب وإثارة وغموض فقط.',
        SCARY_SEARCH_UNAVAILABLE: 'تعذّر تحميل المكتبة. تحقّق من الاتصال وحاول مرة أخرى.',
    },
    pt: {
        SCARY_SEARCH_FILMS: 'Filmes',
        SCARY_SEARCH_SERIES: 'Séries',
        SCARY_SEARCH_EMPTY: 'Nada na biblioteca corresponde a esta busca. O SCARY só tem terror, suspense e mistério.',
        SCARY_SEARCH_UNAVAILABLE: 'Não foi possível carregar a biblioteca. Verifique a conexão e tente de novo.',
    },
    ru: {
        SCARY_SEARCH_FILMS: 'Фильмы',
        SCARY_SEARCH_SERIES: 'Сериалы',
        SCARY_SEARCH_EMPTY: 'В библиотеке нет ничего по этому запросу. В SCARY только ужасы, триллеры и детективы.',
        SCARY_SEARCH_UNAVAILABLE: 'Не удалось загрузить библиотеку. Проверьте соединение и попробуйте снова.',
    },
};

export { STRINGS };
export type { ScaryStrings };
