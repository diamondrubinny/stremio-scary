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
| *(עדיין אין)* | | |

## פעולות חד-פעמיות של בעל הריפו ב-GitHub
1. **Actions:** בפורק הם כבויים כברירת מחדל — לשונית Actions → "I understand my workflows, go ahead and enable them".
2. **Pages:** ‏Settings → Pages → Source: **GitHub Actions** (לקישור התצוגה; הפריסה רצה מהענף `master`).
