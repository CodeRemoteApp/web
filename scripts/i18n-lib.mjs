// Shared logic for the website's translations: finds the translatable text in the English pages,
// renders each language's copy of a page, and builds the sitemap. No dependencies.
// English HTML is the only source; i18n/<code>.json maps a hash of each English segment to its
// translation. See README.md.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

export const config = JSON.parse(read('i18n/languages.json'));
export const BASE = config.base;
export const LANGS = config.languages;
export const OTHER = LANGS.filter((l) => l.code !== 'en');
const KEEP = new Set(read('i18n/keep.txt').split('\n').map((s) => s.trim()).filter(Boolean));

// Pages with translations; privacy and terms stay English.
export const TRANSLATED = ['index.html', 'support.html', 'compare.html', ...readdirSync(path.join(ROOT, 'docs')).filter((f) => f.endsWith('.html')).sort().map((f) => `docs/${f}`)];
export const ENGLISH_ONLY = ['privacy.html', 'terms.html'];
export const ALL_PAGES = [...TRANSLATED, ...ENGLISH_ONLY];

export const sitePath = (file) => file.replace(/(^|\/)index\.html$/, '$1');
const TRANSLATED_SITE = new Set(TRANSLATED.map(sitePath));

export function loadTranslations(code) {
	const file = `i18n/${code}.json`;
	if (!existsSync(path.join(ROOT, file))) return {};
	return JSON.parse(read(file));
}

// ---------- parsing ----------
const VOID = new Set(['meta', 'link', 'img', 'br', 'hr', 'input', 'source', 'area', 'base', 'col', 'embed', 'track', 'wbr']);
const RAW = new Set(['script', 'style']);
const SKIP = new Set(['pre', 'code', 'kbd', 'samp', 'script', 'style', 'svg']);
const BLOCK = new Set(['div', 'p', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'nav', 'header', 'footer', 'main', 'form', 'details', 'summary', 'blockquote', 'dl', 'dt', 'dd', 'figure', 'aside']);
const ATTRS = ['alt', 'aria-label', 'title', 'placeholder', 'data-copy-label', 'data-copied-label', 'data-sending', 'data-thanks', 'data-failed', 'data-retry'];
const TAG = /<!--[\s\S]*?-->|<!doctype[^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;

function parse(html) {
	const root = { tag: '#root', rest: '', children: [], openStart: 0, openEnd: 0, closeStart: html.length, closeEnd: html.length };
	const stack = [root];
	const lower = html.toLowerCase();
	const re = new RegExp(TAG.source, 'gi');
	let m;
	while ((m = re.exec(html))) {
		if (m[0].startsWith('<!')) continue;
		const [full, close, name, rest] = m;
		const tag = name.toLowerCase();
		if (close) {
			for (let i = stack.length - 1; i > 0; i--) {
				if (stack[i].tag !== tag) continue;
				for (let j = stack.length - 1; j > i; j--) stack[j].closeStart = stack[j].closeEnd = m.index;
				stack[i].closeStart = m.index;
				stack[i].closeEnd = m.index + full.length;
				stack.length = i;
				break;
			}
			continue;
		}
		const el = { tag, rest, children: [], openStart: m.index, openEnd: m.index + full.length, closeStart: null, closeEnd: null };
		stack.at(-1).children.push(el);
		if (VOID.has(tag) || /\/\s*$/.test(rest)) {
			el.closeStart = el.closeEnd = el.openEnd;
			continue;
		}
		if (RAW.has(tag)) {
			const at = lower.indexOf(`</${tag}`, el.openEnd);
			el.closeStart = at < 0 ? html.length : at;
			el.closeEnd = at < 0 ? html.length : html.indexOf('>', at) + 1;
			re.lastIndex = el.closeEnd;
			continue;
		}
		stack.push(el);
	}
	for (const el of stack.slice(1)) el.closeStart = el.closeEnd = html.length;
	return root;
}

const hasBlock = (el) => el.children.some((c) => BLOCK.has(c.tag) || hasBlock(c));
const noTranslate = (el) => /\btranslate\s*=\s*["']?no/i.test(el.rest);
const skipClass = (el) => /\bclass\s*=\s*"([^"]*)"/.exec(el.rest)?.[1].split(/\s+/).some((c) => c === 'term' || c === 'qr');

export const norm = (s) => s.replace(/\s+/g, ' ').trim();
export const keyOf = (core) => createHash('sha1').update(core).digest('hex').slice(0, 8);

function segment(start, end, raw, kind) {
	const core = norm(raw);
	if (!/\p{L}/u.test(core) || KEEP.has(core)) return null;
	const lead = kind === 'text' ? /^\s*/.exec(raw)[0] : '';
	const trail = kind === 'text' ? /\s*$/.exec(raw)[0] : '';
	return { start, end, kind, core, lead, trail, key: keyOf(core) };
}

// Translatable segments of an English page, in source order.
export function extract(html) {
	const out = [];
	const visit = (el) => {
		if (noTranslate(el)) return;
		if (el.tag !== '#root') {
			const nameAt = el.openStart + 1 + el.tag.length;
			const re = /([\w:-]+)\s*=\s*"([^"]*)"/dg;
			let a;
			const isMeta = el.tag === 'meta' && /(name\s*=\s*"description"|property\s*=\s*"og:(title|description)")/.test(el.rest);
			while ((a = re.exec(el.rest))) {
				const name = a[1].toLowerCase();
				if (!(ATTRS.includes(name) || (isMeta && name === 'content'))) continue;
				const [s, e] = a.indices[2];
				const seg = segment(nameAt + s, nameAt + e, a[2], 'attr');
				if (seg) out.push(seg);
			}
		}
		if (SKIP.has(el.tag) || skipClass(el)) return;
		const end = el.closeStart;
		const runs = [];
		let p = el.openEnd;
		for (const c of el.children) {
			if (c.openStart > p) runs.push([p, c.openStart]);
			p = c.closeEnd;
		}
		if (end > p) runs.push([p, end]);
		const texty = runs.filter(([a, b]) => /\p{L}/u.test(html.slice(a, b).replace(/<!--[\s\S]*?-->|<!doctype[^>]*>/gi, '')));
		const media = el.children.some((c) => c.tag === 'svg' || c.tag === 'img');
		if (texty.length && !media && !hasBlock(el) && el.tag !== '#root') {
			const seg = segment(el.openEnd, end, html.slice(el.openEnd, end), 'text');
			if (seg) out.push(seg);
			return;
		}
		// Mixed content: each run of text on its own, then the child elements.
		const all = [...runs.map((r) => ({ r })), ...el.children.map((c) => ({ c }))].sort((x, y) => (x.r?.[0] ?? x.c.openStart) - (y.r?.[0] ?? y.c.openStart));
		for (const item of all) {
			if (item.c) visit(item.c);
			else if (texty.includes(item.r)) {
				const seg = segment(item.r[0], item.r[1], html.slice(...item.r), 'text');
				if (seg) out.push(seg);
			}
		}
	};
	visit(parse(html));
	return out.sort((a, b) => a.start - b.start);
}

// ---------- injected blocks ----------
const BLOCK_RE = (name) => new RegExp(`[ \\t]*<!-- i18n:start ${name} -->[\\s\\S]*?<!-- i18n:end ${name} -->[ \\t]*\\n?`, 'g');
const strip = (html) => ['head', 'picker', 'script', 'note'].reduce((h, n) => h.replace(BLOCK_RE(n), ''), html);
const block = (name, indent, body) => `${indent}<!-- i18n:start ${name} -->\n${body.split('\n').map((l) => `${indent}${l}`).join('\n')}\n${indent}<!-- i18n:end ${name} -->\n`;

const GLOBE = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c-3 3-3 11 0 14M10 3c3 3 3 11 0 14"/></svg>';
const CHECK = '<svg class="check" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';

// Relative link from directory `from` to a site path (a folder ends in "/", the root is "").
export function link(from, to) {
	const dir = to === '' || to.endsWith('/');
	const r = path.posix.relative(`/${from}`, `/${to.replace(/\/$/, '')}`);
	if (dir) return r ? `${r}/` : './';
	return r;
}

const assetHash = (f) => createHash('sha1').update(readFileSync(path.join(ROOT, f))).digest('hex').slice(0, 8);

function rewrite(html, srcDir, outDir, folder) {
	return html.replace(new RegExp(TAG.source, 'gi'), (tag) =>
		tag.replace(/(\s(?:href|src|action)\s*=\s*)"([^"]*)"/gi, (whole, pre, v) => {
			if (!v || /^(#|\?|[a-z][a-z0-9+.-]*:|\/\/)/i.test(v)) return whole;
			const [, p, rest] = /^([^?#]*)(.*)$/.exec(v);
			let site = path.posix.normalize(path.posix.join(srcDir || '.', p));
			if (site === '.' || site === './') site = '';
			site = site.replace(/^\.\//, '');
			const target = TRANSLATED_SITE.has(sitePath(site)) || TRANSLATED_SITE.has(site) ? `${folder}/${sitePath(site)}` : site;
			return `${pre}"${link(outDir, target)}${rest}"`;
		}),
	);
}

function validate(en, tr, where) {
	const tags = (s) => (s.match(/<\/?[a-zA-Z][\w-]*/g) || []).sort().join('');
	const hrefs = (s) => [...s.matchAll(/href\s*=\s*"([^"]*)"/g)].map((m) => m[1]).sort().join('|');
	if (tags(en) !== tags(tr) || hrefs(en) !== hrefs(tr)) return `${where}: tags or links differ from English: ${en.slice(0, 60)}`;
	return null;
}

// Renders one page in one language. Returns { html, missing: Set(key), errors: [] }.
export function renderPage(file, lang, translations = {}) {
	const source = strip(read(file));
	const english = lang.code === 'en';
	const segs = extract(source);
	const missing = new Map();
	const errors = [];
	let html = source;
	for (const s of [...segs].reverse()) {
		const tr = english ? undefined : translations[s.key]?.text;
		if (!english && tr === undefined) {
			missing.set(s.key, s.core);
			continue;
		}
		if (english) continue;
		const bad = validate(s.core, tr, `${lang.code} ${file} [${s.key}]`);
		if (bad) errors.push(bad);
		if (s.kind === 'attr' && tr.includes('"')) errors.push(`${lang.code} ${file} [${s.key}]: double quote in attribute`);
		html = html.slice(0, s.start) + (s.kind === 'text' ? s.lead + tr + s.trail : tr) + html.slice(s.end);
	}
	const srcDir = path.posix.dirname(file) === '.' ? '' : path.posix.dirname(file);
	const outDir = english ? srcDir : `${lang.folder}${srcDir ? `/${srcDir}` : ''}`;
	if (!english) html = rewrite(html, srcDir, outDir, lang.folder);
	html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang.lang}"`);

	const here = sitePath(file);
	const translated = TRANSLATED_SITE.has(here);
	const pageUrl = (l) => BASE + (l.folder ? `${l.folder}/` : '') + here;
	const urlFor = (l) => (translated ? (l.folder ? `${l.folder}/` : '') + here : l.code === 'en' ? here : l.folder ? `${l.folder}/` : '');

	const headLines = [`<link rel="canonical" href="${pageUrl(translated ? lang : LANGS[0])}">`];
	if (translated) {
		for (const l of LANGS) headLines.push(`<link rel="alternate" hreflang="${l.lang}" href="${pageUrl(l)}">`);
		headLines.push(`<link rel="alternate" hreflang="x-default" href="${pageUrl(LANGS[0])}">`);
	}
	if (translated && english) {
		// Early, before the page paints: a visitor who picked a language goes to that language's copy.
		const map = Object.fromEntries(OTHER.map((l) => [l.code, link(outDir, `${l.folder}/${here}`)]));
		headLines.push(`<script>try{var m=${JSON.stringify(map)},l=localStorage.getItem("lang");if(m[l])location.replace(m[l]+location.search+location.hash)}catch(e){}</script>`);
	}
	html = html.replace(/^([ \t]*)<\/head>/m, (m, ind) => block('head', `${ind}\t`, headLines.join('\n')) + m);

	const items = LANGS.map((l) => {
		const cur = l.code === lang.code;
		const suggest = l.suggest ? ` data-suggest="${l.suggest}"` : '';
		return `\t<a role="menuitemradio" href="${link(outDir, urlFor(l))}" lang="${l.lang}" hreflang="${l.lang}" data-lang="${l.code}"${suggest} aria-checked="${cur}">${l.name}${CHECK}</a>`;
	});
	const picker = [
		`<button class="lang" type="button" popovertarget="lang-menu" aria-label="${lang.label}" title="${lang.label}">${GLOBE}</button>`,
		`<div class="theme-menu lang-menu" id="lang-menu" popover role="menu" aria-label="${lang.label}"${translated ? '' : ' data-english-only'}>`,
		...items,
		'</div>',
	].join('\n');
	html = html.replace(/^([ \t]*)(<button class="theme")/m, (m, ind, b) => block('picker', ind, picker) + ind + b);

	const libSrc = link(outDir, 'lang.js');
	html = html.replace(/^([ \t]*)<script src="[^"]*theme\.js[^"]*" defer><\/script>\n/m, (m, ind) => `${m}${block('script', ind, `<script src="${libSrc}?v=${assetHash('lang.js')}" defer></script>`)}`);

	if (!english && lang.note) {
		html = html.replace(/\n([ \t]*)<\/div>(\s*<\/footer>)/, (m, ind, tail) => `\n${block('note', `${ind}\t`, `<span class="i18n-note">${lang.note}</span>`)}${ind}</div>${tail}`);
	}
	return { html, segs, missing, errors };
}

// ---------- whole site ----------
export function buildAll() {
	const files = new Map();
	const errors = [];
	const missing = {};
	const live = new Set();
	for (const file of ALL_PAGES) {
		const en = renderPage(file, LANGS[0]);
		files.set(file, en.html);
	}
	for (const lang of OTHER) {
		const tr = loadTranslations(lang.code);
		missing[lang.code] = new Map();
		for (const file of TRANSLATED) {
			const r = renderPage(file, lang, tr);
			files.set(`${lang.folder}/${file}`, r.html);
			errors.push(...r.errors);
			for (const g of r.segs) live.add(g.key);
			for (const [k, v] of r.missing) missing[lang.code].set(k, v);
		}
	}
	files.set('sitemap.xml', sitemap());
	return { files, errors, missing, live };
}

function sitemap() {
	const old = read('sitemap.xml');
	const lastmod = new Map([...old.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1], m[2]]));
	const isLocalized = (loc) => OTHER.some((l) => loc.startsWith(`${BASE}${l.folder}/`));
	const order = [...old.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((loc) => !isLocalized(loc));
	const urls = [];
	for (const loc of order) urls.push(loc);
	for (const f of ALL_PAGES) {
		const loc = BASE + sitePath(f);
		if (!urls.includes(loc)) urls.push(loc);
	}
	const entries = [];
	const mod = (loc) => lastmod.get(loc);
	for (const loc of urls) {
		const here = loc.slice(BASE.length);
		const translated = TRANSLATED_SITE.has(here);
		const alt = translated ? LANGS.map((l) => `\t\t<xhtml:link rel="alternate" hreflang="${l.lang}" href="${BASE}${l.folder ? `${l.folder}/` : ''}${here}"/>`).concat(`\t\t<xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>`) : [];
		entries.push(entry(loc, mod(loc), alt));
		if (translated) for (const l of OTHER) entries.push(entry(`${BASE}${l.folder}/${here}`, mod(loc), alt));
	}
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`;
}
const entry = (loc, date, alt) => `\t<url>\n\t\t<loc>${loc}</loc>\n${date ? `\t\t<lastmod>${date}</lastmod>\n` : ''}${alt.length ? `${alt.join('\n')}\n` : ''}\t</url>`;
