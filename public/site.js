(function () {
  // Nav
  document.querySelector('nav').innerHTML = `
    <a href="/" class="logo">Sana <span>AI</span></a>
    <div class="nav-links">
      <a href="/plattform.html">Plattform</a>
      <a href="/sikkerhet.html">Sikkerhet</a>
      <a href="/om-oss.html">Om oss</a>
    </div>
    <div class="nav-right" id="navRight">
      <a href="/login.html" class="nav-ghost">Logg inn</a>
      <a href="/kontakt.html" class="btn-pill btn-teal">Be om demo</a>
    </div>
    <button class="nav-hamburger" id="navHamburger" aria-label="Åpne meny" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  `;

  // Mobile menu (injected after nav)
  const mobileMenu = document.createElement('div');
  mobileMenu.className = 'nav-mobile';
  mobileMenu.id = 'navMobile';
  mobileMenu.innerHTML = `
    <a href="/plattform.html">Plattform</a>
    <a href="/sikkerhet.html">Sikkerhet</a>
    <a href="/om-oss.html">Om oss</a>
    <a href="/kontakt.html" class="btn-pill btn-teal">Be om demo</a>
  `;
  document.querySelector('nav').insertAdjacentElement('afterend', mobileMenu);

  // Auth state in nav
  const token = localStorage.getItem('sana_token');
  const user = JSON.parse(localStorage.getItem('sana_user') || 'null');
  if (token) {
    const navRight = document.getElementById('navRight');
    navRight.innerHTML = `
      <span class="nav-user">${user?.name ?? 'Innlogget'}</span>
      <a href="/journal.html" class="btn-pill btn-teal">Åpne verktøyet</a>
    `;
  }

  // Mark active nav links
  const path = window.location.pathname.replace(/\/$/, '') || '/index.html';
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(a => {
    if (path.endsWith(a.getAttribute('href'))) a.classList.add('active');
  });

  // Hamburger toggle
  const hamburger = document.getElementById('navHamburger');
  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });

  // Close on link click
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('nav') && !e.target.closest('#navMobile')) {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  // Footer
  document.querySelector('footer').innerHTML = `
    <a href="/" class="footer-logo">Sana <span>AI</span></a>
    <div class="footer-links">
      <a href="/plattform.html">Plattform</a>
      <a href="/sikkerhet.html">Sikkerhet</a>
      <a href="/om-oss.html">Om oss</a>
      <a href="/kontakt.html">Kontakt</a>
    </div>
    <span class="footer-copy">Copyright 2026 Sana AI</span>
  `;

  // Scroll reveal
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  const revealEls = document.querySelectorAll('.reveal');
  revealEls.forEach(el => io.observe(el));
  // Immediately reveal elements already in viewport on load
  requestAnimationFrame(() => {
    revealEls.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom >= 0) el.classList.add('in');
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
})();
