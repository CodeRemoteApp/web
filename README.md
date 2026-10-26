# web

The Code Remote website: landing page, docs (`docs/`), privacy policy, terms of use and support.
Plain HTML and CSS served by GitHub Pages from `main` at https://coderemoteapp.github.io/web/.

After editing `style.css`, `motion.js` or `icon.png`, run `scripts/version-assets.sh`. It stamps
each page's links with the file's content hash (`style.css?v=…`) so visitors get the new file
instead of a copy their browser cached.
