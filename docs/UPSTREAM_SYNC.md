# עדכון מ-Stremio (upstream)

`web/` הוא `git subtree` של [Stremio/stremio-web](https://github.com/Stremio/stremio-web), ענף `development`.
הגרסה המיובאת כרגע: **5.2.0, commit `9d096ae`** (26.11.2026).

## כלל הזהב: פורק דק
- קוד של SCARY נכתב ב-`web/src/scary/` בלבד.
- בקובץ של upstream נוגעים רק כשאין ברירה, בשינוי הקטן ביותר, ורושמים אותו בטבלה למטה.
- לא מעצבים מחדש ולא מפרמטים קבצים של upstream.

## משיכת עדכון
```bash
git fetch --depth 1 https://github.com/Stremio/stremio-web development
git subtree merge --prefix=web FETCH_HEAD --squash -m "Update Stremio Web to <version> (<short sha>)"
# פותרים קונפליקטים (רק בקבצים מהטבלה למטה), ואז:
cd web && pnpm install && pnpm lint && pnpm test && pnpm build
```
אחרי עדכון: בודקים ידנית בית, גילוי, חיפוש, עמוד כותר, RTL, ושה"שומר רשת" עדיין חוסם את `api.strem.io`
(הבדיקה האוטומטית תיכנס בשלב 6). מעדכנים את הגרסה בראש המסמך.

`stremio-video` שבשורש הריפו מתעדכן במיזוג רגיל מ-`Stremio/stremio-video` (הוא לא שונה).

## קבצי upstream שנגענו בהם
| קובץ | מה שונה | למה |
|---|---|---|
| `web/webpack.config.js` | כניסת ה-worker → `src/scary/worker.ts`; הוסרה העתקת `.well-known` | "שומר הרשת" נטען לפני ה-core; לא משייכים את הדומיין לאפליקציית iOS של Stremio |
| `web/.well-known/` | נמחק | כנ"ל |
| `web/src/index.js` | שורה אחת: `require('./scary')` | נקודת הכניסה של שכבת SCARY |
| `web/src/index.html` | כותרת, תיאור, `lang`/`dir`, צבע; הוסרו סקריפט Chromecast (gstatic) וסקריפט Apple ID; בוטלה נעילת הזום | מיתוג, פרטיות, נגישות |
| `web/manifest.json` | שם, תיאור, צבעים, אייקון | מיתוג |
| `web/assets/images/*`, `web/assets/favicons/favicon.ico` | התוכן הוחלף (אותם שמות קבצים) ע"י `scripts/make-brand-assets.py` | מיתוג בלי לגעת בקוד |
| `web/tests/copyright.spec.js` | מדלג על `src/scary` | לקבצי SCARY כותרת רישיון משלהם (נבדקת ב-`tests/scary/credit.test.js`) |
| `web/jest.config.js` | קובץ חדש | הרצת בדיקות TypeScript בלי תלות חדשה |
| `web/webpack.config.js` (נוסף) | העתקת `../feed/dist` ל-`feed/`; החרגת `feed/` מה-precache של ה-Service Worker | קטלוגי SCARY מוגשים לצד האפליקציה ומתעדכנים כל שבוע |
| `web/src/App/App.js` | 2 שורות: `useScarySetup(profile)` | התקנה מקומית של קטלוגי SCARY, ספוטלייט, `lang`/`dir` |
| `web/src/routes/Board/Board.js` | 3 שורות: `useScaryBoard` | הבית מציג רק את שורות SCARY |
| `web/src/routes/Discover/useDiscover.js` | 5 שורות: ברירת מחדל וסינון ל-SCARY | גילוי של SCARY בלבד |
| `web/src/routes/Search/Search.js` | שורה אחת: `useSearch` → `useScarySearch` | חיפוש מקומי במאגר (5 שפות), השאילתה לא יוצאת מהדפדפן |
| `web/src/common/useTranslate.js` | תנאי אחד ב-`catalogTitle` | שמות השורות של SCARY בלי " - Movie" |
| `web/src/router/routerPaths.tsx` | הנתיב `/intro` מותנה ב-`ACCOUNTS_ENABLED` | בלי התחברות |
| `web/src/components/NavBar/HorizontalNavBar/NavMenu/NavMenuContent.js` | אזור המשתמש מוסתר; הוסרו קישורי העזרה, התנאים והפרטיות של Stremio | בלי התחברות; המסמכים של Stremio לא מתארים את SCARY Web |
| `web/src/routes/Library/Library.js`, `web/src/routes/Calendar/Calendar.tsx` | התנאי `profile.auth !== null` הורחב | ספרייה ולוח שנה מקומיים, בלי חשבון |
| `web/src/routes/Settings/Menu/Menu.tsx`, `web/src/routes/Settings/useSettingsPages.ts` | כרטיס החשבון ועמודי "חשבון" ו"אינטגרציות" מוסתרים | בלי התחברות |
| `web/src/routes/Settings/Help/Help.tsx` | "על SCARY Web": הודעת "לא רשמי", קישור לקוד המקור הזה, לרישיונות ול-upstream | GPL-2.0 (הודעה על שינוי + קוד מקור), מיתוג |
| `web/src/common/interfaceLanguages.json` | 6 שפות ממשק במקום 50+ | חמש השפות של SCARY (פורטוגזית בשתי גרסאות) |
| `web/package.json`, `web/pnpm-lock.yaml` | נוסף `postcss-rtlcss` 6.0.0 | RTL בזמן בנייה |
| `web/webpack.config.js` (נוסף) | `postcss-rtlcss` בשרשרת ה-PostCSS | RTL |
| `web/webpack.config.js` (נוסף) | שלושה `alias`: קובץ הפלטה של Stremio → `src/scary/theme/stremio-colors.less`; `@stremio/stremio-icons/react` → `src/scary/icons`; `stremio-icons-original` → הערכה המקורית | צבעי SCARY ואייקוני SCARY בכל המסכים בלי לגעת בהם |
| `web/src/routes/Settings/Interface/SpotlightSettings/useBoardCatalogs.ts` | סינון לקטלוגי SCARY | בורר הספוטלייט מציע רק שורות של SCARY |
| `web/assets/images/*` (נוסף) | איורים מקוריים במקום הקמע של Stremio ותמונת Big Buck Bunny | `scripts/render-illustrations.cjs` מ-`brand/illustrations/` |
| `web/tsconfig.json` | `"downlevelIteration": true` | פריסת `Set`/`Map` נשברת ב-ES5 בלי זה |
| `web/src/App/App.js` (נוסף) | `<ScaryOverlays />` | שער הנעילה, חלון ה-PIN, צמרמורת, ערפל, שומר מסך, טיימר שינה |
| `web/src/routes/Board/Board.js` (נוסף) | `<ScaryBoardExtras />`, סינון הספוטלייט, היסט של שורה אחת | מצבי רוח, תכנון זמן, שורות עונתיות; ערב משפחתי |
| `web/src/components/MetaItem/MetaItem.js` | `useScaryTile` (שתי שורות) + `id` ב-propTypes | אריח נעול בלי פוסטר ושם |
| `web/src/routes/Details/Hero/Hero.tsx`, `web/src/components/MetaPreview/MetaPreview.tsx` | `<ScaryDetailsExtras />` | מד פחד, אהבתי/לא בשבילי, Bucket list, "עוד כאלה" |
| `web/src/routes/Settings/{constants.ts,useSettingsPages.ts,Settings.tsx}` | עמוד "הגדרות SCARY" | ערב משפחתי, נעילה, אפקטים, טיימר שינה, רשימות, גיבוי |
| `web/src/router/routerPaths.tsx` (נוסף) | הנתיב `/scary/:page` | בורר הטעם, Bucket list, "השנה שלך בפחד" |
| `web/src/components/NavBar/HorizontalNavBar/SearchBar/SearchBar.js` | `useLocalSearch` → `useScaryLocalSearch`; `<ScaryVoiceButton />` | הצעות חיפוש מהמאגר של SCARY; חיפוש קולי |
| `web/assets/screenshots/*` | צילומי מסך של SCARY Web במקום של Stremio | מופיעים בחלון ההתקנה של ה-PWA |
| `web/src/index.html` (נוסף) | `<meta>` של Content-Security-Policy ו-`referrer` | סקריפטים מהאפליקציה בלבד (ו-YouTube אחרי הסכמה); בלי `object`, בלי `base` חיצוני |
| `web/src/components/Button/Button.tsx` | `role="button"` כשהכפתור הוא `div` | קוראי מסך מכריזים עליו ככפתור (נגישות) |
| `web/src/components/Image/Image.tsx` | `alt` ריק או רווח → `alt=""` | תמונה דקורטיבית מסומנת ככזו |
| `web/src/common/FileDrop/FileDrop.tsx` | `aria-hidden`, `tabIndex={-1}` על שדה הקובץ הנסתר | שדה בלי שם לא נחשף לקורא מסך |
| `web/src/components/NavBar/HorizontalNavBar/HorizontalNavBar.js`, `.../SearchBar/SearchBar.js` (נוסף) | `title` ו-`aria-label` לכפתורי "חזרה", "תפריט", "חיפוש", "ניקוי החיפוש" | כפתורי אייקון עם שם |
| `web/src/routes/Details/Hero/Description.tsx` | הוסר `aria-expanded` מהפסקה | התכונה לא חוקית על `<p>`; כפתור "עוד" כבר נושא אותה |
| `web/src/routes/Settings/Help/Help.tsx` (נוסף) | קישורים לטיוטות: פרטיות, תנאים, הצהרת נגישות | מסמכים קבועים ונגישים |
| `web/src/components/NavBar/HorizontalNavBar/NavMenu/NavMenuContent.js` (נוסף) | "הגדרות פרטיות" ו"הצהרת נגישות" בתפריט | קישור קבוע לניהול ההסכמה |
| 14 קובצי `.less`: `SegmentedControl`, `UpdateBanner`, `Calendar/{List/Item/Item,Table/Cell/Cell}`, `SpotlightSettings/{CatalogCard,CatalogsEmpty,CatalogTray,CatalogSheet}`, `Board/Spotlight/Slide`, `Discover/{styles,FiltersSheet/Selection/Selection,Guide/Row/Row}`, `Player/NextVideoPopup/styles`, `Details/EpisodePicker/EpisodePicker` | שורה אחת בכל קובץ: רקע שמתחת לטקסט `--primary-accent-color` → `--secondary-accent-color` | ניגודיות: טקסט בהיר על האדום הבהיר היה 3.1–3.4:1; על אדום הדם 6.5:1 |
| `Details/Actions/PlayButton.less`, `Details/EpisodePicker/EpisodePicker.less`, `Discover/Guide/{Row/Row,Skeleton/Skeleton}.less`, `App/GamepadModal/styles.less` | צבעים קשיחים של Stremio (סגול, ירוק) → משתני הפלטה של SCARY | כפתור "צפייה" הפך ירוק במעבר עכבר; שאריות סגול |
| `Settings/Menu/Menu.less`, `Calendar/Selector/Selector.less`, `Addons/Addon/styles.less`, `components/Scale/Scale.less`, `components/MetaPreview/Links.less` | `opacity` של טקסט מעומעם (לא מושבת) 0.3–0.5 → 0.65 | ניגודיות 4.5:1 לפחות |

## פעולות חד-פעמיות של בעל הריפו ב-GitHub
1. **Actions:** בפורק הם כבויים כברירת מחדל — לשונית Actions → "I understand my workflows, go ahead and enable them".
2. **Pages:** ‏Settings → Pages → Source: **GitHub Actions** (לקישור התצוגה; הפריסה רצה מהענף `master`).
