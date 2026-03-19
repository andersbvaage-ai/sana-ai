(function () {
  const user = JSON.parse(localStorage.getItem('sana_user') || 'null');
  const token = localStorage.getItem('sana_token');
  if (token && user) {
    const navRight = document.getElementById('nav-right');
    navRight.innerHTML =
      '<span style="font-size:13px;font-weight:500;color:var(--muted)">' + user.name + '</span>' +
      '<a href="/cases.html" class="btn-nav-primary">Åpne verktøyet</a>';
  }
})();

(function () {
  const STEPS = ['1. Last opp', '2. Analyserer', '3. Resultat', '4. Godkjenn'];
  const pillsEl = document.getElementById('demo-pills');
  STEPS.forEach((label, i) => {
    const btn = document.createElement('button');
    btn.className = 'demo-step-pill' + (i === 0 ? ' on' : '');
    btn.textContent = label;
    btn.onclick = () => goTo(i);
    pillsEl.appendChild(btn);
  });
  let cur = 0, timer = null;
  function goTo(idx) {
    document.querySelectorAll('.demo-screen').forEach(s => s.classList.remove('visible'));
    document.querySelectorAll('.demo-step-pill').forEach(p => p.classList.remove('on'));
    cur = ((idx % STEPS.length) + STEPS.length) % STEPS.length;
    document.getElementById('ds' + cur).classList.add('visible');
    pillsEl.children[cur].classList.add('on');
    if (cur === 0) animUpload();
    if (cur === 2) animPrio();
    if (cur === 3) animApprove();
    clearTimeout(timer);
    timer = setTimeout(() => goTo(cur + 1), cur === 1 ? 2400 : 3200);
  }
  function animUpload() {
    const zone = document.getElementById('upload-zone');
    const file = document.getElementById('upload-file');
    zone.classList.remove('active'); file.classList.remove('vis');
    setTimeout(() => zone.classList.add('active'), 700);
    setTimeout(() => { zone.classList.remove('active'); file.classList.add('vis'); }, 1400);
  }
  function animPrio() {
    const bar = document.getElementById('demo-prio-bar');
    bar.style.width = '0%';
    setTimeout(() => { bar.style.width = '97%'; }, 150);
  }
  function animApprove() {
    const btn = document.getElementById('approve-btn');
    const msg = document.getElementById('approved-msg');
    btn.style.display = 'block'; msg.style.display = 'none';
    setTimeout(() => {
      btn.style.background = '#0F4C2E';
      setTimeout(() => { btn.style.display = 'none'; msg.style.display = 'block'; }, 500);
    }, 2000);
  }
  goTo(0);
})();
