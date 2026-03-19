// ── Sana AI – landing page animations ────────────────────────────────────────
// Stack: Lenis (smooth scroll) + GSAP + ScrollTrigger + Splitting.js + CSS noise
gsap.registerPlugin(ScrollTrigger);

// ── 1. Hash-link scroll med offset for fast nav ───────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  });
});

// ── 2. Hero h1 reveal (linje-for-linje, ingen Splitting.js på h1) ─────────────
gsap.from('.hero h1', {
  y: 40,
  opacity: 0,
  duration: 0.9,
  ease: 'power4.out',
  delay: 0.1,
});

// Hero støtteelementer
gsap.from(['.hero-kicker', '.hero-sub', '.hero-actions', '.hero-trust'], {
  y: 22,
  opacity: 0,
  duration: 0.7,
  stagger: 0.1,
  ease: 'power3.out',
  delay: 0.55,
});

gsap.from('.hero-right', {
  x: 36,
  opacity: 0,
  duration: 1,
  ease: 'power3.out',
  delay: 0.3,
});

// ── 3. GSAP ScrollTrigger – seksjonsoverskrifter ──────────────────────────────
gsap.utils.toArray('h2.stitle, .tension-left h2').forEach((el) => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: 'top 88%' },
    y: 36,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
  });
});

gsap.utils.toArray('.eyebrow, .sub').forEach((el) => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: 'top 90%' },
    y: 18,
    opacity: 0,
    duration: 0.6,
    ease: 'power3.out',
  });
});

// ── 4. Tallteljer – .tstat-num ────────────────────────────────────────────────
document.querySelectorAll('.tstat-num').forEach((el) => {
  const original = el.textContent.trim();
  if (!/^\d+$/.test(original)) return; // skip <5s og andre ikke-heltall
  const num = parseInt(original, 10);
  if (isNaN(num) || num === 0) return;

  el.textContent = '0';
  ScrollTrigger.create({
    trigger: el,
    start: 'top 82%',
    once: true,
    onEnter: () => {
      gsap.to({ val: 0 }, {
        val: num,
        duration: 1.6,
        ease: 'power2.out',
        onUpdate() { el.textContent = Math.round(this.targets()[0].val); },
        onComplete() { el.textContent = original; },
      });
    },
  });
});

// ── 5. Flow-steg ──────────────────────────────────────────────────────────────
gsap.from('.flow-step', {
  scrollTrigger: { trigger: '#workflow', start: 'top 78%' },
  y: 48,
  opacity: 0,
  duration: 0.7,
  stagger: 0.14,
  ease: 'power3.out',
});

// ── 6. Bento-kort ─────────────────────────────────────────────────────────────
gsap.from('.bc', {
  scrollTrigger: { trigger: '.bento', start: 'top 82%' },
  y: 36,
  opacity: 0,
  duration: 0.6,
  stagger: 0.07,
  ease: 'power3.out',
});

// ── 7. Compliance-items ───────────────────────────────────────────────────────
gsap.from('.c-item', {
  scrollTrigger: { trigger: '.c-grid', start: 'top 82%' },
  y: 28,
  opacity: 0,
  duration: 0.6,
  stagger: 0.09,
  ease: 'power3.out',
});

// ── 8. Demo-seksjon ───────────────────────────────────────────────────────────
gsap.from('#demo .demo-wrap', {
  scrollTrigger: { trigger: '#demo', start: 'top 78%' },
  y: 40,
  opacity: 0,
  duration: 0.8,
  ease: 'power3.out',
});

// ── 9. Mobilmeny – hamburger toggle ──────────────────────────────────────────
const hamburger = document.getElementById('nav-hamburger');
const mobileMenu = document.getElementById('nav-mobile-menu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Lukk ved klikk på lenke
  mobileMenu.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
    });
  });
}

// ── 10. Nav – subtil shadow ved scroll ────────────────────────────────────────
ScrollTrigger.create({
  start: 'top -80',
  onUpdate: (self) => {
    document.querySelector('nav').style.boxShadow =
      self.progress > 0 ? '0 2px 24px rgba(27,58,75,0.10)' : 'none';
  },
});
