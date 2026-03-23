let activeCaseId = null;
let allCases = [];
let activeFilter = 'alle';
let searchQuery = '';

// ── Autentisering ────────────────────────────────────────────────────────────
(function checkAuth() {
  const token = localStorage.getItem('sana_token');
  if (!token) { window.location.replace('/login.html'); return; }
  const user = JSON.parse(localStorage.getItem('sana_user') || '{}');
  if (user.name) document.getElementById('user-name').textContent = user.name;
  if (user.name === 'Demo Bruker') document.getElementById('demo-banner').classList.add('visible');

  // Vis onboarding første gang brukeren logger inn (per bruker)
  const obKey = 'sana_onboarded_' + (token ? token.split('.')[1] : 'x');
  if (!localStorage.getItem(obKey)) {
    document.getElementById('onboarding-backdrop').classList.add('visible');
    const dismiss = () => {
      document.getElementById('onboarding-backdrop').classList.remove('visible');
      localStorage.setItem(obKey, '1');
    };
    document.getElementById('ob-start').addEventListener('click', dismiss);
    document.getElementById('ob-skip').addEventListener('click', dismiss);
    document.getElementById('onboarding-backdrop').addEventListener('click', e => {
      if (e.target === document.getElementById('onboarding-backdrop')) dismiss();
    });
  }
})();

function getAuthHeaders() {
  const token = localStorage.getItem('sana_token');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

function logout() {
  localStorage.removeItem('sana_token');
  localStorage.removeItem('sana_user');
  window.location.replace('/login.html');
}

async function authFetch(url, options = {}) {
  const r = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });
  if (r.status === 401) {
    localStorage.removeItem('sana_token');
    localStorage.removeItem('sana_user');
    window.location.replace('/login.html');
    throw new Error('Sesjonen er utløpt');
  }
  return r;
}

// ── Feilmeldinger ────────────────────────────────────────────────────────────
const ERROR_MESSAGES = {
  NO_FILE:          'Ingen fil ble lastet opp.',
  INSUFFICIENT_TEXT:'Filen inneholder for lite tekst til å analyseres. Prøv en annen fil.',
  ANALYSIS_ERROR:   'AI-analysen feilet. Sjekk at filen inneholder lesbar tekst og prøv igjen.',
  NOT_FOUND:        'Saken ble ikke funnet.',
  INVALID_INPUT:    'Ugyldig verdi. Sjekk at alle felt er fylt ut korrekt.',
  AI_ERROR:         'AI-tjenesten svarte ikke som forventet. Prøv igjen.',
};

function friendlyError(data) {
  if (data && data.code && ERROR_MESSAGES[data.code]) return ERROR_MESSAGES[data.code];
  if (data && data.error) return data.error;
  return 'Noe gikk galt. Prøv igjen.';
}

// ── Server-statussjekk ──────────────────────────────────────────────────────
async function checkServer() {
  try {
    const r = await fetch('/health');
    document.getElementById('status-dot').className = r.ok ? 'online' : 'offline';
    document.getElementById('status-text').textContent = r.ok ? 'Server kjører' : 'Server utilgjengelig';
  } catch {
    document.getElementById('status-dot').className = 'offline';
    document.getElementById('status-text').textContent = 'Server utilgjengelig';
  }
}

// ── Badge-hjelpere ──────────────────────────────────────────────────────────
function critBadge(level) {
  const cls = { Kritisk: 'badge-kritisk', Høy: 'badge-høy', Middels: 'badge-middels', Lav: 'badge-lav' }[level] ?? 'badge-middels';
  const dot = { Kritisk: '●', Høy: '●', Middels: '●', Lav: '●' }[level] ?? '●';
  return `<span class="crit-badge ${cls}">${dot} ${level}</span>`;
}

function standpunktBadge(s) {
  const map = {
    'Støttes':        { cls: 'standpunkt-støttes',  icon: '✓' },
    'Støttes delvis': { cls: 'standpunkt-delvis',   icon: '~' },
    'Avvises':        { cls: 'standpunkt-avvises',  icon: '✕' },
    'Uavklart':       { cls: 'standpunkt-uavklart', icon: '?' },
  };
  const { cls, icon } = map[s] ?? map['Uavklart'];
  return `<span class="standpunkt-badge ${cls}">${icon} ${s}</span>`;
}

function priorityBar(score) {
  const s = Math.min(100, Math.max(0, parseInt(score, 10) || 0));
  const color = s >= 90 ? 'var(--red)' : s >= 70 ? 'var(--amber)' : s >= 40 ? 'var(--blue)' : 'var(--green)';
  return `
    <div style="display:flex;align-items:center;gap:8px">
      <div class="priority-bar-wrap" style="flex:1">
        <div class="priority-bar" style="width:${s}%;background:${color}"></div>
      </div>
      <span style="font-size:13px;font-weight:700;color:${color};min-width:36px">${s}%</span>
    </div>`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fileIcon(type) {
  return type === 'pdf' ? '📄' : '📝';
}

// ── Case-liste ──────────────────────────────────────────────────────────────
async function loadCases() {
  try {
    const r = await authFetch('/api/cases');
    allCases = await r.json();
    renderCaseList(filteredCases());
  } catch {
    // stille feil
  }
}

function filteredCases() {
  return allCases.filter(c => {
    const gjeldende = c.legeVurdering ?? c.analyse;
    const matchFilter =
      activeFilter === 'alle' ? true :
      activeFilter === 'vurdert' ? c.status === 'vurdert' :
      gjeldende.kritikalitet === activeFilter;
    const matchSearch = searchQuery
      ? (c.tittel ?? c.filnavn).toLowerCase().includes(searchQuery)
      : true;
    return matchFilter && matchSearch;
  });
}

function renderCaseList(cases) {
  const empty  = document.getElementById('empty-state');
  const table  = document.getElementById('cases-table');
  const tbody  = document.getElementById('cases-tbody');
  const count  = document.getElementById('case-count');

  count.textContent = `${cases.length} sak${cases.length !== 1 ? 'er' : ''}`;

  if (cases.length === 0) {
    empty.style.display = '';
    table.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  table.style.display = 'block';

  tbody.innerHTML = cases.map(c => {
    const gjeldende  = c.legeVurdering ?? c.analyse;
    const levelClass = gjeldende.kritikalitet ?? 'Middels';
    const isActive   = activeCaseId === c.id ? 'active' : '';
    return `
    <div class="case-row ${isActive}" data-id="${c.id}">
      <div class="case-row-accent accent-${levelClass}"></div>
      <div class="case-row-body">
        <div class="case-row-top">
          <span class="case-filename">
            <span class="file-icon">${fileIcon(c.filtype)}</span>${escHtml(c.tittel ?? c.filnavn)}
          </span>
          ${critBadge(gjeldende.kritikalitet)}
        </div>
        <div class="case-row-bottom">
          <span class="case-time">${gjeldende.estimertTid}</span>
          <span class="case-time">${formatTime(c.lastOppTidspunkt)}</span>
          ${c.dokumenter && c.dokumenter.length > 1
            ? `<span class="doc-count-badge">${c.dokumenter.length} dok.</span>`
            : ''}
          ${c.status === 'vurdert'
            ? '<span class="status-badge status-done">✓ Vurdert</span>'
            : '<span class="status-badge status-pending">⏳ Til vurdering</span>'}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Åpne sak ────────────────────────────────────────────────────────────────
async function openCase(id) {
  activeCaseId = id;
  await loadCases();

  const r = await authFetch(`/api/cases/${id}`);
  const c = await r.json();

  const titleEl = document.getElementById('detail-title');
  titleEl.textContent = '';
  const titleSpan = document.createElement('span');
  titleSpan.id = 'title-text';
  titleSpan.textContent = c.tittel ?? c.filnavn;
  const editBtn = document.createElement('button');
  editBtn.id = 'title-edit-btn';
  editBtn.title = 'Rediger tittel';
  editBtn.style.cssText = 'background:none;border:none;cursor:pointer;padding:0 0 0 6px;opacity:0.5;color:white;font-size:13px;line-height:1;';
  editBtn.textContent = '✎';
  editBtn.addEventListener('click', () => startTitleEdit(c.id, c.tittel ?? c.filnavn));
  titleEl.appendChild(titleSpan);
  titleEl.appendChild(editBtn);
  document.getElementById('export-pdf-btn').style.display = 'block';
  document.getElementById('delete-case-btn').style.display = 'block';
  document.getElementById('detail-summary').textContent = c.analyse.sammendrag;
  document.getElementById('detail-reasoning').textContent = c.analyse.begrunnelse;

  document.getElementById('detail-points').innerHTML =
    (c.analyse.hovedpunkter || []).map(p => `<li>${escHtml(p)}</li>`).join('');

  const tokenInfo = (c.tokensInput || c.tokensOutput)
    ? `<div class="meta-item"><span class="meta-label">Tokens</span><span class="meta-value">${c.tokensInput} inn / ${c.tokensOutput} ut</span></div>
       <div class="meta-item"><span class="meta-label">Modell</span><span class="meta-value">${c.modellId ?? '–'}</span></div>`
    : '';

  const scrubbingInfo = c.scrubbedFields && c.scrubbedFields.length > 0
    ? `<div class="meta-item"><span class="meta-label">PII fjernet</span><span class="meta-value" style="color:var(--amber)">${c.scrubbedFields.join(', ')}</span></div>`
    : `<div class="meta-item"><span class="meta-label">PII fjernet</span><span class="meta-value" style="color:var(--green)">Ingen</span></div>`;

  document.getElementById('detail-meta').innerHTML = `
    <div class="meta-item"><span class="meta-label">Standpunkt</span><span class="meta-value">${standpunktBadge(c.analyse.standpunkt ?? 'Uavklart')}</span></div>
    <div class="meta-item" style="flex:1;min-width:200px"><span class="meta-label">Legeprioritering</span>${priorityBar(c.analyse.prioritetScore ?? 50)}</div>
    <div class="meta-item"><span class="meta-label">Kritikalitet</span><span class="meta-value">${critBadge(c.analyse.kritikalitet)}</span></div>
    <div class="meta-item"><span class="meta-label">Estimert tid</span><span class="meta-value">${c.analyse.estimertTid}</span></div>
    <div class="meta-item"><span class="meta-label">Lastet opp</span><span class="meta-value">${formatTime(c.lastOppTidspunkt)}</span></div>
    ${tokenInfo}
    ${scrubbingInfo}
  `;

  const docs = c.dokumenter ?? [];
  document.getElementById('detail-docs').innerHTML =
    docs.map(d => `<li class="doc-item">${fileIcon(d.filtype)} ${escHtml(d.filnavn)} <span style="margin-left:auto;font-size:11px;color:var(--gray-400)">${formatTime(d.lastOppTidspunkt)}</span></li>`).join('');

  document.getElementById('detail-standpunkt').textContent = c.analyse.standpunktBegrunnelse ?? '';

  const done = document.getElementById('assess-done');
  if (c.status === 'vurdert' && c.legeVurdering) {
    done.classList.add('visible');
    done.textContent = `✓ Sist lagret ${formatTime(c.legeVurdering.vurdertTidspunkt)}`;
  } else {
    done.classList.remove('visible');
  }

  const current     = c.legeVurdering ?? c.analyse;
  const kritSelect  = document.getElementById('assess-kritikalitet');
  const tidSelect   = document.getElementById('assess-tid');

  kritSelect.value = current.kritikalitet;
  const tidOptions = Array.from(tidSelect.options).map(o => o.value);
  tidSelect.value = tidOptions.includes(current.estimertTid)
    ? current.estimertTid
    : tidOptions[tidOptions.length - 1];

  document.getElementById('assess-notater').value = c.legeVurdering?.notater ?? '';

  // Nullstill Q&A ved ny sak
  document.getElementById('qa-thread').innerHTML = '';
  document.getElementById('qa-input').value = '';
  renderSuggestions();

  // Vis detail-panel, skjul placeholder
  document.getElementById('detail-placeholder').style.display = 'none';
  const panel = document.getElementById('detail-panel');
  panel.classList.add('visible');
}

function closeDetail() {
  activeCaseId = null;
  document.getElementById('detail-panel').classList.remove('visible');
  document.getElementById('detail-placeholder').style.display = '';
  document.getElementById('export-pdf-btn').style.display = 'none';
  loadCases();
}

// ── Lagre vurdering ─────────────────────────────────────────────────────────
async function submitAssessment() {
  if (!activeCaseId) return;
  const btn = document.getElementById('assess-btn');
  btn.disabled = true;
  btn.textContent = 'Lagrer...';

  try {
    const r = await authFetch(`/api/cases/${activeCaseId}/assessment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kritikalitet: document.getElementById('assess-kritikalitet').value,
        estimertTid:  document.getElementById('assess-tid').value,
        notater:      document.getElementById('assess-notater').value,
      }),
    });
    if (!r.ok) throw new Error('Feil ved lagring');
    await openCase(activeCaseId);
    await loadCases();
  } catch (err) {
    alert('Kunne ikke lagre vurdering: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Lagre vurdering`;
  }
}

// ── Filopplasting ────────────────────────────────────────────────────────────
async function uploadFile(file) {
  const status = document.getElementById('upload-status');
  status.innerHTML = '<span class="spinner"></span> Analyserer sak...';
  status.className = 'upload-status loading';

  try {
    const formData = new FormData();
    formData.append('file', file);

    const r    = await authFetch('/api/cases', { method: 'POST', body: formData });
    const data = await r.json();

    if (!r.ok) throw new Error(friendlyError(data));

    status.textContent = `✓ "${file.name}" analysert og lagt til`;
    status.className = 'upload-status success';
    document.getElementById('file-input').value = '';

    await loadCases();
    await openCase(data.id);
  } catch (err) {
    status.textContent = err.message;
    status.className = 'upload-status error';
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Legg til dokument ────────────────────────────────────────────────────────
async function addDocument(file) {
  if (!activeCaseId) return;
  const status = document.getElementById('upload-status');
  status.innerHTML = '<span class="spinner"></span> Analyserer nytt dokument...';
  status.className = 'upload-status loading';

  try {
    const formData = new FormData();
    formData.append('file', file);

    const r    = await authFetch(`/api/cases/${activeCaseId}/documents`, { method: 'POST', body: formData });
    const data = await r.json();
    if (!r.ok) throw new Error(friendlyError(data));

    status.textContent = `✓ "${file.name}" lagt til og sak re-analysert`;
    status.className = 'upload-status success';

    await loadCases();
    await openCase(activeCaseId);
  } catch (err) {
    status.textContent = err.message;
    status.className = 'upload-status error';
  }
}

// ── Q&A ─────────────────────────────────────────────────────────────────────
const SUGGESTED_QUESTIONS = [
  'Hva er de sterkeste argumentene for å støtte klagen?',
  'Mangler det medisinsk dokumentasjon?',
  'Hva er risikoen ved å avvise klagen?',
  'Er diagnosen innenfor forsikringsvilkårene?',
  'Bør vi innhente spesialistvurdering?',
  'Hva bør jeg se etter i journalen?',
  'Er det presedens for lignende saker?',
  'Hvor haster det å behandle denne saken?',
];

function renderSuggestions() {
  const el = document.getElementById('qa-suggestions');
  if (!el) return;
  el.innerHTML = '';
  SUGGESTED_QUESTIONS.forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'qa-suggestion';
    btn.textContent = q;
    btn.addEventListener('click', () => setAndAskQuestion(q));
    el.appendChild(btn);
  });
}

function setAndAskQuestion(q) {
  document.getElementById('qa-input').value = q;
  askQuestion();
}

async function askQuestion() {
  if (!activeCaseId) return;
  const input    = document.getElementById('qa-input');
  const question = input.value.trim();
  if (!question) return;

  const thread = document.getElementById('qa-thread');
  const btn    = document.getElementById('qa-btn');

  // User bubble
  const qBubble = document.createElement('div');
  qBubble.className = 'qa-bubble-q';
  qBubble.textContent = question;
  thread.appendChild(qBubble);

  // Typing indicator
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'qa-thinking';
  loadingBubble.innerHTML = '<div class="qa-dot"></div><div class="qa-dot"></div><div class="qa-dot"></div>';
  thread.appendChild(loadingBubble);
  thread.scrollTop = thread.scrollHeight;

  input.value    = '';
  input.disabled = true;
  btn.disabled   = true;

  try {
    const r    = await authFetch(`/api/cases/${activeCaseId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const data = await r.json();
    thread.removeChild(loadingBubble);

    const aBubble = document.createElement('div');
    if (r.ok) {
      aBubble.className = 'qa-bubble-a';
      aBubble.innerHTML = `
        <div class="qa-bubble-a-header">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          Sana AI
        </div>${escHtml(data.answer)}`;
    } else {
      aBubble.className = 'qa-bubble-err';
      aBubble.textContent = data.error ?? 'Noe gikk galt';
    }
    thread.appendChild(aBubble);
  } catch {
    thread.removeChild(loadingBubble);
    const errBubble = document.createElement('div');
    errBubble.className = 'qa-bubble-err';
    errBubble.textContent = 'Kunne ikke nå serveren';
    thread.appendChild(errBubble);
  } finally {
    input.disabled = false;
    btn.disabled   = false;
    thread.scrollTop = thread.scrollHeight;
    input.focus();
  }
}

// ── Slett sak ────────────────────────────────────────────────────────────────
async function deleteCase() {
  if (!activeCaseId) return;
  if (!confirm('Er du sikker på at du vil slette denne saken? Dette kan ikke angres.')) return;
  try {
    const r = await authFetch(`/api/cases/${activeCaseId}`, { method: 'DELETE' });
    if (!r.ok) throw new Error('Sletting feilet');
    activeCaseId = null;
    document.getElementById('detail-panel').classList.remove('visible');
    document.getElementById('delete-case-btn').style.display = 'none';
    await loadCases();
  } catch (err) {
    alert(`Kunne ikke slette saken: ${err.message}`);
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.getElementById('cases-tbody').addEventListener('click', e => {
  const row = e.target.closest('[data-id]');
  if (row) openCase(row.dataset.id);
});

document.getElementById('case-search').addEventListener('input', function () {
  searchQuery = this.value.trim().toLowerCase();
  renderCaseList(filteredCases());
});

document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', function () {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
    activeFilter = this.dataset.filter;
    renderCaseList(filteredCases());
  });
});

document.getElementById('close-detail-btn').addEventListener('click', closeDetail);
document.getElementById('export-pdf-btn').addEventListener('click', () => {
  if (!activeCaseId) return;
  const a = document.createElement('a');
  a.href = `/api/cases/${activeCaseId}/export`;
  a.setAttribute('download', '');
  // Legg ved auth-token via fetch og blob-URL
  const btn = document.getElementById('export-pdf-btn');
  btn.textContent = '↓ Laster...';
  btn.disabled = true;
  authFetch(`/api/cases/${activeCaseId}/export`)
    .then(r => r.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    })
    .catch(() => alert('Kunne ikke generere PDF'))
    .finally(() => { btn.textContent = '↓ PDF'; btn.disabled = false; });
});
document.getElementById('delete-case-btn').addEventListener('click', deleteCase);
document.getElementById('add-doc-btn').addEventListener('click', () => document.getElementById('add-doc-input').click());
document.getElementById('qa-btn').addEventListener('click', askQuestion);
document.getElementById('qa-input').addEventListener('keydown', e => { if (e.key === 'Enter') askQuestion(); });
document.getElementById('assess-btn').addEventListener('click', submitAssessment);
document.getElementById('assess-form').addEventListener('submit', e => e.preventDefault());

document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('logout-btn').addEventListener('mouseover', function () { this.style.background = 'rgba(255,255,255,0.15)'; });
document.getElementById('logout-btn').addEventListener('mouseout',  function () { this.style.background = 'rgba(255,255,255,0.08)'; });

checkServer();
setInterval(checkServer, 10000);
loadCases();

document.getElementById('file-input').addEventListener('change', function () {
  if (this.files[0]) uploadFile(this.files[0]);
});

document.getElementById('add-doc-input').addEventListener('change', function () {
  if (this.files[0]) { addDocument(this.files[0]); this.value = ''; }
});

document.getElementById('browse-btn').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

const uploadArea = document.getElementById('upload-area');
uploadArea.addEventListener('click', e => {
  if (e.target.id !== 'browse-btn') document.getElementById('file-input').click();
});
uploadArea.addEventListener('dragover',  e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
uploadArea.addEventListener('dragleave', ()  => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

// ── Sak-tittel redigering ────────────────────────────────────────────────────
function startTitleEdit(caseId, currentTitle) {
  const titleEl = document.getElementById('detail-title');
  titleEl.innerHTML = `
    <input id="title-input" type="text" value="${escHtml(currentTitle)}"
      style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.35);border-radius:5px;
             color:white;font-size:15px;font-weight:700;padding:2px 8px;width:100%;max-width:360px;outline:none;"
      maxlength="200" />
    <button id="title-save-btn" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);
      color:white;border-radius:5px;padding:2px 10px;font-size:12px;font-weight:600;cursor:pointer;margin-left:6px;">Lagre</button>
    <button id="title-cancel-btn" style="background:none;border:none;color:rgba(255,255,255,0.5);
      font-size:12px;cursor:pointer;margin-left:4px;">Avbryt</button>
  `;
  const input = document.getElementById('title-input');
  input.focus();
  input.select();

  document.getElementById('title-save-btn').addEventListener('click', () => saveTitle(caseId, input.value.trim()));
  document.getElementById('title-cancel-btn').addEventListener('click', () => openCase(caseId));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveTitle(caseId, input.value.trim());
    if (e.key === 'Escape') openCase(caseId);
  });
}

async function saveTitle(caseId, tittel) {
  try {
    await authFetch(`/api/cases/${caseId}/title`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tittel: tittel || null }),
    });
    await openCase(caseId);
  } catch {
    // stille feil – vil gjelde om auth utløper
  }
}
