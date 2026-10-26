// Fades sections in as they scroll into view, and keeps the illustrations cheap: they pause
// while off screen, and stop at their final frame for people who asked the system to reduce
// motion (SMIL animations ignore the CSS media query).
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const arts = document.querySelectorAll('svg.art');
const hasIO = 'IntersectionObserver' in window;

if (reduce) {
	arts.forEach((svg) => {
		svg.setCurrentTime(10);
		svg.pauseAnimations();
	});
} else if (hasIO) {
	const io = new IntersectionObserver((entries) => {
		for (const e of entries) {
			e.target.classList.toggle('paused', !e.isIntersecting);
			if (e.isIntersecting) e.target.unpauseAnimations();
			else e.target.pauseAnimations();
		}
	});
	arts.forEach((svg) => io.observe(svg));
}

const items = document.querySelectorAll('.reveal');
if (reduce || !hasIO) {
	items.forEach((el) => el.classList.add('in'));
} else {
	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (!e.isIntersecting) continue;
				e.target.classList.add('in');
				io.unobserve(e.target);
			}
		},
		{ rootMargin: '0px 0px -10% 0px' },
	);
	items.forEach((el) => {
		// Stagger siblings in the same grid so cards arrive one after another.
		const siblings = el.parentElement.querySelectorAll(':scope > .reveal');
		el.style.transitionDelay = `${[...siblings].indexOf(el) * 90}ms`;
		io.observe(el);
	});
}

// The hero terminal is a scroll story: it sticks to the top of the screen while its output plays
// in step with the scroll position, from typing `npm install` to the QR code, and runs backwards
// when you scroll back up. Each line takes a slice of the scroll; spinners count their seconds
// across theirs. All of it is in the HTML already, so without JS (or with reduced motion) it shows.
const demo = document.getElementById('demo');
const story = demo?.parentElement;
if (demo && !reduce) {
	const FRAMES = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
	// Pixels of scroll per unit of weight below.
	const PX = 150;
	const cursor = Object.assign(document.createElement('span'), { className: 'blink', textContent: '▍' });

	let at = 0;
	const steps = [...demo.querySelectorAll('.ln')].map((el, i) => {
		const t = el.querySelector('.t');
		const mark = el.querySelector('.mark');
		const secs = el.querySelector('.secs');
		const step = { el, t, text: t?.textContent, mark, secs, total: secs && parseFloat(secs.textContent) };
		const w =
			i === 0 ? 0
			: t ? step.text.length * 0.04
			: mark ? 0.25 + Number(el.dataset.spin) / 2000
			: el.closest('.qr') ? 0.06
			: el.textContent.trim() ? 0.25
			: 0.1;
		Object.assign(step, { start: at, end: (at += w) });
		return step;
	});

	const render = () => {
		const y = (16 - story.getBoundingClientRect().top) / PX;
		const p = Math.min(at, Math.max(0, y));
		for (const s of steps) {
			const k = s.end > s.start ? Math.min(1, Math.max(0, (p - s.start) / (s.end - s.start))) : 1;
			if (s.t) {
				s.el.classList.toggle('on', p >= s.start);
				s.t.textContent = s.text.slice(0, Math.round(k * s.text.length));
				if (p >= s.start && k < 1) s.t.after(cursor);
			} else if (s.mark) {
				s.el.classList.toggle('on', k > 0);
				const done = k >= 1;
				s.mark.className = done ? 'mark ok' : 'mark spin';
				s.mark.textContent = done ? '✔' : FRAMES[Math.floor(k * (s.end - s.start) * 40) % FRAMES.length];
				s.secs.textContent = `${(s.total * k).toFixed(1)}s`;
			} else {
				s.el.classList.toggle('on', p >= s.end);
			}
		}
		if (!steps.some((s) => s.t && p >= s.start && p < s.end)) cursor.remove();
	};

	// The story is as tall as the finished terminal plus the scroll it takes to play.
	const size = () => {
		demo.classList.remove('armed');
		story.style.height = `${demo.offsetHeight + at * PX}px`;
		demo.classList.add('armed');
		render();
	};

	let queued = false;
	addEventListener('scroll', () => {
		if (queued) return;
		queued = true;
		requestAnimationFrame(() => {
			queued = false;
			render();
		});
	}, { passive: true });
	addEventListener('resize', size);
	story.classList.add('armed');
	size();
}
