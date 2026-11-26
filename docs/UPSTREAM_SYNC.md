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
| `web/assets/screenshots/*` | צילומי מסך של SCARY Web במקום של Stremio | מופיעים בחלון ההתקנה של ה-PWA |

## פעולות חד-פעמיות של בעל הריפו ב-GitHub
1. **Actions:** בפורק הם כבויים כברירת מחדל — לשונית Actions → "I understand my workflows, go ahead and enable them".
2. **Pages:** ‏Settings → Pages → Source: **GitHub Actions** (לקישור התצוגה; הפריסה רצה מהענף `master`).
