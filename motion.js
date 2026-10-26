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

// The hero terminal plays `coderemote up` the way the CLI prints it, as a scroll story: typed
// commands, spinners that tick into checkmarks, then the output and QR code line by line. The
// window grows with its output and stops at each data-wait line until you scroll to its bottom.
// All of it is in the HTML already, so without JS (or with reduced motion) it simply shows.
const demo = document.getElementById('demo');
if (demo && !reduce && hasIO) {
	const FRAMES = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const blink = () => Object.assign(document.createElement('span'), { className: 'blink', textContent: '▍' });
	const cursor = blink();
	// An empty line with the cursor, shown while the command is waiting for the reader.
	const idle = Object.assign(document.createElement('div'), { className: 'ln on' });
	idle.append(blink());

	const grow = () => {
		demo.style.height = `${demo.scrollHeight}px`;
	};
	const show = (el) => {
		el.classList.add('on');
		grow();
	};
	// Resolves once the bottom of the window is on screen.
	const reached = () =>
		new Promise((resolve) => {
			const check = () => {
				if (demo.getBoundingClientRect().bottom > innerHeight * 0.92) return;
				removeEventListener('scroll', check);
				resolve();
			};
			addEventListener('scroll', check, { passive: true });
			check();
		});

	demo.classList.add('armed');
	demo.style.height = '0px';
	grow();

	const play = async () => {
		for (const el of demo.querySelectorAll('.ln')) {
			if ('type' in el.dataset) {
				const t = el.querySelector('.t');
				const text = t.textContent;
				t.textContent = '';
				t.after(cursor);
				show(el);
				await ('wait' in el.dataset ? reached() : wait(500));
				for (const ch of text) {
					t.textContent += ch;
					await wait(30 + Math.random() * 60);
				}
				await wait(450);
				cursor.remove();
			} else if (el.dataset.spin) {
				const ms = Number(el.dataset.spin);
				const mark = el.querySelector('.mark');
				const secs = el.querySelector('.secs');
				const total = parseFloat(secs.textContent);
				mark.className = 'mark spin';
				show(el);
				const start = performance.now();
				for (let f = 0, p = 0; p < 1; f++) {
					mark.textContent = FRAMES[f % FRAMES.length];
					secs.textContent = `${(total * p).toFixed(1)}s`;
					await wait(80);
					p = Math.min(1, (performance.now() - start) / ms);
				}
				mark.className = 'mark ok';
				mark.textContent = '✔';
				secs.textContent = `${total.toFixed(1)}s`;
			} else {
				if ('wait' in el.dataset) {
					demo.append(idle);
					grow();
					await reached();
					await wait(300);
					idle.remove();
				}
				await wait(Number(el.dataset.delay ?? (el.closest('.qr') ? 30 : 80)));
				show(el);
			}
		}
		// Finished: let the height follow the content again (window resizes rewrap the lines).
		await wait(500);
		demo.style.height = '';
	};

	const io = new IntersectionObserver(
		(entries) => {
			if (!entries[0].isIntersecting) return;
			io.disconnect();
			play();
		},
		{ threshold: 0.3 },
	);
	io.observe(demo);
}
