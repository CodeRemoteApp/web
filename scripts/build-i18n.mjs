// Renders the translated copies of the pages (vi/, ja/, zh-hans/, es/), adds the language picker
// and hreflang links to every page, and rewrites sitemap.xml. Run after editing an English page
// or a translation, and commit the result. `scripts/check-i18n.mjs` reports what's untranslated.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, buildAll } from './i18n-lib.mjs';

const { files, errors, missing } = buildAll();
if (errors.length) {
	console.error(errors.join('\n'));
	process.exit(1);
}
let changed = 0;
for (const [file, content] of files) {
	const target = path.join(ROOT, file);
	if (existsSync(target) && readFileSync(target, 'utf8') === content) continue;
	mkdirSync(path.dirname(target), { recursive: true });
	writeFileSync(target, content);
	changed++;
}
console.log(`${files.size} files, ${changed} written`);
for (const [code, m] of Object.entries(missing)) if (m.size) console.log(`${code}: ${m.size} untranslated segments (shown in English); run scripts/check-i18n.mjs`);
