// Redirect til cases hvis allerede innlogget
(function () {
  if (localStorage.getItem('sana_token')) {
    window.location.replace('/cases.html');
  }
})();

const form = document.getElementById('login-form');
const btn  = document.getElementById('login-btn');

function showError(msg) {
  document.getElementById('error-text').textContent = msg;
  document.getElementById('error-msg').classList.add('visible');
}

function hideError() {
  document.getElementById('error-msg').classList.remove('visible');
}

form.addEventListener('submit', async () => {
  hideError();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Logger inn...';

  try {
    const r    = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();

    if (!r.ok) {
      showError(data.error ?? 'Innlogging feilet. Prøv igjen.');
      return;
    }

    localStorage.setItem('sana_token', data.token);
    localStorage.setItem('sana_user', JSON.stringify({ name: data.name, role: data.role }));
    window.location.replace('/cases.html');
  } catch {
    showError('Kunne ikke nå serveren. Sjekk internettforbindelsen.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Logg inn';
  }
});
