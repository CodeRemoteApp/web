// Translation housekeeping.
//   check-i18n.mjs                    report untranslated and outdated segments per language
//   check-i18n.mjs --built            also fail if committed pages differ from a fresh build
//   check-i18n.mjs --export vi FILE   write the untranslated segments as "key|English" lines
//   check-i18n.mjs --merge vi FILE    merge "key|translation" lines into i18n/vi.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, OTHER, buildAll, loadTranslations } from './i18n-lib.mjs';

const args = process.argv.slice(2);
const { files, errors, missing, live } = buildAll();
const jsonPath = (code) => path.join(ROOT, 'i18n', `${code}.json`);

if (args[0] === '--export') {
	const [, code, out] = args;
	writeFileSync(out, [...missing[code]].map(([k, en]) => `${k}|${en}`).join('\n') + '\n');
	console.log(`${missing[code].size} segments -> ${out}`);
	process.exit(0);
}
if (args[0] === '--merge') {
	const [, code, input] = args;
	const english = new Map([...missing[code]]);
	const tr = loadTranslations(code);
	let n = 0;
	for (const line of readFileSync(input, 'utf8').split('\n')) {
		const i = line.indexOf('|');
		if (i < 0) continue;
		const key = line.slice(0, i).trim();
		if (!english.has(key)) {
			console.error(`unknown or already translated key: ${key}`);
			continue;
		}
		tr[key] = { en: english.get(key), text: line.slice(i + 1).trim() };
		n++;
	}
	writeFileSync(jsonPath(code), JSON.stringify(tr, null, '\t') + '\n');
	console.log(`merged ${n} into i18n/${code}.json`);
	process.exit(0);
}

let bad = errors.length > 0;
for (const e of errors) console.error(e);
for (const { code } of OTHER) {
	const tr = loadTranslations(code);
	const m = missing[code];
	console.log(`${code}: ${Object.keys(tr).length} translated, ${m.size} missing`);
	for (const [k, en] of m) console.log(`  missing   ${k}  ${en.slice(0, 70)}`);
	// Outdated: translations of English text that no longer exists on any page.
	const old = Object.entries(tr).filter(([k]) => !live.has(k));
	for (const [k, v] of old) console.log(`  outdated  ${k}  ${v.en.slice(0, 70)}`);
	if (m.size || old.length) bad = true;
}
if (args.includes('--built')) {
	for (const [file, content] of files) {
		const p = path.join(ROOT, file);
		if (!existsSync(p) || readFileSync(p, 'utf8') !== content) {
			console.error(`out of date: ${file} (run scripts/build-i18n.mjs)`);
			bad = true;
		}
	}
}
if (bad) console.error('\ni18n check failed: translate the missing segments (README, "Languages"), then run scripts/build-i18n.mjs and commit.');
process.exit(bad ? 1 : 0);
