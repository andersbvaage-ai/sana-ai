// ── Sana AI – Content Admin ────────────────────────────────────────────────
const TOKEN_KEY = 'sana_admin_token';

// ── Auth helpers ─────────────────────────────────────────────────────────────
function getToken() { return sessionStorage.getItem(TOKEN_KEY); }
function setToken(t) { sessionStorage.setItem(TOKEN_KEY, t); }
function clearToken() { sessionStorage.removeItem(TOKEN_KEY); }

// ── Bootstrap ────────────────────────────────────────────────────────────────
const loginWrap = document.getElementById('login-wrap');
const adminWrap = document.getElementById('admin-wrap');

if (getToken()) {
  showAdmin();
} else {
  loginWrap.style.display = 'flex';
}

// ── Login ─────────────────────────────────────────────────────────────────────
document.getElementById('login-btn').addEventListener('click', doLogin);
document.getElementById('l-pass').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});

async function doLogin() {
  const username = document.getElementById('l-user').value.trim();
  const password = document.getElementById('l-pass').value;
  const errEl = document.getElementById('login-err');
  errEl.classList.remove('visible');

  if (!username || !password) {
    errEl.textContent = 'Fyll inn brukernavn og passord.';
    errEl.classList.add('visible');
    return;
  }

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = 'Logger inn...';

  try {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Innlogging feilet');
    setToken(data.token);
    showAdmin();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('visible');
    btn.disabled = false;
    btn.textContent = 'Logg inn';
  }
}

document.getElementById('logout-link').addEventListener('click', (e) => {
  e.preventDefault();
  clearToken();
  location.reload();
});

// ── Admin UI ─────────────────────────────────────────────────────────────────
async function showAdmin() {
  loginWrap.style.display = 'none';
  adminWrap.style.display = 'grid';

  try {
    const r = await fetch('/api/content/landing');
    if (!r.ok) throw new Error('Feil ved henting av innhold');
    const { content, headingFonts, bodyFonts } = await r.json();

    populateFontSelect('headingFont', headingFonts, content.headingFont);
    populateFontSelect('bodyFont', bodyFonts, content.bodyFont);
    updateFontPreviews(content.headingFont, content.bodyFont);

    // Hero
    document.getElementById('hero-kicker').value   = content.hero?.kicker   ?? '';
    document.getElementById('hero-h1Line1').value  = content.hero?.h1Line1  ?? '';
    document.getElementById('hero-h1Line2').value  = content.hero?.h1Line2  ?? '';
    document.getElementById('hero-h1Line3').value  = content.hero?.h1Line3  ?? '';
    document.getElementById('hero-sub').value      = content.hero?.sub      ?? '';

    // Problem
    document.getElementById('problem-heading').value   = content.problem?.heading   ?? '';
    document.getElementById('problem-headingEm').value = content.problem?.headingEm ?? '';
    document.getElementById('problem-body').value      = content.problem?.body      ?? '';

    // Contact
    document.getElementById('contact-heading').value   = content.contact?.heading   ?? '';
    document.getElementById('contact-headingEm').value = content.contact?.headingEm ?? '';

    // CTA
    document.getElementById('cta-heading').value   = content.cta?.heading   ?? '';
    document.getElementById('cta-headingEm').value = content.cta?.headingEm ?? '';
    document.getElementById('cta-sub').value       = content.cta?.sub       ?? '';

  } catch (err) {
    showSaveMsg('Feil: ' + err.message, 'err');
  }
}

function populateFontSelect(id, fonts, current) {
  const sel = document.getElementById(id);
  sel.innerHTML = '';
  fonts.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    if (f === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ── Font preview ──────────────────────────────────────────────────────────────
const HEADING_PARAMS = {
  'Playfair Display':   'Playfair+Display:ital,wght@0,700;0,800;1,700',
  'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,600;0,700;1,600',
  'Lora':               'Lora:ital,wght@0,600;0,700;1,600',
  'Libre Baskerville':  'Libre+Baskerville:ital,wght@0,700;1,700',
};
const BODY_PARAMS = {
  'Inter':         'Inter:wght@400;500;600;700',
  'DM Sans':       'DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700',
  'IBM Plex Sans': 'IBM+Plex+Sans:wght@400;500;600;700',
  'Nunito Sans':   'Nunito+Sans:wght@400;500;600;700',
};

const loadedFonts = new Set();
function ensureFont(param) {
  if (!param || loadedFonts.has(param)) return;
  loadedFonts.add(param);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${param}&display=swap`;
  document.head.appendChild(link);
}

function updateFontPreviews(hFont, bFont) {
  if (hFont && HEADING_PARAMS[hFont]) {
    ensureFont(HEADING_PARAMS[hFont]);
    document.getElementById('heading-preview').style.fontFamily = `'${hFont}', serif`;
  }
  if (bFont && BODY_PARAMS[bFont]) {
    ensureFont(BODY_PARAMS[bFont]);
    document.getElementById('body-preview').style.fontFamily = `'${bFont}', sans-serif`;
  }
}

document.getElementById('headingFont').addEventListener('change', (e) => {
  updateFontPreviews(e.target.value, null);
});
document.getElementById('bodyFont').addEventListener('change', (e) => {
  updateFontPreviews(null, e.target.value);
});

// ── Save ─────────────────────────────────────────────────────────────────────
document.getElementById('save-btn').addEventListener('click', doSave);

async function doSave() {
  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = 'Lagrer...';
  clearSaveMsg();

  const patch = {
    headingFont: document.getElementById('headingFont').value,
    bodyFont:    document.getElementById('bodyFont').value,
    hero: {
      kicker:  document.getElementById('hero-kicker').value,
      h1Line1: document.getElementById('hero-h1Line1').value,
      h1Line2: document.getElementById('hero-h1Line2').value,
      h1Line3: document.getElementById('hero-h1Line3').value,
      sub:     document.getElementById('hero-sub').value,
    },
    problem: {
      heading:   document.getElementById('problem-heading').value,
      headingEm: document.getElementById('problem-headingEm').value,
      body:      document.getElementById('problem-body').value,
    },
    contact: {
      heading:   document.getElementById('contact-heading').value,
      headingEm: document.getElementById('contact-headingEm').value,
    },
    cta: {
      heading:   document.getElementById('cta-heading').value,
      headingEm: document.getElementById('cta-headingEm').value,
      sub:       document.getElementById('cta-sub').value,
    },
  };

  try {
    const r = await fetch('/api/content/landing', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify(patch),
    });
    const data = await r.json();
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) { clearToken(); location.reload(); return; }
      throw new Error(data.error || 'Lagring feilet');
    }
    showSaveMsg('✓ Lagret', 'ok');
  } catch (err) {
    showSaveMsg('Feil: ' + err.message, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Lagre endringer';
  }
}

function showSaveMsg(msg, type) {
  const el = document.getElementById('save-msg');
  el.textContent = msg;
  el.className = 'save-msg ' + type;
  if (type === 'ok') setTimeout(clearSaveMsg, 3000);
}
function clearSaveMsg() {
  const el = document.getElementById('save-msg');
  el.textContent = '';
  el.className = 'save-msg';
}

// ── Sidebar nav highlight ─────────────────────────────────────────────────────
document.querySelectorAll('.sidebar a[href^="#"]').forEach((a) => {
  a.addEventListener('click', () => {
    document.querySelectorAll('.sidebar a').forEach((x) => x.classList.remove('active'));
    a.classList.add('active');
  });
});
