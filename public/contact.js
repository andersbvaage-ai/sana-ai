document.getElementById('contact-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const btn      = document.getElementById('contact-submit-btn');
  const errorEl  = document.getElementById('contact-error');
  const successEl = document.getElementById('contact-success');

  errorEl.classList.remove('visible');
  btn.disabled = true;
  btn.textContent = 'Sender...';

  try {
    const r = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        navn:    document.getElementById('c-navn').value.trim(),
        epost:   document.getElementById('c-epost').value.trim(),
        selskap: document.getElementById('c-selskap').value.trim(),
        melding: document.getElementById('c-melding').value.trim(),
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      errorEl.textContent = data.error ?? 'Noe gikk galt. Prøv igjen.';
      errorEl.classList.add('visible');
      return;
    }

    document.getElementById('contact-form').style.display = 'none';
    successEl.classList.add('visible');
  } catch {
    errorEl.textContent = 'Kunne ikke nå serveren. Sjekk internettforbindelsen.';
    errorEl.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Send henvendelse <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5h10M8 3.5l4 4-4 4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
});
