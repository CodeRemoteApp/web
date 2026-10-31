# web

See `README.md` for what the site is and how assets are versioned.

## Keep the sitemap current

`sitemap.xml` lists every page for search engines (submitted in Google Search Console). In the
same commit as the change:

- **New page**: add a `<url>` with its full URL under `https://coderemoteapp.github.io/web/`
  (a folder's `index.html` is listed as the folder, e.g. `docs/`).
- **Removed or renamed page**: remove or change its `<url>`.
- **Content that matters for search** (headings, body text, `<title>`, meta description, new
  sections): set that page's `<lastmod>` to today (`YYYY-MM-DD`).

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
