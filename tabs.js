// Install tabs (one per install method) and copy buttons on commands. Without JS every panel
// shows, one after another under its own label, and the commands are still there to select.
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
