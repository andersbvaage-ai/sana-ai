// Auth-sjekk
(function () {
  const token = localStorage.getItem('sana_token');
  if (!token) { window.location.replace('/login.html'); return; }
  const user = JSON.parse(localStorage.getItem('sana_user') || '{}');
  if (user.name) document.getElementById('user-name').textContent = user.name;
})();

function getAuthHeaders() {
  const token = localStorage.getItem('sana_token');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

function fmt(n) { return n.toLocaleString('no-NO'); }

function barRow(label, count, max, colorClass) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return `
    <div class="bar-row">
      <span class="bar-row-label">${label}</span>
      <div class="bar-track"><div class="bar-fill ${colorClass}" style="width:0%" data-pct="${pct}"></div></div>
      <span class="bar-count">${count}</span>
    </div>`;
}

async function loadStats() {
  try {
    const r = await fetch('/api/stats', { headers: getAuthHeaders() });
    if (r.status === 401) { window.location.replace('/login.html'); return; }
    const s = await r.json();

    if (s.total === 0) {
      document.getElementById('page-sub').textContent = 'Ingen saker registrert ennå.';
      document.getElementById('stats-empty').style.display = 'block';
      return;
    }

    document.getElementById('page-sub').textContent =
      `Basert på ${s.total} sak${s.total !== 1 ? 'er' : ''} i systemet.`;
    document.getElementById('stats-content').style.display = 'block';

    // Nøkkeltall
    document.getElementById('s-total').textContent    = fmt(s.total);
    document.getElementById('s-vurdert').textContent  = fmt(s.vurdert);
    document.getElementById('s-til-vurd').textContent = fmt(s.tilVurdering);
    document.getElementById('s-score').textContent    = s.prioritetScoreSnitt + '%';

    const vurdertPct = s.total > 0 ? Math.round((s.vurdert / s.total) * 100) : 0;
    document.getElementById('s-vurdert-pct').textContent = `${vurdertPct}% av totalt`;
    document.getElementById('s-siste').textContent = s.sisteOpplastet
      ? 'Siste: ' + new Date(s.sisteOpplastet).toLocaleDateString('no-NO')
      : '–';

    // Status-bar
    document.getElementById('split-vurdert').style.width  = vurdertPct + '%';
    document.getElementById('split-til-vurd').style.width = (100 - vurdertPct) + '%';
    document.getElementById('leg-vurdert').textContent  = `${s.vurdert} vurdert`;
    document.getElementById('leg-til-vurd').textContent = `${s.tilVurdering} til vurdering`;

    // Kritikalitet-bars
    const kritMax = Math.max(...Object.values(s.kritikalitet));
    document.getElementById('krit-bars').innerHTML = [
      barRow('Kritisk', s.kritikalitet.Kritisk, kritMax, 'bar-kritisk'),
      barRow('Høy',     s.kritikalitet.Høy,     kritMax, 'bar-høy'),
      barRow('Middels', s.kritikalitet.Middels,  kritMax, 'bar-middels'),
      barRow('Lav',     s.kritikalitet.Lav,      kritMax, 'bar-lav'),
    ].join('');

    // Standpunkt-bars
    const spMax = Math.max(...Object.values(s.standpunkt));
    document.getElementById('sp-bars').innerHTML = [
      barRow('Støttes',        s.standpunkt['Støttes'],        spMax, 'bar-støttes'),
      barRow('Støttes delvis', s.standpunkt['Støttes delvis'], spMax, 'bar-delvis'),
      barRow('Avvises',        s.standpunkt['Avvises'],        spMax, 'bar-avvises'),
      barRow('Uavklart',       s.standpunkt['Uavklart'],       spMax, 'bar-uavklart'),
    ].join('');

    // Token-rader
    const totalTokens = s.tokensInput + s.tokensOutput;
    document.getElementById('token-rows').innerHTML = `
      <div class="token-row"><span class="t-label">Input-tokens</span><span class="t-value">${fmt(s.tokensInput)}</span></div>
      <div class="token-row"><span class="t-label">Output-tokens</span><span class="t-value">${fmt(s.tokensOutput)}</span></div>
      <div class="token-row"><span class="t-label">Totalt tokens</span><span class="t-value">${fmt(totalTokens)}</span></div>
      <div class="token-row"><span class="t-label">Estimert kostnad</span><span class="t-value cost">$${s.estimertKostnadUSD.toFixed(2)}</span></div>
    `;

    // Animer bars etter DOM er satt
    requestAnimationFrame(() => {
      document.querySelectorAll('.bar-fill[data-pct]').forEach(el => {
        el.style.width = el.dataset.pct + '%';
      });
    });

  } catch {
    document.getElementById('page-sub').textContent = 'Kunne ikke laste statistikk.';
  }
}

loadStats();

document.getElementById('btn-refresh').addEventListener('click', async function () {
  this.classList.add('spinning');
  this.disabled = true;
  await loadStats();
  this.classList.remove('spinning');
  this.disabled = false;
});

