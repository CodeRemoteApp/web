// Beta invite form: sends to Formspree in the background and says how it went next to the
// button. Without JS the form posts normally and Formspree shows its own thank-you page.
for (const form of document.querySelectorAll('[data-beta]')) {
	const status = form.querySelector('[data-beta-status]');
	const button = form.querySelector('button[type="submit"]');

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		button.disabled = true;
		status.classList.remove('error');
		status.textContent = 'Sending…';
		try {
			const res = await fetch(form.action, {
				method: 'POST',
				body: new FormData(form),
				headers: { Accept: 'application/json' },
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.errors?.map((e) => e.message).join(' ') || 'Something went wrong.');
			}
			form.reset();
			status.textContent = "Thanks! We'll send your TestFlight invite soon.";
		} catch (err) {
			status.classList.add('error');
			status.textContent = `${err.message} Please try again, or email trantienthanh2412@gmail.com.`;
		} finally {
			button.disabled = false;
		}
	});
}
