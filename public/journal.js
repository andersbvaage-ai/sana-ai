'use strict';

// ── State ────────────────────────────────────────────────────────────────────
let isSending = false;

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
  legeerklaring:{ input: document.getElementById('file-legeerklaring'), wrapper: document.getElementById('wrapper-legeerklaring'), label: document.getElementById('label-legeerklaring') },
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
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Ukjent feil' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    showUploadStatus('Dokumenter lastet opp.', 'success');
    setDocsLoaded(true);
    enableChat();
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
      headers: { 'Content-Type': 'application/json' },
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
      const { token } = JSON.parse(data);
      assistantEl.textContent += token;
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
    const res = await fetch('/api/journal/fakta', { method: 'POST' });
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
  setFact('fact-skadedato', facts.skadedato);
  setFact('fact-vmi', facts.vmi);
  setFact('fact-vmi-konfidens', facts.vmiKonfidens);
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

// ── Reset session ─────────────────────────────────────────────────────────────
async function resetSession() {
  try {
    await fetch('/api/journal/reset', { method: 'POST' });
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

  showUploadStatus('', '');
}

// ── Load session status on page load ─────────────────────────────────────────
async function loadStatus() {
  statusDot.className = 'status-dot loading';
  statusText.textContent = 'Sjekker\u2026';

  try {
    const res = await fetch('/api/journal/session-status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.hasDocuments) {
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
  const token = localStorage.getItem('token');
  const name = localStorage.getItem('userName');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }
  if (name && userNameEl) userNameEl.textContent = name;
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
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  window.location.href = '/login.html';
});

// ── Init ──────────────────────────────────────────────────────────────────────
initAuth();
loadStatus();
