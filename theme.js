// Header behaviour shared by the menus below and lang.js. Popover menus sit in the top layer, placed
// against the page so they scroll away with the header; once the header is pinned (see the end of this
// file) they are placed against the window instead.
window.placePopover = (menu, button) => {
	const r = button.getBoundingClientRect();
	const pinned = document.documentElement.classList.contains('header-pinned');
	menu.style.position = pinned ? 'fixed' : '';
	menu.style.top = `${r.bottom + (pinned ? 0 : window.scrollY) + 8}px`;
	menu.style.right = `${document.documentElement.clientWidth - r.right}px`;
};

// Appearance picker in the header: System follows the device, Light and Dark stick (in this
// browser). A one-line script in each page's <head> applies the choice before the first paint.
// The header's Menu button (narrow screens) opens the page links in the same kind of popover.
(() => {
	const button = document.querySelector('button.menu');
	const menu = document.getElementById('nav-menu');
	if (!button || !menu || !('popover' in HTMLElement.prototype)) return;
	menu.addEventListener('click', (e) => {
		if (e.target.closest('a')) menu.hidePopover();
	});
	menu.addEventListener('beforetoggle', (e) => {
		if (e.newState !== 'open') return;
		placePopover(menu, button);
	});
})();

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
		placePopover(menu, button);
	});

	mark();
})();

// Pins the header to the top of the window once you have scrolled past its own height, sliding it in,
// so the menu is always within reach. Open menus close when it switches, since they were placed for
// the other state.
(() => {
	const header = document.querySelector('header.site');
	if (!header) return;
	const root = document.documentElement;
	let height = header.offsetHeight;
	let pinned = false;
	const set = (value) => {
		if (value === pinned) return;
		pinned = value;
		for (const m of document.querySelectorAll('.theme-menu')) {
			try {
				if (m.matches(':popover-open')) m.hidePopover();
			} catch {}
		}
		if (value) {
			height = header.offsetHeight;
			root.style.setProperty('--header-h', `${height}px`);
		}
		root.classList.toggle('header-pinned', value);
	};
	const update = () => {
		const y = window.scrollY;
		if (y > height) set(true);
		else if (y <= 0) set(false);
	};
	addEventListener('scroll', update, { passive: true });
	addEventListener('resize', () => {
		if (!pinned) height = header.offsetHeight;
	});
	update();
})();
