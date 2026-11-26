# SCARY Web

**The horror cinema of [SCARY](https://github.com/diamondrubinny/Scary), in the browser.**
Work in progress. Spec and roadmap (Hebrew): [docs/PLAN.md](docs/PLAN.md). Spike findings: [docs/SPIKE.md](docs/SPIKE.md).

> **Unofficial.** SCARY Web is built on the open-source code of Stremio Web. It is not made, endorsed or supported by
> Stremio / Smart Code OOD. "Stremio" is their trademark.

- Horror, thriller and mystery only: the home screen, discovery and search come from SCARY's weekly film feed.
- No account and no login. Your library and "continue watching" stay in this browser only.
- No analytics, no ads, no tracking. Calls to Stremio's account API are blocked inside the app.
- No video of its own: no hosted files, no sources, no recommended add-ons. Add-ons are yours to choose.
- English, Hebrew, Arabic, Portuguese and Russian; right to left where it should be.

## עברית

SCARY Web היא גרסת הדפדפן של SCARY: מסך בית, גילוי וחיפוש של סרטי וסדרות אימה ומתח בלבד, על בסיס הקוד הפתוח של
Stremio Web. **מוצר לא רשמי**, בלי חשבון, בלי התחברות, בלי פרסומות ובלי מעקב. האפיון ותוכנית הדרך:
[docs/PLAN.md](docs/PLAN.md).

## Repository layout

| Path | What it is | License |
|---|---|---|
| `web/` | The web app: Stremio Web (git subtree) plus the SCARY layer in `web/src/scary/` | GPL-2.0 |
| `feed/` | Builds SCARY's film feed into static catalog files | GPL-2.0 |
| `android/` | The same web app as an Android app (phones, tablets, Android TV): a WebView around the built site. See [docs/ANDROID.md](docs/ANDROID.md) | GPL-2.0 |
| `src/`, `package.json` | `stremio-video`, the player library this repository was forked from, unchanged | MIT |
| `docs/` | Spec, spike findings, upstream sync guide, policies (drafts) | |
| `scripts/` | Development helpers | GPL-2.0 |

## Development

Node.js 22+ and pnpm 11+.

```bash
cd web
pnpm install --frozen-lockfile
pnpm start          # http://localhost:8080
pnpm lint && pnpm test && pnpm build
```

In a sandbox that cannot download GitHub tarballs, use `scripts/sandbox-install.sh` instead of `pnpm install`.
Updating from Stremio: [docs/UPSTREAM_SYNC.md](docs/UPSTREAM_SYNC.md).

## Licenses and credit

See [NOTICE](NOTICE). The web app is a modified version of Stremio Web and stays under the GPL-2.0
([web/LICENSE.md](web/LICENSE.md)); its source is this repository. Movie information and images come from Cinemeta
(Stremio) and belong to their owners. The film feed is built from Wikidata (CC0) and Cinemeta by SCARY.
