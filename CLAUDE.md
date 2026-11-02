# web

See `README.md` for what the site is and how assets are versioned.

## Languages

`vi/`, `ja/`, `zh-hans/` and `es/` are generated from the English pages by `scripts/build-i18n.mjs`
(see README, "Languages"). Never edit them by hand. After changing an English page, run the build and
`scripts/check-i18n.mjs`, translate what's missing, and commit the generated files with the change.
A new page also goes into `TRANSLATED` or `ENGLISH_ONLY` in `scripts/i18n-lib.mjs`.

## Keep the sitemap current

`sitemap.xml` lists every page for search engines (submitted in Google Search Console). The build
regenerates it (localized URLs and `hreflang` alternates included), keeping each English page's
`<lastmod>`; a localized URL takes its English page's date. In the same commit as the change:

- **New page**: add it to `scripts/i18n-lib.mjs` and run the build; it adds the `<url>`s
  (a folder's `index.html` is listed as the folder, e.g. `docs/`).
- **Removed or renamed page**: remove it from `scripts/i18n-lib.mjs` and from `sitemap.xml`, then build.
- **Content that matters for search** (headings, body text, `<title>`, meta description, new
  sections): set that page's `<lastmod>` to today (`YYYY-MM-DD`) in `sitemap.xml` before building.

Styling, scripts, asset stamps (`?v=`) and other changes that don't alter what a page says don't
touch the sitemap. Leave out `changefreq` and `priority`: Google ignores them.

## app.json: update prompts in the iOS app

`app.json` tells the iOS app when to ask its user to update (the app reads it on launch and when
it comes back, at most once an hour; not reaching it never blocks anyone):

- `minVersion`: older app versions can't be used until they update (a blocking screen).
- `latestVersion`: older versions are offered the update once, with "Later".
- `message`: optional text for either prompt; `null` uses the app's own.
- `appStoreURL`: the App Store page once the app is listed (`null` sends everyone to TestFlight);
  `testFlightURL`: the public TestFlight link.

Only raise either one to a version users can already install (approved on TestFlight or live on
the App Store), never at tag time. When to raise `minVersion` is decided in the iOS release skill
(`coderemote-ios/.claude/skills/release/SKILL.md`). `app.json` isn't a page: it stays out of
`sitemap.xml`.
