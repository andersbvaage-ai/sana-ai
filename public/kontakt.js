const params = new URLSearchParams(window.location.search);
if (params.get('emne') === 'pilot') {
  const meldingEl = document.getElementById('melding');
  if (meldingEl && !meldingEl.value) {
    meldingEl.value = 'Vi er interessert i å starte en pilot av Sana AI. Kan dere ta kontakt for å avtale en gjennomgang?';
  }
  const titelEl = document.querySelector('.form-card-title');
  if (titelEl) titelEl.textContent = 'Start pilot';
}

const submitBtn = document.getElementById('submitBtn');
const formError = document.getElementById('formError');
const formContent = document.getElementById('formContent');
const formSuccess = document.getElementById('formSuccess');

submitBtn.addEventListener('click', async () => {
  const navn = document.getElementById('navn').value.trim();
  const epost = document.getElementById('epost').value.trim();
  const selskap = document.getElementById('selskap').value.trim();
  const melding = document.getElementById('melding').value.trim();

  if (!navn || !epost || !melding) {
    formError.textContent = 'Navn, e-post og melding er påkrevd.';
    formError.classList.add('visible');
    return;
  }

  submitBtn.textContent = 'Sender...';
  submitBtn.disabled = true;
  formError.classList.remove('visible');

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ navn, epost, selskap, melding })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Noe gikk galt');
    }
    formContent.style.display = 'none';
    formSuccess.classList.add('visible');
  } catch (err) {
    formError.textContent = err.message;
    formError.classList.add('visible');
  } finally {
    submitBtn.textContent = 'Send henvendelse';
    submitBtn.disabled = false;
  }
});
