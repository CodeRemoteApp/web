// Android waitlist form: sends to Formspree in the background and says how it went next to the
// button. Without JS the form posts normally and Formspree shows its own thank-you page.
for (const form of document.querySelectorAll('[data-beta]')) {
	const status = form.querySelector('[data-beta-status]');
	const button = form.querySelector('button[type="submit"]');

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		button.disabled = true;
		status.classList.remove('error');
		status.textContent = form.dataset.sending ?? 'Sending…';
		try {
			const res = await fetch(form.action, {
				method: 'POST',
				body: new FormData(form),
				headers: { Accept: 'application/json' },
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.errors?.map((e) => e.message).join(' ') || form.dataset.failed ?? 'Something went wrong.');
			}
			form.reset();
			status.textContent = form.dataset.thanks ?? "Thanks! We'll let you know.";
		} catch (err) {
			status.classList.add('error');
			status.textContent = `${err.message} ${form.dataset.retry ?? 'Please try again, or email trantienthanh2412@gmail.com.'}`;
		} finally {
			button.disabled = false;
		}
	});
}
