'use strict';

// ── State ────────────────────────────────────────────────────────────────────
let isSending = false;
let isAnalysing = false;

function authHeaders() {
  const token = localStorage.getItem('sana_token');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

// ── DOM refs ─────────────────────────────────────────────────────────────────
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const conversationHistory = document.getElementById('conversation-history');
const chatPlaceholder = document.getElementById('chat-placeholder');
const resetBtn = document.getElementById('reset-btn');
const loadFactsBtn = document.getElementById('load-facts-btn');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const logoutBtn = document.getElementById('logout-btn');
const userNameEl = document.getElementById('user-name');

// File inputs and wrappers
const fileInputs = {
  journal:      { input: document.getElementById('file-journal'),       wrapper: document.getElementById('wrapper-journal'),       label: document.getElementById('label-journal') },
  nav:          { input: document.getElementById('file-nav'),           wrapper: document.getElementById('wrapper-nav'),           label: document.getElementById('label-nav') },
  'legeerklæring':{ input: document.getElementById('file-legeerklaring'), wrapper: document.getElementById('wrapper-legeerklaring'), label: document.getElementById('label-legeerklaring') },
  mandat:       { input: document.getElementById('file-mandat'),        wrapper: document.getElementById('wrapper-mandat'),        label: document.getElementById('label-mandat') },
  samlet:       { input: document.getElementById('file-samlet'),        wrapper: document.getElementById('wrapper-samlet'),        label: document.getElementById('label-samlet') },
  zip:          { input: document.getElementById('file-zip'),           wrapper: document.getElementById('wrapper-zip'),           label: document.getElementById('label-zip') },
};

// ── File input change handlers ────────────────────────────────────────────────
Object.entries(fileInputs).forEach(([key, { input, wrapper, label }]) => {
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) {
      label.textContent = file.name;
      wrapper.classList.add('has-file');
    } else {
      label.textContent = 'Velg fil\u2026';
      wrapper.classList.remove('has-file');
    }
  });
});

// ── Upload documents ──────────────────────────────────────────────────────────
async function uploadDocuments() {
  const formData = new FormData();
  let hasFile = false;

  Object.entries(fileInputs).forEach(([key, { input }]) => {
    const file = input.files[0];
    if (file) {
      formData.append(key, file);
      hasFile = true;
    }
  });

  if (!hasFile) {
    showUploadStatus('Velg minst ett dokument før opplasting.', 'error');
    return;
  }

  uploadBtn.disabled = true;
  showUploadStatus('Laster opp\u2026', '');

  try {
    const res = await fetch('/api/journal/last-opp', {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Ukjent feil' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json().catch(() => ({}));
    showUploadStatus('Dokumenter lastet opp.', 'success');
    setDocsLoaded(true);
    enableChat();
    kjørAutoAnalyse(data.harMandat, data.erSamlet);
  } catch (err) {
    showUploadStatus(`Feil: ${err.message}`, 'error');
  } finally {
    uploadBtn.disabled = false;
  }
}

function showUploadStatus(msg, type) {
  uploadStatus.textContent = msg;
  uploadStatus.className = type ? type : '';
}

// ── Status indicator ──────────────────────────────────────────────────────────
function setStatusIndicator(loaded) {
  if (loaded) {
    statusDot.className = 'status-dot loaded';
    statusText.textContent = 'Dokumenter lastet';
  } else {
    statusDot.className = 'status-dot';
    statusText.textContent = 'Ingen dokumenter lastet';
  }
}

function setDocsLoaded(loaded) {
  setStatusIndicator(loaded);
}

// ── Enable/disable chat ───────────────────────────────────────────────────────
function enableChat() {
  chatInput.disabled = false;
  sendBtn.disabled = false;
  if (chatPlaceholder) chatPlaceholder.remove();
}

function disableChat() {
  chatInput.disabled = true;
  sendBtn.disabled = true;
}

// ── Conversation helpers ──────────────────────────────────────────────────────
function appendMessage(role, text) {
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.textContent = text;
  conversationHistory.appendChild(el);
  conversationHistory.scrollTop = conversationHistory.scrollHeight;
  return el;
}

// ── Send message (SSE via fetch + ReadableStream) ─────────────────────────────
async function sendMessage(text) {
  if (isSending || !text.trim()) return;
  isSending = true;
  chatInput.disabled = true;
  sendBtn.disabled = true;
  chatInput.value = '';

  appendMessage('user', text);
  const assistantEl = appendMessage('assistant', '');
  assistantEl.classList.add('streaming');

  try {
    const res = await fetch('/api/journal/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ melding: text }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      assistantEl.textContent = `Feil: ${err.error || res.status}`;
      assistantEl.classList.remove('streaming');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          handleSseEvent(eventType, data, assistantEl);
          eventType = '';
        }
      }
    }
  } catch (err) {
    assistantEl.textContent = `Feil: ${err.message}`;
  } finally {
    assistantEl.classList.remove('streaming');
    isSending = false;
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

function handleSseEvent(eventType, data, assistantEl) {
  if (eventType === 'token') {
    try {
      const { text } = JSON.parse(data);
      assistantEl.textContent += text;
      conversationHistory.scrollTop = conversationHistory.scrollHeight;
    } catch { /* ignore parse errors */ }
  } else if (eventType === 'scores') {
    try {
      const scores = JSON.parse(data);
      updateScores(scores);
    } catch { /* ignore */ }
  } else if (eventType === 'done') {
    assistantEl.classList.remove('streaming');
  }
}

// ── Scores ────────────────────────────────────────────────────────────────────
function updateScores(scores) {
  if (typeof scores.svindelrisiko === 'number') {
    setScore('risk', scores.svindelrisiko);
  }
  if (typeof scores.kompleksitet === 'number') {
    setScore('complexity', scores.kompleksitet);
  }
  if (typeof scores.informasjonsgrunnlag === 'number') {
    setScore('info', scores.informasjonsgrunnlag);
  }
}

function setScore(key, value) {
  const clamped = Math.max(0, Math.min(100, value));
  const bar = document.getElementById(`score-${key}-bar`);
  const val = document.getElementById(`score-${key}-val`);
  if (bar) bar.style.width = `${clamped}%`;
  if (val) val.textContent = clamped;
}

// ── Load facts ────────────────────────────────────────────────────────────────
async function loadFacts() {
  loadFactsBtn.disabled = true;
  loadFactsBtn.textContent = 'Henter\u2026';

  try {
    const res = await fetch('/api/journal/fakta', { method: 'POST', headers: authHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || res.status);
    }
    const facts = await res.json();
    populateFacts(facts);
  } catch (err) {
    console.error('loadFacts failed:', err.message);
  } finally {
    loadFactsBtn.disabled = false;
    loadFactsBtn.textContent = 'Hent fakta';
  }
}

function populateFacts(facts) {
  setFact('fact-skadedato', facts.symptomDato);
  setFact('fact-vmi', facts.vmi);
  setFact('fact-vmi-konfidens', facts.vmiKonfidensNiva);
  setFact('fact-uforegrad', facts.uforegrad);
}

function setFact(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value != null && value !== '') {
    el.textContent = value;
    el.classList.remove('empty');
  } else {
    el.textContent = 'Ikke tilgjengelig';
    el.classList.add('empty');
  }
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderMarkdown(tekst) {
  // Fjern SCORES-prefix og dokumentidentifikasjon-tabell
  let t = tekst
    .replace(/^SCORES:\{[^}]+\}\s*\n?/, '')
    .replace(/^#+\s*DOKUMENTIDENTIFIKASJON[\s\S]*?\n\n/m, '');

  // Markdown-tabeller → HTML
  t = t.replace(/^\|(.+)\|\s*\n\|[-| :]+\|\s*\n((?:\|.+\|\s*\n?)*)/gm, (_, header, rows) => {
    const th = header.split('|').filter(c=>c.trim()).map(c => `<TH>${c.trim()}</TH>`).join('');
    const trs = rows.trim().split('\n').map(row => {
      const tds = row.replace(/^\||\|$/g, '').split('|').map(c => `<TD>${c.trim()}</TD>`).join('');
      return `<TR>${tds}</TR>`;
    }).join('');
    return `<TABLE><thead><TR>${th}</TR></thead><tbody>${trs}</tbody></TABLE>\n`;
  });

  // Blockquotes (sammendragsboks) → behold rå HTML
  t = t.replace(/^> (.+)$/gm, '<BQ>$1</BQ>');

  let h = escHtml(t);

  // Gjenopprett HTML-tagger som ble escaped
  h = h.replace(/&lt;TABLE&gt;/g, '<table>').replace(/&lt;\/TABLE&gt;/g, '</table>');
  h = h.replace(/&lt;thead&gt;/g, '<thead>').replace(/&lt;\/thead&gt;/g, '</thead>');
  h = h.replace(/&lt;tbody&gt;/g, '<tbody>').replace(/&lt;\/tbody&gt;/g, '</tbody>');
  h = h.replace(/&lt;TR&gt;/g, '<tr>').replace(/&lt;\/TR&gt;/g, '</tr>');
  h = h.replace(/&lt;TH&gt;/g, '<th>').replace(/&lt;\/TH&gt;/g, '</th>');
  h = h.replace(/&lt;TD&gt;/g, '<td>').replace(/&lt;\/TD&gt;/g, '</td>');
  h = h.replace(/&lt;BQ&gt;/g, '<blockquote><p>').replace(/&lt;\/BQ&gt;/g, '</p></blockquote>');

  h = h.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*(.*?)\*/g, '<em>$1</em>');
  h = h.replace(/^#{1,4} (.+)$/gm, '<h4>$1</h4>');
  h = h.replace(/^---+$/gm, '<hr>');
  h = h.replace(/^[•\-] (.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>.*?<\/li>(\s*<li>.*?<\/li>)*)/gs, '<ul>$1</ul>');
  h = h.replace(/<\/ul>\s*<ul>/g, '');
  h = h.replace(/\n\n+/g, '</p><p>');
  h = h.replace(/\n(?!<)/g, '<br>');
  if (!h.startsWith('<')) h = '<p>' + h + '</p>';
  return h;
}

// ── Auto-analyse ──────────────────────────────────────────────────────────────
async function kjørAutoAnalyse(harMandat, erSamlet) {
  const tittelEl = document.getElementById('rapport-tittel');
  let sporsmal;

  if (erSamlet) {
    if (tittelEl) tittelEl.textContent = 'Identifiserer dokumenter…';
    sporsmal = `Dette er en samlet fil med flere dokumenttyper. Gjør følgende:
1. Identifiser hvilke seksjoner som finnes (pasientjournal, NAV-dokumenter, legeerklæringer, mandat/oppdragsbrev). Oppgi omtrentlig sideplassering eller kjennetegn for hver seksjon.
2. Hvis det finnes et mandat — svar direkte på spørsmålene der.
3. Kjør deretter fullstendig standardanalyse: første symptomer, VMI, grad av uførhet, årsakssammenheng og vurdering av arbeidsskade.`;
  } else if (harMandat) {
    if (tittelEl) tittelEl.textContent = 'Svarer på mandat…';
    sporsmal = `Les mandatet nøye og svar direkte og nummert på hvert enkelt spørsmål som stilles i mandatet. Bruk pasientjournal, NAV-mappe og legeerklæringer som kildemateriale. Strukturer svaret slik at hvert spørsmål fra mandatet besvares separat med overskrift.`;
  } else {
    if (tittelEl) tittelEl.textContent = 'Analyserer…';
    sporsmal = `Gjennomfør en fullstendig medisinsk vurdering av saksdokumentene. Start med sammendragsboks, deretter disse fem punktene:

## 1. Første symptomer
Når oppstod første dokumenterte symptomer? Angi dato, hvilken lege som dokumenterte det, og hva som ble beskrevet.

## 2. Varig medisinsk invaliditet (VMI)
Vurder VMI etter relevante tabeller. For hvert aktuelt skadetilfelle:
- Diagnose og diagnose-kode
- Hvilken tabell som er aktuell (1997-tabellen / Barnetabell / NPE)
- Estimert prosentsats med begrunnelse
- Hva som eventuelt mangler for endelig fastsettelse

## 3. Arbeidsuførhet
- Sykmeldingsperiode og grad dokumentert i journal
- Midlertidig vs. varig uførhet
- Uføregrad i eget yrke vs. ethvert yrke

## 4. Årsakssammenheng
- Er skaden/hendelsen årsak til plagene? Hva støtter dette?
- Finnes pre-eksisterende tilstander som kan ha bidratt?
- Bevisverdien av dokumentasjonen

## 5. Arbeidsskade
- Skjedde hendelsen i arbeidstid/på arbeidsplass?
- Er arbeidsulykke meldt til NAV eller arbeidsgiver?
- Grunnlag for yrkesskadekrav?`;
  }

  await kjørAnalyseTilDokument(sporsmal);
}

async function kjørAnalyseTilDokument(tekst) {
  if (isAnalysing) return;
  isAnalysing = true;

  const rapportEl = document.getElementById('rapport-dokument');
  const tittelEl  = document.getElementById('rapport-tittel');
  rapportEl.innerHTML = '<div class="laster-dokument"><div class="laster-ikon">\u23F3</div><div>Analyserer\u2026</div></div>';

  try {
    const res = await fetch('/api/journal/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ melding: tekst }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', currentEvent = '', akkumulert = '', contentEl = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const linjer = buffer.split('\n');
      buffer = linjer.pop();

      for (const linje of linjer) {
        if (linje.startsWith('event:')) {
          currentEvent = linje.slice(6).trim();
        } else if (linje.startsWith('data:')) {
          let data;
          try { data = JSON.parse(linje.slice(5).trim()); } catch { continue; }
          if (currentEvent === 'token') {
            akkumulert += data.text;
            if (!contentEl) {
              rapportEl.innerHTML = '';
              contentEl = document.createElement('div');
              rapportEl.appendChild(contentEl);
            }
            contentEl.innerHTML = renderMarkdown(akkumulert.replace(/^SCORES:\{[^}]+\}\s*\n?/, ''));
          } else if (currentEvent === 'scores') {
            updateScores(data);
          } else if (currentEvent === 'done') {
            const renTekst = akkumulert
              .replace(/^SCORES:\{[^}]+\}\s*\n?/, '')
              .replace(/\nSCORES:\{[^}]+\}\s*$/, '').trim();
            rapportEl.innerHTML = '';
            const finalEl = document.createElement('div');
            finalEl.innerHTML = renderMarkdown(renTekst);
            rapportEl.appendChild(finalEl);
            if (tittelEl) tittelEl.textContent = 'Ferdig';
            loadFacts();
          } else if (currentEvent === 'error') {
            rapportEl.innerHTML = `<p style="color:#991B1B">\u274C ${escHtml(data.message || 'Ukjent feil')}</p>`;
          }
        }
      }
    }
  } catch (err) {
    rapportEl.innerHTML = `<p style="color:#991B1B">\u274C ${escHtml(err.message)}</p>`;
  } finally {
    isAnalysing = false;
  }
}

// ── Reset session ─────────────────────────────────────────────────────────────
async function resetSession() {
  try {
    await fetch('/api/journal/reset', { method: 'POST', headers: authHeaders() });
  } catch { /* ignore */ }

  // Clear UI
  conversationHistory.innerHTML = '';
  const placeholder = document.createElement('p');
  placeholder.className = 'chat-placeholder';
  placeholder.id = 'chat-placeholder';
  placeholder.textContent = 'Last opp dokumenter for å starte analysen.';
  conversationHistory.appendChild(placeholder);

  disableChat();
  setStatusIndicator(false);

  // Reset scores
  ['risk', 'complexity', 'info'].forEach(key => {
    const bar = document.getElementById(`score-${key}-bar`);
    const val = document.getElementById(`score-${key}-val`);
    if (bar) bar.style.width = '0%';
    if (val) val.textContent = '\u2013';
  });

  // Reset facts
  ['fact-skadedato', 'fact-vmi', 'fact-vmi-konfidens', 'fact-uforegrad'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = 'Ikke hentet'; el.classList.add('empty'); }
  });

  // Reset file inputs
  Object.values(fileInputs).forEach(({ input, wrapper, label }) => {
    input.value = '';
    wrapper.classList.remove('has-file');
    label.textContent = 'Velg fil\u2026';
  });

  // Reset rapport
  const rapportEl = document.getElementById('rapport-dokument');
  const tittelEl  = document.getElementById('rapport-tittel');
  if (rapportEl) rapportEl.innerHTML = '<div class="rapport-empty"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>Analyserapporten vises her etter at dokumenter er lastet opp.</span></div>';
  if (tittelEl) tittelEl.textContent = '';

  showUploadStatus('', '');
}

// ── Load session status on page load ─────────────────────────────────────────
async function loadStatus() {
  statusDot.className = 'status-dot loading';
  statusText.textContent = 'Sjekker\u2026';

  try {
    const res = await fetch('/api/journal/session-status', { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.harDokumenter) {
      setStatusIndicator(true);
      enableChat();
      if (data.scores) updateScores(data.scores);
    } else {
      setStatusIndicator(false);
    }
  } catch {
    setStatusIndicator(false);
  }
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
function initAuth() {
  const token = localStorage.getItem('sana_token');
  const user = JSON.parse(localStorage.getItem('sana_user') || 'null');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }
  if (user?.name && userNameEl) userNameEl.textContent = user.name;
}

// ── Event listeners ───────────────────────────────────────────────────────────
uploadBtn.addEventListener('click', uploadDocuments);

sendBtn.addEventListener('click', () => {
  sendMessage(chatInput.value.trim());
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(chatInput.value.trim());
  }
});

resetBtn.addEventListener('click', resetSession);
loadFactsBtn.addEventListener('click', loadFacts);

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('sana_token');
  localStorage.removeItem('sana_user');
  window.location.href = '/login.html';
});

// ── Init ──────────────────────────────────────────────────────────────────────
initAuth();
loadStatus();
