// Install tabs (one per install method), and colors and copy buttons on commands. Without JS
// every panel shows, one after another under its own label, and the commands are plain text.
const KEY = 'install-tab';
const groups = document.querySelectorAll('[data-tabs]');

function remembered() {
	try {
		return localStorage.getItem(KEY);
	} catch {
		return null;
	}
}

function guess() {
	const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent;
	return /win/i.test(platform) ? 'windows' : 'unix';
}

// Every group on the page follows the same choice, so Install and Uninstall agree.
function select(name, focus) {
	for (const group of groups) {
		const tabs = group.querySelectorAll('[role="tab"]');
		if (![...tabs].some((t) => t.dataset.tab === name)) continue;
		for (const tab of tabs) {
			const on = tab.dataset.tab === name;
			tab.setAttribute('aria-selected', on);
			tab.tabIndex = on ? 0 : -1;
			group.querySelector(`[data-panel="${tab.dataset.tab}"]`).hidden = !on;
			if (on && focus === group) tab.focus();
		}
	}
}

for (const group of groups) {
	const tabs = [...group.querySelectorAll('[role="tab"]')];
	group.addEventListener('click', (e) => {
		const tab = e.target.closest('[role="tab"]');
		if (!tab) return;
		select(tab.dataset.tab);
		try {
			localStorage.setItem(KEY, tab.dataset.tab);
		} catch {}
	});
	group.addEventListener('keydown', (e) => {
		const i = tabs.indexOf(e.target);
		if (i < 0) return;
		const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
		if (next === undefined) return;
		e.preventDefault();
		select(tabs[(next + tabs.length) % tabs.length].dataset.tab, group);
	});
	group.classList.add('ready');
}
if (groups.length) select(remembered() || guess());

// Colors the commands in command blocks: what follows a `$ ` prompt (or all of a data-copy
// block), up to the end of the line or its comment. Output lines are left as they are.
const TOKEN = /(\s+)|(\|\||&&|[|;>])|("[^"]*"|'[^']*')|(\S+)/g;

function colored(text) {
	const out = document.createDocumentFragment();
	let head = true; // the next word names a command
	for (const [token, space, op, quoted, word] of text.matchAll(TOKEN)) {
		let kind = null;
		if (space) kind = null;
		else if (op) kind = 'op';
		else if (quoted) kind = 'str';
		else if (/^--?[a-zA-Z]/.test(word)) kind = 'flag';
		else if (head && /^[A-Z_]+=/.test(word)) kind = 'var';
		else if (head) kind = 'cmd';
		else if (/^(<.*>|\[.*\])\.*$/.test(word)) kind = 'arg';
		else if (/^(https?:\/\/|[~.]?\/|~)|[\\/]/.test(word)) kind = 'str';
		if (op) head = true;
		else if (word && kind !== 'var') head = false;
		out.append(kind ? Object.assign(document.createElement('span'), { className: `t-${kind}`, textContent: token }) : token);
	}
	return out;
}

for (const pre of document.querySelectorAll('pre.cmd')) {
	let on = pre.hasAttribute('data-copy');
	for (const node of [...pre.childNodes]) {
		if (node.nodeType === Node.ELEMENT_NODE) {
			if (node.classList.contains('p')) on = true;
			else if (node.classList.contains('c')) on = false;
			continue;
		}
		if (node.nodeType !== Node.TEXT_NODE || !on) continue;
		const text = node.textContent;
		const end = text.indexOf('\n');
		const command = end < 0 ? text : text.slice(0, end);
		if (end >= 0) on = false;
		node.replaceWith(colored(command), end < 0 ? '' : text.slice(end));
	}
}

// What a command block copies: the commands after each `$ ` prompt, without their comments, or
// all of it for a block marked data-copy.
function commands(pre) {
	const copy = pre.cloneNode(true);
	if (pre.hasAttribute('data-copy')) return copy.textContent.trim();
	copy.querySelectorAll('.c').forEach((c) => c.remove());
	copy.querySelectorAll('.p').forEach((p) => (p.textContent = '\0'));
	return copy.textContent
		.split('\n')
		.filter((line) => line.startsWith('\0'))
		.map((line) => line.slice(1).trimEnd())
		.join('\n');
}

const ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="2"/><path d="M10.5 3.5V3a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5"/></svg>';
const DONE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';

if (navigator.clipboard) {
	for (const pre of document.querySelectorAll('pre.cmd')) {
		if (!pre.hasAttribute('data-copy') && !pre.querySelector('.p')) continue;
		const button = Object.assign(document.createElement('button'), { type: 'button', className: 'copy', innerHTML: ICON });
		button.setAttribute('aria-label', 'Copy');
		button.title = 'Copy';
		button.addEventListener('click', async () => {
			try {
				await navigator.clipboard.writeText(commands(pre));
			} catch {
				return;
			}
			button.innerHTML = DONE;
			button.setAttribute('aria-label', 'Copied');
			setTimeout(() => {
				button.innerHTML = ICON;
				button.setAttribute('aria-label', 'Copy');
			}, 1500);
		});
		// The button sits on a box around the block, so it stays put when a long line scrolls.
		const box = Object.assign(document.createElement('div'), { className: 'cmd-box' });
		box.style.margin = getComputedStyle(pre).margin;
		pre.style.margin = '0';
		pre.classList.add('has-copy');
		pre.replaceWith(box);
		box.append(pre, button);
	}
}
