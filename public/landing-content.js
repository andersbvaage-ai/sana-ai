// Henter og appliserer dynamisk innhold og fonter på landingssiden
(async function () {
  let data;
  try {
    const r = await fetch('/api/content/landing');
    if (!r.ok) return;
    data = await r.json();
  } catch {
    return; // stille feil – defaults i HTML er allerede synlige
  }

  const c = data.content;

  // ── Fonter ───────────────────────────────────────────────────────────────
  const HEADING_FONT_PARAMS = {
    'Playfair Display':   'Playfair+Display:ital,wght@0,700;0,800;1,700',
    'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,600;0,700;1,600',
    'Lora':               'Lora:ital,wght@0,600;0,700;1,600',
    'Libre Baskerville':  'Libre+Baskerville:ital,wght@0,700;1,700',
  };
  const BODY_FONT_PARAMS = {
    'Inter':         'Inter:wght@400;500;600;700',
    'DM Sans':       'DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700',
    'IBM Plex Sans': 'IBM+Plex+Sans:wght@400;500;600;700',
    'Nunito Sans':   'Nunito+Sans:wght@400;500;600;700',
  };

  const hParam = HEADING_FONT_PARAMS[c.headingFont];
  const bParam = BODY_FONT_PARAMS[c.bodyFont];

  if (hParam || bParam) {
    const families = [hParam, bParam].filter(Boolean).join('&family=');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
    document.head.appendChild(link);
  }

  // CSS-variabler
  const root = document.documentElement;
  if (c.headingFont) root.style.setProperty('--font-heading', `'${c.headingFont}'`);
  if (c.bodyFont)    root.style.setProperty('--font-body',    `'${c.bodyFont}'`);

  // ── Tekst ─────────────────────────────────────────────────────────────────
  function setText(sel, val) {
    const el = document.querySelector(sel);
    if (el && val) el.textContent = val;
  }

  // Hero
  setText('[data-lc="hero.kicker"]',  c.hero?.kicker);
  setText('[data-lc="hero.h1Line1"]', c.hero?.h1Line1);
  setText('[data-lc="hero.h1Line2"]', c.hero?.h1Line2);
  setText('[data-lc="hero.h1Line3"]', c.hero?.h1Line3);
  setText('[data-lc="hero.sub"]',     c.hero?.sub);

  // Problem
  setText('[data-lc="problem.heading"]',   c.problem?.heading);
  setText('[data-lc="problem.headingEm"]', c.problem?.headingEm);
  if (c.problem?.body) {
    const el = document.querySelector('[data-lc="problem.body"]');
    if (el) el.innerHTML = c.problem.body.replace(/\n\n/g, '<br><br>');
  }

  // Kontakt
  setText('[data-lc="contact.heading"]',   c.contact?.heading);
  setText('[data-lc="contact.headingEm"]', c.contact?.headingEm);

  // CTA
  setText('[data-lc="cta.heading"]',   c.cta?.heading);
  setText('[data-lc="cta.headingEm"]', c.cta?.headingEm);
  setText('[data-lc="cta.sub"]',       c.cta?.sub);
})();
