// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The names shown for rows and subgenres, in SCARY's five languages. They are SCARY's own (core FeedCatalog.kt and the
// app's strings.xml). The feed carries ids only, so a file from the network can never put its own words on the screen.

export const LANGUAGES = ['en', 'he', 'ar', 'pt', 'ru'] as const;
export type Language = typeof LANGUAGES[number];
export type Labels = Record<Language, string>;

/** Home rows, in home-screen order. A row of the feed without a name here is left out. */
export const ROW_LABELS: Record<string, Labels> = {
    new_nightmares: {"en": "New nightmares", "he": "סיוטים חדשים", "ar": "كوابيس جديدة", "pt": "Novos pesadelos", "ru": "Новые кошмары"},
    popular: {"en": "Everyone is watching", "he": "כולם צופים עכשיו", "ar": "الجميع يشاهد الآن", "pt": "Todo mundo está vendo", "ru": "Сейчас смотрят все"},
    max_fear: {"en": "The highest rated", "he": "הכי מדורגים", "ar": "الأعلى تقييمًا", "pt": "Os mais bem avaliados", "ru": "С самым высоким рейтингом"},
    slashers: {"en": "Masks and blades", "he": "סכינים ומסכות", "ar": "أقنعة وشفرات", "pt": "Máscaras e lâminas", "ru": "Маски и клинки"},
    supernatural: {"en": "Ghosts, demons and possession", "he": "רוחות, שדים ודיבוקים", "ar": "أشباح وشياطين ومسّ", "pt": "Fantasmas, demônios e possessão", "ru": "Призраки, демоны и одержимость"},
    haunted_houses: {"en": "Haunted houses", "he": "בתים רדופים", "ar": "بيوت مسكونة", "pt": "Casas assombradas", "ru": "Дома с привидениями"},
    zombies: {"en": "The dead walk", "he": "זומבים", "ar": "الموتى يمشون", "pt": "Os mortos andam", "ru": "Мертвецы идут"},
    vampires: {"en": "Vampires", "he": "ערפדים", "ar": "مصاصو الدماء", "pt": "Vampiros", "ru": "Вампиры"},
    creatures: {"en": "Creatures and monsters", "he": "יצורים ומפלצות", "ar": "مخلوقات ووحوش", "pt": "Criaturas e monstros", "ru": "Твари и чудовища"},
    psychological_horror: {"en": "Psychological horror", "he": "אימה פסיכולוגית", "ar": "رعب نفسي", "pt": "Terror psicológico", "ru": "Психологический хоррор"},
    found_footage: {"en": "Found footage", "he": "פוטג' שנמצא", "ar": "لقطات عُثر عليها", "pt": "Found footage: gravações encontradas", "ru": "Найденная плёнка"},
    horror_comedy: {"en": "Laughing and screaming", "he": "צוחקים ומפחדים", "ar": "نضحك ونصرخ", "pt": "Rindo e gritando", "ru": "Смешно и страшно"},
    classics: {"en": "Classics you can't skip", "he": "קלאסיקות שאסור לפספס", "ar": "كلاسيكيات لا تُفوَّت", "pt": "Clássicos imperdíveis", "ru": "Классика, которую нельзя пропустить"},
    thrillers: {"en": "Dark thrillers", "he": "מותחנים אפלים", "ar": "أفلام إثارة قاتمة", "pt": "Suspenses sombrios", "ru": "Мрачные триллеры"},
    series_must: {"en": "Horror series you can't skip", "he": "סדרות אימה שחובה לראות", "ar": "مسلسلات رعب لا تُفوَّت", "pt": "Séries de terror imperdíveis", "ru": "Хоррор-сериалы, которые нельзя пропустить"},
};

export const SUBGENRE_LABELS: Record<string, Labels> = {
    animal: {"en": "Animal attack", "he": "חיות תוקפות", "ar": "هجوم الحيوانات", "pt": "Ataque animal", "ru": "Нападение животных"},
    body: {"en": "Body horror", "he": "‏אימת הגוף", "ar": "رعب الجسد", "pt": "Horror corporal", "ru": "Боди-хоррор"},
    comedy: {"en": "Horror comedy", "he": "אימה קומית", "ar": "رعب كوميدي", "pt": "Terror cômico", "ru": "Комедийный хоррор"},
    cosmic: {"en": "Cosmic horror", "he": "אימה קוסמית", "ar": "رعب كوني", "pt": "Horror cósmico", "ru": "Космический ужас"},
    creature: {"en": "Creatures", "he": "יצורים", "ar": "مخلوقات", "pt": "Criaturas", "ru": "Чудовища"},
    crime: {"en": "Crime", "he": "פשע", "ar": "جريمة", "pt": "Crime", "ru": "Криминал"},
    folk: {"en": "Folk horror", "he": "אימה פולקלורית", "ar": "رعب شعبي", "pt": "Folk horror", "ru": "Фолк-хоррор"},
    found_footage: {"en": "Found footage", "he": "פאונד פוטג׳", "ar": "لقطات مُكتشفة", "pt": "Found footage", "ru": "Найденная плёнка"},
    ghost: {"en": "Ghosts", "he": "רוחות", "ar": "أشباح", "pt": "Fantasmas", "ru": "Призраки"},
    giallo: {"en": "Giallo", "he": "ג׳אלו", "ar": "جيالو", "pt": "Giallo", "ru": "Джалло"},
    gothic: {"en": "Gothic", "he": "גותי", "ar": "قوطي", "pt": "Gótico", "ru": "Готика"},
    haunted_house: {"en": "Haunted house", "he": "‏בית רדוף", "ar": "بيت مسكون", "pt": "Casa assombrada", "ru": "Дом с привидениями"},
    home_invasion: {"en": "Home invasion", "he": "פלישה לבית", "ar": "اقتحام المنزل", "pt": "Invasão domiciliar", "ru": "Вторжение в дом"},
    mystery: {"en": "Mystery", "he": "תעלומה", "ar": "غموض", "pt": "Mistério", "ru": "Детектив-загадка"},
    possession: {"en": "Possession", "he": "דיבוק", "ar": "مسّ شيطاني", "pt": "Possessão", "ru": "Одержимость"},
    psychological: {"en": "Psychological", "he": "פסיכולוגי", "ar": "نفسي", "pt": "Psicológico", "ru": "Психологический"},
    sci_fi: {"en": "Sci-fi horror", "he": "אימת מדע בדיוני", "ar": "رعب الخيال العلمي", "pt": "Terror de ficção científica", "ru": "Научно-фантастический хоррор"},
    slasher: {"en": "Slasher", "he": "סלאשר", "ar": "سفّاحون", "pt": "Slasher", "ru": "Слэшер"},
    social: {"en": "Social horror", "he": "אימה חברתית", "ar": "رعب اجتماعي", "pt": "Terror social", "ru": "Социальный хоррор"},
    supernatural: {"en": "Supernatural", "he": "על־טבעי", "ar": "خارق للطبيعة", "pt": "Sobrenatural", "ru": "Сверхъестественное"},
    survival: {"en": "Survival", "he": "הישרדות", "ar": "نجاة", "pt": "Sobrevivência", "ru": "Выживание"},
    vampire: {"en": "Vampires", "he": "‏ערפדים", "ar": "مصاصو دماء", "pt": "Vampiros", "ru": "Вампиры"},
    witch: {"en": "Witches", "he": "מכשפות", "ar": "ساحرات", "pt": "Bruxas", "ru": "Ведьмы"},
    zombie: {"en": "Zombies", "he": "‏זומבים", "ar": "زومبي", "pt": "Zumbis", "ru": "Зомби"},
};

/**
 * "What do you feel like tonight?": SCARY's moods, in the order of its chips. Each is a list picked from the films
 * that carry a hand-given scare level (see moods.ts).
 */
export const MOOD_LABELS: Record<string, Labels> = {
    gentle: {"en": "Scared, but not too much", "he": "מפחיד, אבל לא יותר מדי", "ar": "مخيف، لكن ليس كثيرًا", "pt": "Medo, mas não demais", "ru": "Страшно, но в меру"},
    mind_games: {"en": "Mind games", "he": "משחקי מוח", "ar": "ألعاب العقل", "pt": "Jogos mentais", "ru": "Игры разума"},
    ghosts: {"en": "Ghosts and demons", "he": "רוחות ושדים", "ar": "أشباح وشياطين", "pt": "Fantasmas e demônios", "ru": "Призраки и демоны"},
    blood: {"en": "Blood and screams", "he": "דם וצרחות", "ar": "دماء وصراخ", "pt": "Sangue e gritos", "ru": "Кровь и крики"},
    classics: {"en": "Old-school classics", "he": "קלאסיקות של פעם", "ar": "كلاسيكيات الزمن القديم", "pt": "Clássicos de outros tempos", "ru": "Старая классика"},
    relentless: {"en": "Don't sleep tonight", "he": "לא לישון הלילה", "ar": "لا نوم الليلة", "pt": "Hoje ninguém dorme", "ru": "Сегодня не уснуть"},
    short: {"en": "Short and sharp", "he": "קצר וחד", "ar": "قصير وحاد", "pt": "Curto e afiado", "ru": "Коротко и остро"},
};

export const GENRE_LABELS: Record<'horror' | 'thriller', Labels> = {
    horror: {"en": "Horror", "he": "אימה", "ar": "رعب", "pt": "Terror", "ru": "Ужасы"},
    thriller: {"en": "Thriller", "he": "מתח", "ar": "إثارة", "pt": "Suspense", "ru": "Триллер"},
};

export const ALL_FILMS_LABELS: Labels = { en: 'All horror films', he: 'כל סרטי האימה', ar: 'كل أفلام الرعب', pt: 'Todos os filmes de terror', ru: 'Все фильмы ужасов' };
export const ALL_SERIES_LABELS: Labels = { en: 'All horror series', he: 'כל סדרות האימה', ar: 'كل مسلسلات الرعب', pt: 'Todas as séries de terror', ru: 'Все сериалы ужасов' };

export const ADDON_DESCRIPTIONS: Labels = {
    en: 'Horror, thriller and mystery catalogs from SCARY. Catalogs only: no streams, no sources.',
    he: 'קטלוגים של אימה, מתח ומסתורין מבית SCARY. קטלוגים בלבד: בלי הזרמות ובלי מקורות.',
    ar: 'كتالوجات رعب وإثارة وغموض من SCARY. كتالوجات فقط: بلا بثّ وبلا مصادر.',
    pt: 'Catálogos de terror, suspense e mistério do SCARY. Só catálogos: sem streams e sem fontes.',
    ru: 'Каталоги ужасов, триллеров и детективов от SCARY. Только каталоги: без потоков и источников.',
};
