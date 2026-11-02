# web

The Code Remote website: landing page, docs (`docs/`), privacy policy, terms of use and support.
Plain HTML and CSS served by GitHub Pages from `main` at https://coderemoteapp.github.io/web/.

After editing `style.css`, `motion.js`, `theme.js`, `tabs.js`, `beta.js` or `icon.png`, run `scripts/version-assets.sh`. It stamps
each page's links with the file's content hash (`style.css?v=…`) so visitors get the new file
instead of a copy their browser cached.

## Languages

English is the source. Vietnamese (`vi/`), Japanese (`ja/`), Simplified Chinese (`zh-hans/`) and Spanish
(`es/`) copies of `index`, `support`, `compare` and `docs/*` are **generated**: never edit them by hand.
`privacy.html` and `terms.html` stay English only.

After editing any English page (or `i18n/*.json`, `lang.js`, `style.css`):

```sh
node scripts/build-i18n.mjs        # regenerate language folders, picker, hreflang and sitemap.xml
node scripts/check-i18n.mjs        # lists untranslated and outdated segments per language
```

The build finds the translatable text itself (no markup needed): the text of every element, plus
`<title>`, meta descriptions and `alt`/`aria-label`/`title`/`placeholder`. `pre`, `code`, `kbd`, `svg`,
anything with `translate="no"`, and the strings in `i18n/keep.txt` are left alone. Each segment is keyed by a
hash of its English text, so changing English makes the old translation "outdated" and the new text
"missing" (shown in English until translated).

To translate what's missing for a language:

```sh
node scripts/check-i18n.mjs --export vi todo.txt     # key|English lines
# write key|translation lines to done.txt (keep tags and links; see i18n/glossary.md)
node scripts/check-i18n.mjs --merge vi done.txt      # adds them to i18n/vi.json
node scripts/build-i18n.mjs
```

A new language: add it to `i18n/languages.json` (folder, name, `lang`, picker label, suggestion and legal
note), translate with the steps above, build. `node scripts/check-i18n.mjs --built` also fails if the
committed pages differ from a fresh build.
