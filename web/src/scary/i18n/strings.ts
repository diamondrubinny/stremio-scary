// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The words SCARY Web adds to Stremio Web's own translations, in SCARY's five languages.

import type { FeedLanguage } from '../content/addon';

type ScaryStrings = {
    SCARY_SEARCH_FILMS: string,
    SCARY_SEARCH_SERIES: string,
    SCARY_SEARCH_EMPTY: string,
    SCARY_SEARCH_UNAVAILABLE: string,
    SCARY_ABOUT: string,
    SCARY_ABOUT_NOTICE: string,
    SCARY_LICENSE: string,
    SCARY_BASED_ON: string,
};

const STRINGS: Record<FeedLanguage, ScaryStrings> = {
    en: {
        SCARY_SEARCH_FILMS: 'Films',
        SCARY_SEARCH_SERIES: 'Series',
        SCARY_SEARCH_EMPTY: 'Nothing in the library answers this search. SCARY holds horror, thriller and mystery only.',
        SCARY_SEARCH_UNAVAILABLE: 'The library could not be loaded. Check the connection and try again.',
        SCARY_ABOUT: 'About SCARY Web',
        SCARY_ABOUT_NOTICE: 'SCARY Web is an unofficial, modified version of Stremio Web. It is not made, endorsed or supported by Stremio. No account, no ads, no tracking: your library stays in this browser.',
        SCARY_LICENSE: 'Licenses and notices (GPL-2.0)',
        SCARY_BASED_ON: 'Based on Stremio Web (open source)',
    },
    he: {
        SCARY_SEARCH_FILMS: 'סרטים',
        SCARY_SEARCH_SERIES: 'סדרות',
        SCARY_SEARCH_EMPTY: 'לא נמצא במאגר דבר שמתאים לחיפוש. ב־SCARY יש רק אימה, מתח ומסתורין.',
        SCARY_SEARCH_UNAVAILABLE: 'לא ניתן לטעון את המאגר. בדקו את החיבור ונסו שוב.',
        SCARY_ABOUT: 'על SCARY Web',
        SCARY_ABOUT_NOTICE: 'SCARY Web היא גרסה לא רשמית ומותאמת של Stremio Web. היא לא נוצרה, לא אושרה ולא נתמכת על ידי Stremio. בלי חשבון, בלי פרסומות ובלי מעקב: הספרייה שלכם נשארת בדפדפן הזה.',
        SCARY_LICENSE: 'רישיונות והודעות (GPL-2.0)',
        SCARY_BASED_ON: 'מבוסס על Stremio Web (קוד פתוח)',
    },
    ar: {
        SCARY_SEARCH_FILMS: 'أفلام',
        SCARY_SEARCH_SERIES: 'مسلسلات',
        SCARY_SEARCH_EMPTY: 'لا شيء في المكتبة يطابق هذا البحث. في SCARY رعب وإثارة وغموض فقط.',
        SCARY_SEARCH_UNAVAILABLE: 'تعذّر تحميل المكتبة. تحقّق من الاتصال وحاول مرة أخرى.',
        SCARY_ABOUT: 'حول SCARY Web',
        SCARY_ABOUT_NOTICE: 'SCARY Web نسخة غير رسمية ومعدّلة من Stremio Web. لم تصنعها Stremio ولا تعتمدها ولا تدعمها. بلا حساب وبلا إعلانات وبلا تتبّع: مكتبتك تبقى في هذا المتصفح.',
        SCARY_LICENSE: 'التراخيص والإشعارات (GPL-2.0)',
        SCARY_BASED_ON: 'مبني على Stremio Web (مفتوح المصدر)',
    },
    pt: {
        SCARY_SEARCH_FILMS: 'Filmes',
        SCARY_SEARCH_SERIES: 'Séries',
        SCARY_SEARCH_EMPTY: 'Nada na biblioteca corresponde a esta busca. O SCARY só tem terror, suspense e mistério.',
        SCARY_SEARCH_UNAVAILABLE: 'Não foi possível carregar a biblioteca. Verifique a conexão e tente de novo.',
        SCARY_ABOUT: 'Sobre o SCARY Web',
        SCARY_ABOUT_NOTICE: 'O SCARY Web é uma versão não oficial e modificada do Stremio Web. Não é feito, endossado nem suportado pelo Stremio. Sem conta, sem anúncios, sem rastreamento: sua biblioteca fica neste navegador.',
        SCARY_LICENSE: 'Licenças e avisos (GPL-2.0)',
        SCARY_BASED_ON: 'Baseado no Stremio Web (código aberto)',
    },
    ru: {
        SCARY_SEARCH_FILMS: 'Фильмы',
        SCARY_SEARCH_SERIES: 'Сериалы',
        SCARY_SEARCH_EMPTY: 'В библиотеке нет ничего по этому запросу. В SCARY только ужасы, триллеры и детективы.',
        SCARY_SEARCH_UNAVAILABLE: 'Не удалось загрузить библиотеку. Проверьте соединение и попробуйте снова.',
        SCARY_ABOUT: 'О SCARY Web',
        SCARY_ABOUT_NOTICE: 'SCARY Web — неофициальная изменённая версия Stremio Web. Она не создана, не одобрена и не поддерживается Stremio. Без аккаунта, рекламы и слежки: ваша библиотека остаётся в этом браузере.',
        SCARY_LICENSE: 'Лицензии и уведомления (GPL-2.0)',
        SCARY_BASED_ON: 'На основе Stremio Web (открытый код)',
    },
};

export { STRINGS };
export type { ScaryStrings };
