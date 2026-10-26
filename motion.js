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
