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
