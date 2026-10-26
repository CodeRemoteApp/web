// Appearance picker in the header: System follows the device, Light and Dark stick (in this
// browser). A one-line script in each page's <head> applies the choice before the first paint.
(() => {
	const root = document.documentElement;
	const button = document.querySelector('button.theme');
	const menu = document.getElementById('theme-menu');
	if (!button || !menu) return;
	// Browsers without popovers keep following the system.
	if (!('popover' in HTMLElement.prototype)) {
		button.hidden = true;
		return;
	}

	const stored = () => {
		try {
			return localStorage.getItem('theme');
		} catch {
			return null;
		}
	};

	const mark = () => {
		const current = ['light', 'dark'].includes(stored()) ? stored() : 'system';
		for (const item of menu.querySelectorAll('[data-theme-choice]')) {
			item.setAttribute('aria-checked', String(item.dataset.themeChoice === current));
		}
	};

	menu.addEventListener('click', (e) => {
		const item = e.target.closest('[data-theme-choice]');
		if (!item) return;
		const choice = item.dataset.themeChoice;
		try {
			if (choice === 'system') localStorage.removeItem('theme');
			else localStorage.setItem('theme', choice);
		} catch {}
		if (choice === 'system') delete root.dataset.theme;
		else root.dataset.theme = choice;
		mark();
		menu.hidePopover();
		button.focus();
	});

	// Below the button, right edges aligned. The menu sits in the top layer, placed against the
	// page rather than the window, so it scrolls away with the header like the rest of it.
	menu.addEventListener('beforetoggle', (e) => {
		if (e.newState !== 'open') return;
		const r = button.getBoundingClientRect();
		menu.style.top = `${r.bottom + window.scrollY + 8}px`;
		menu.style.right = `${root.clientWidth - r.right}px`;
	});

	mark();
})();
