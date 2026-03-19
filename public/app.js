// ── State ──────────────────────────────────────────────────────────────────
const SCENARIOS = {
  'BRUKER-DR-ANDERSEN|PASIENT-A7F2|NOTAT-001': {
    context: 'poliklinikk',
    text: `Pasient: Test Testesen, fnr: 00000000001
Dato: 10. mars 2026
Lege: Dr. Testlege

Subjektivt:
Pasient møter til kontroll etter oppstart av metformin 500mg x2 for type 2 diabetes.
Rapporterer god etterlevelse. Noe kvalme første to uker, men dette har gått over.
Fastende blodsukker hjemme: 6,8–8,2 mmol/L siste uke.
Pårørende: Test Pårørende, tlf: 00000001
Bosted: Testgata 1, 0001 Testby

Objektivt:
Vekt: 84 kg (ned 1,2 kg siden sist). BT: 138/82 mmHg. Puls: 72 reg.
HbA1c: 58 mmol/mol (ned fra 71 ved forrige kontroll).
Kreatinin: 78 µmol/L. eGFR: 82 ml/min. Urin-albumin/kreatinin: 2,1 mg/mmol (normalt).

Vurdering og plan:
God metabolsk respons på metformin. Fortsetter nåværende dose.
Legger til kostholdsrådgivning. Neste kontroll om 3 måneder med ny HbA1c.`
  },
  'BRUKER-DR-ANDERSEN|PASIENT-B3D9|NOTAT-003': {
    context: 'akutt',
    text: `Pasient: Test Testesen2, fnr: 00000000002
Dato: 12. mars 2026

Innkomst:
68 år gammel testpasient innlegges med brystsmerter og tungpustenhet siden 3 timer.
Tidligere: hypertensjon, hyperlipidemi, røyker 10 sigaretter/dag.
Pårørende: Test Pårørende2, tlf: 00000002

Klinisk funn:
Pasient er blek og svett. BT: 160/95 mmHg. Puls: 98, uregelmessig. SpO2: 94% på luft.
Auskultasjon hjerte: uregelmessig rytme, ingen bilyder.
Auskultasjon lunger: krepitasjoner basalt bilateralt.
EKG: Atrieflimmer med hurtig ventrikkelrespons, ST-depresjon V4-V6.

Blodprøver: Troponin T: 0,08 µg/L (lett forhøyet). Pro-BNP: 1450 ng/L.

Tiltak:
Oksygen 2L/min. Metoprolol 5mg IV x2. Heparin iv oppstart.
Innlagt kardiologisk avdeling.`
  },
  'BRUKER-DR-BAKKE|PASIENT-C1E5|NOTAT-004': {
    context: 'poliklinikk',
    text: `Pasient: Test Testesen3, fnr: 00000000003
Dato: 8. mars 2026
Behandler: Psykiater Dr. Testlege
Adresse: Testgata 3, 0003 Testby

Bakgrunn:
34 år gammel kvinne med kjent recidiverende depresjon og GAD.
Har stått på sertralin 100mg siden 2023.

Aktuelt:
Pasient beskriver økt grubling siste 4 uker etter jobbskifte. Søvnvansker.
Energinivå redusert. Konsentrasjonsvansker. Benekter suicidalitet.

PHQ-9: 14 (moderat depresjon). GAD-7: 11 (moderat angst).

Plan:
Øker sertralin til 150mg. Henvist gruppebasert KAT.
Kontaktperson ved krise: Legevakt tlf 116 117.`
  },
  'BRUKER-SEKR-LIE|PASIENT-A7F2|NOTAT-001': {
    context: 'generell',
    text: `Administrativ notat vedrørende pasient PASIENT-A7F2.
Sekretær Tone Lie forsøker å hente AI-sammendrag.
Dette skal avvises da sekretær ikke er registrert behandler.`
  }
};

let currentScenario = {
  userId: 'BRUKER-DR-ANDERSEN',
  role: 'lege',
  patientId: 'PASIENT-A7F2',
  noteId: 'NOTAT-001'
};
let currentToken = null;

// ── Server-statussjekk ────────────────────────────────────────────────────
async function checkServer() {
  try {
    const r = await fetch('/health');
    if (r.ok) {
      document.getElementById('status-dot').className = 'online';
      document.getElementById('status-text').textContent = 'Server kjører';
    } else { throw new Error(); }
  } catch {
    document.getElementById('status-dot').className = 'offline';
    document.getElementById('status-text').textContent = 'Server ikke tilgjengelig';
  }
}

// ── Scenario-valg ────────────────────────────────────────────────────────
function selectScenario(btn, userId, role, patientId, noteId) {
  document.querySelectorAll('.scenario-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');

  currentScenario = { userId, role, patientId, noteId };
  currentToken = null;
  document.getElementById('token-display').textContent = 'Ingen token ennå';
  document.getElementById('token-user').textContent = '';

  const key = `${userId}|${patientId}|${noteId}`;
  const s = SCENARIOS[key];
  if (s) {
    document.getElementById('clinical-text').value = s.text;
    document.getElementById('context').value = s.context;
  }

  document.getElementById('results').innerHTML = `
    <div class="card"><div class="card-body">
      <div class="placeholder">
        <div class="placeholder-icon">🔬</div>
        <div class="placeholder-text">Klikk <strong>Analyser</strong> for å kjøre dette scenariet</div>
      </div>
    </div></div>`;
}

// ── Hent token ───────────────────────────────────────────────────────────
async function getToken() {
  const r = await fetch('/api/dev/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentScenario)
  });
  const data = await r.json();
  currentToken = data.token;
  document.getElementById('token-display').textContent = currentToken;
  document.getElementById('token-user').textContent =
    `${currentScenario.userId} · ${currentScenario.role}`;
  return currentToken;
}

// ── Scrubbing-forhåndsvisning ─────────────────────────────────────────────
async function getScrubPreview(text) {
  const r = await fetch('/api/dev/scrub', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  return r.json();
}

// ── Highlight scrubbing-markører ─────────────────────────────────────────
function highlightMarkers(text) {
  const markers = [
    '[FNR FJERNET]','[TLF FJERNET]','[ADRESSE FJERNET]',
    '[PÅRØRENDE FJERNET]','[EPOST FJERNET]'
  ];
  let escaped = text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  for (const m of markers) {
    const safe = m.replace(/\[/g,'\\[').replace(/\]/g,'\\]');
    escaped = escaped.replace(new RegExp(safe.replace(/\\/g,'\\\\'), 'g'),
      `<span class="marker">${m}</span>`);
  }
  return escaped;
}

// ── Hovedfunksjon: kjør analyse ──────────────────────────────────────────
async function runAnalysis() {
  const btn = document.getElementById('analyse-btn');
  const spinner = document.getElementById('spinner');
  const btnText = document.getElementById('btn-text');

  btn.disabled = true;
  spinner.style.display = 'block';
  btnText.textContent = 'Henter token...';

  try {
    // 1) Token
    const token = await getToken();

    // 2) Scrubbing-preview
    btnText.textContent = 'Scrubber tekst...';
    const clinicalText = document.getElementById('clinical-text').value;
    const scrubResult = await getScrubPreview(clinicalText);

    // 3) AI-kall
    btnText.textContent = 'Kaller AI...';
    const r = await fetch('/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        clinicalText,
        context: document.getElementById('context').value,
        desiredLength: document.getElementById('desired-length').value
      })
    });

    const data = await r.json();
    renderResults(r.status, data, scrubResult);

  } catch (err) {
    renderNetworkError(err);
  } finally {
    btn.disabled = false;
    spinner.style.display = 'none';
    btnText.textContent = 'Analyser';
  }
}

// ── Render resultater ─────────────────────────────────────────────────────
function renderResults(status, data, scrubResult) {
  const container = document.getElementById('results');

  const fieldsHtml = scrubResult.removedFields.length > 0
    ? scrubResult.removedFields.map(f =>
        `<span class="field-tag">${f}</span>`).join('')
    : `<span class="no-fields">✓ Ingen identifiserende felter funnet</span>`;

  const scrubCard = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Scrubbing-resultat</span>
        <span style="font-size:12px;color:var(--gray-600);">${scrubResult.removedFields.length} felt fjernet</span>
      </div>
      <div class="scrub-grid">
        <div class="scrub-pane">
          <div class="scrub-label original">▪ Original</div>
          <div class="scrub-text">${escapeHtml(scrubResult.original)}</div>
        </div>
        <div class="scrub-pane">
          <div class="scrub-label scrubbed">✓ Etter scrubbing</div>
          <div class="scrub-text">${highlightMarkers(scrubResult.scrubbedText)}</div>
        </div>
      </div>
      <div class="removed-fields">${fieldsHtml}</div>
    </div>`;

  let resultCard;

  if (status === 200) {
    resultCard = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">AI-sammendrag</span>
        </div>
        <div class="card-body">
          <div class="correlation-bar">
            <span class="correlation-label">Correlation ID</span>
            <span class="correlation-value">${data.correlationId}</span>
          </div>
          <div class="pending-badge">⏳ pending_review</div>
          <div class="summary-box">${escapeHtml(data.summary)}</div>
          <div class="warning-box">⚠️ ${escapeHtml(data.warning)}</div>
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Modell</span>
              <span class="meta-value">${data.model}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Behandlingstid</span>
              <span class="meta-value">${data.processingTimeMs} ms</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Status</span>
              <span class="meta-value" style="color:var(--green);">HTTP 200 OK</span>
            </div>
          </div>
        </div>
      </div>`;
  } else {
    const note = getErrorNote(data.code);
    resultCard = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Feil – HTTP ${status}</span>
        </div>
        <div class="card-body">
          ${data.correlationId ? `
          <div class="correlation-bar">
            <span class="correlation-label">Correlation ID</span>
            <span class="correlation-value">${data.correlationId}</span>
          </div>` : ''}
          <div class="error-panel">
            <div class="error-code">${data.code ?? 'UKJENT_FEIL'}</div>
            <div class="error-message">${escapeHtml(data.error ?? JSON.stringify(data))}</div>
            ${note ? `<div class="error-note">ℹ️ ${note}</div>` : ''}
          </div>
        </div>
      </div>`;
  }

  container.innerHTML = scrubCard + resultCard;
}

function renderNetworkError(err) {
  document.getElementById('results').innerHTML = `
    <div class="card"><div class="card-body">
      <div class="error-panel">
        <div class="error-code">Nettverksfeil</div>
        <div class="error-message">${escapeHtml(String(err))}</div>
        <div class="error-note">ℹ️ Sørg for at serveren kjører på localhost:3000 (npm run dev)</div>
      </div>
    </div></div>`;
}

function getErrorNote(code) {
  const notes = {
    'RESERVATION_ERROR': 'Pasienten har reservert seg mot AI-behandling (EPJ-KRAV-05). Dette er forventet atferd for PASIENT-C1E5.',
    'FORBIDDEN': 'Brukeren er ikke registrert behandler for denne pasienten, eller rollen gir ikke tilgang.',
    'UNAUTHORIZED': 'JWT-tokenet mangler, er ugyldig eller utløpt.',
    'KILL_SWITCH_ACTIVE': 'AI-modulen er deaktivert via kill-switch. Aktiver via /api/admin.',
    'RATE_LIMIT_EXCEEDED': 'For mange forespørsler. Vent litt og prøv igjen.',
  };
  return notes[code] ?? null;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── PDF-opplasting ────────────────────────────────────────────────────────
async function uploadPdf(file) {
  const status = document.getElementById('upload-status');
  status.textContent = 'Leser PDF...';
  status.className = 'upload-status loading';

  try {
    const formData = new FormData();
    formData.append('pdf', file);

    const r = await fetch('/api/dev/parse-pdf', { method: 'POST', body: formData });
    const data = await r.json();

    if (!r.ok) throw new Error(data.error ?? 'Ukjent feil');

    document.getElementById('clinical-text').value = data.text;
    status.textContent = `✓ ${file.name} lastet opp (${data.pages} side${data.pages !== 1 ? 'r' : ''})`;
    status.className = 'upload-status success';
  } catch (err) {
    status.textContent = `Feil: ${err.message}`;
    status.className = 'upload-status error';
  }
}

// ── Init ──────────────────────────────────────────────────────────────────
checkServer();
setInterval(checkServer, 10000);

// PDF fil-input
document.getElementById('pdf-input').addEventListener('change', function() {
  if (this.files[0]) uploadPdf(this.files[0]);
});

// Drag-and-drop
const uploadArea = document.getElementById('upload-area');
uploadArea.addEventListener('dragover', function(e) {
  e.preventDefault();
  this.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', function() {
  this.classList.remove('dragover');
});
uploadArea.addEventListener('drop', function(e) {
  e.preventDefault();
  this.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    uploadPdf(file);
  } else {
    const status = document.getElementById('upload-status');
    status.textContent = 'Kun PDF-filer er tillatt';
    status.className = 'upload-status error';
  }
});
uploadArea.addEventListener('click', function(e) {
  if (e.target.tagName !== 'STRONG') {
    document.getElementById('pdf-input').click();
  }
});

document.querySelectorAll('.scenario-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    selectScenario(
      btn,
      btn.dataset.user,
      btn.dataset.role,
      btn.dataset.patient,
      btn.dataset.note
    );
  });
});

document.getElementById('analyse-btn').addEventListener('click', runAnalysis);

const firstKey = 'BRUKER-DR-ANDERSEN|PASIENT-A7F2|NOTAT-001';
document.getElementById('clinical-text').value = SCENARIOS[firstKey].text;
document.getElementById('context').value = SCENARIOS[firstKey].context;
