// Fades sections in as they scroll into view, and stops the hero animation for people who
// asked the system to reduce motion (SMIL animations ignore the CSS media query).
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const art = document.querySelector('.hero-art');
if (reduce.matches && art) art.pauseAnimations();

const items = document.querySelectorAll('.reveal');
if (reduce.matches || !('IntersectionObserver' in window)) {
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
