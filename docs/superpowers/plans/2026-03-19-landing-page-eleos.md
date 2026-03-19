# Landing Page — Eleos-design til index.html

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Erstatt gjeldende `public/index.html` med det godkjente eleos-inspirerte designet fra `public/mockup-eleos.html`, med fire kvalitetsforbedringer underveis.

**Architecture:** Rent statisk HTML/CSS — ingen JS-rammeverk. All styling bor i én `<style>`-blokk i filen. Inline `style="..."`-attributter flyttes til CSS-klasser. RTL-hack erstattes med CSS `order`. Lenker kobles til faktiske destinasjoner.

**Tech Stack:** Vanilla HTML5, CSS custom properties, Intersection Observer API (reveal-animasjoner)

---

## Filstruktur

| Fil | Endring |
|-----|---------|
| `.gitignore` | Legg til `.superpowers/` |
| `public/mockup-eleos.html` | Kilde — endres i steg 1–3, brukes som grunnlag |
| `public/index.html` | Erstattes fullstendig i steg 4 |

---

## Task 1: .gitignore

**Filer:**
- Modify: `.gitignore`

- [ ] **Steg 1: Legg til .superpowers/ i .gitignore**

  Åpne `.gitignore` og legg til på slutten:
  ```
  # Superpowers brainstorm sessions
  .superpowers/
  ```

- [ ] **Steg 2: Commit**
  ```bash
  git add .gitignore
  git commit -m "chore: ignore .superpowers/ brainstorm files"
  ```

---

## Task 2: Fiks RTL-hack

**Filer:**
- Modify: `public/mockup-eleos.html`

Den nåværende koden bruker `direction: rtl` for å snu kolonnerekkefølge i den andre feature-seksjonen. Dette er en CSS-hack som kan gi sideffekter.

- [ ] **Steg 1: Erstatt RTL-hack med CSS order**

  Finn i CSS:
  ```css
  .feature-inner.reverse { direction: rtl; }
  .feature-inner.reverse > * { direction: ltr; }
  ```

  Erstatt med:
  ```css
  .feature-inner.reverse .feature-text { order: 2; }
  .feature-inner.reverse .feature-cards { order: 1; }
  ```

  Og legg til `display: flex` + `flex-wrap: wrap` på `.feature-inner` slik at `order` fungerer:
  ```css
  .feature-inner {
    max-width: 1100px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 80px; align-items: center;
  }
  ```

  **Erstatt** hele `.feature-inner`-regelen (grid fungerer ikke med `order`) med:
  ```css
  /* ERSTATT eksisterende .feature-inner med denne: */
  .feature-inner {
    max-width: 1100px; margin: 0 auto;
    display: flex; flex-wrap: wrap;
    gap: 80px; align-items: center;
  }
  .feature-inner > * { flex: 1 1 420px; }
  ```

- [ ] **Steg 2: Sjekk visuelt**

  Åpne `http://localhost:3000/mockup-eleos.html`. Feature-seksjon 1 og 2 skal ha samme layout (tekst til venstre, kort til høyre), eller bytte side hvis det er en `.reverse`-seksjon. (I nåværende mockup finnes det kun én feature-seksjon — kontrollen er at ingenting er ødelagt.)

- [ ] **Steg 3: Commit**
  ```bash
  git add public/mockup-eleos.html
  git commit -m "fix: replace direction:rtl hack with flexbox order"
  ```

---

## Task 3: Inline styles → CSS-klasser

**Filer:**
- Modify: `public/mockup-eleos.html`

Alle `style="..."`-attributter i HTML flyttes til navngitte CSS-klasser.

- [ ] **Steg 1: Identifiser og flytt inline styles**

  Finn disse i HTML og erstatt med CSS-klasser:

  | HTML (nå) | Ny klasse | CSS |
  |-----------|-----------|-----|
  | `style="width:fit-content; margin-top:8px"` på `<a>` i feature-seksjon | `.btn-feature-link` | `width: fit-content; margin-top: 8px;` |
  | `style="transition-delay:0.1s"` på `.feature-cards` | `.reveal-delay-1` | `transition-delay: 0.1s;` |
  | `style="transition-delay:0.08s"` på stat | `.reveal-delay-1` | (normalisert til 0.1s — visuelt ubetydelig) |
  | `style="transition-delay:0.16s"` | `.reveal-delay-2` | `transition-delay: 0.16s;` |
  | `style="transition-delay:0.24s"` | `.reveal-delay-3` | `transition-delay: 0.24s;` |
  | `style="transition-delay:0.1s"` på step | `.reveal-delay-1` | (gjenbruk) |
  | `style="transition-delay:0.2s"` på step | `.reveal-delay-2` | (gjenbruk) |
  | `style="transition-delay:0.12s"` på quote-metrics | `.reveal-delay-1` | (gjenbruk) |
  | `style="text-align:center"` på `h2` i how/compliance | `.text-center` | `text-align: center;` |
  | `style="color:var(--secondary)"` på eyebrow i you-care | Fjern inline — legg til `.eyebrow-light` klasse | `color: var(--teal-light);` (gull er fjernet) |
  | `style="font-size:15px;padding:12px 28px;margin-top:8px"` på CTA-knapp | `.btn-pill-lg` | `font-size: 15px; padding: 12px 28px; margin-top: 8px;` |
  | `style="display:flex;gap:8px;..."` i ui-row for chips | `.chip-row` | `display: flex; gap: 8px; align-items: center; flex-wrap: wrap;` |

  Legg CSS-klassene til i `<style>`-blokken.

- [ ] **Steg 2: Sjekk visuelt**

  Siden skal se identisk ut som før. Ingen layout-endringer.

- [ ] **Steg 3: Commit**
  ```bash
  git add public/mockup-eleos.html
  git commit -m "refactor: move inline styles to CSS classes"
  ```

---

## Task 4: Koble opp nav-lenker

**Filer:**
- Modify: `public/mockup-eleos.html`

- [ ] **Steg 1: Oppdater lenker i nav og CTA**

  | Element | Nåværende | Nytt |
  |---------|-----------|------|
  | "Logg inn" i nav | `href="#"` | `href="/login.html"` |
  | "Be om demo" (nav) | `href="#"` | `href="#kontakt"` |
  | "Les mer" (hero) | `href="#"` | `href="#hvordan"` |
  | "Snakk med en ekspert" (hero) | `href="#"` | `href="#kontakt"` |
  | "Se plattformen →" (feature) | `href="#"` | `href="/cases.html"` (krever innlogging) |
  | "Be om demo" (CTA-seksjon) | `href="#"` | `href="#kontakt"` |
  | Nav-lenker (Plattform, Hvem vi hjelper etc.) | `href="#"` | Behold som `href="#"` inntil sider finnes |

- [ ] **Steg 2: Legg til id-ankre der de mangler**

  - `<section class="how"` → legg til `id="hvordan"`
  - `<footer>` — legg til en enkel kontaktseksjon over footer med `id="kontakt"`:
    ```html
    <section id="kontakt" class="you-care">
      <!-- allerede eksisterende you-care-seksjon — bare legg id på denne -->
    </section>
    ```
    (Flytt `id="kontakt"` til `<section class="you-care">`)

- [ ] **Steg 3: Sjekk at Logg inn og ankre virker**

  - Klikk "Logg inn" → skal navigere til `/login.html`
  - Klikk "Be om demo" → siden skal scrolle til you-care-seksjonen

- [ ] **Steg 4: Commit**
  ```bash
  git add public/mockup-eleos.html
  git commit -m "fix: connect nav links to actual destinations"
  ```

---

## Task 5: Erstatt index.html

**Filer:**
- Replace: `public/index.html` (fullstendig overskriving)

- [ ] **Steg 1: Kopier mockup-eleos.html til index.html**

  ```bash
  cp public/mockup-eleos.html public/index.html
  ```

- [ ] **Steg 2: Oppdater `<title>`**

  I `index.html`, endre:
  ```html
  <title>Sana AI – AI-assistert klagesaksbehandling</title>
  ```
  til:
  ```html
  <title>Sana AI – AI-assistert klagesaksbehandling for norsk helseforsikring</title>
  ```

- [ ] **Steg 3: Kjør CSP-audit**

  ```bash
  # Sjekk at ingen inline event handlers er i filen
  grep -n "on[a-z]*=" public/index.html
  ```
  Forventet output: ingen treff (eller kun data-attributter som `data-choice=`).

- [ ] **Steg 4: Sjekk visuelt på localhost**

  Åpne `http://localhost:3000/` — skal se identisk ut med `/mockup-eleos.html`.

- [ ] **Steg 5: Commit**
  ```bash
  git add public/index.html
  git commit -m "feat: replace landing page with eleos design"
  ```

---

## Ferdigsjekkliste

- [ ] `tsc --noEmit` passerer (ingen TypeScript-feil)
- [ ] Ingen inline `style="..."` igjen i `index.html`
- [ ] Ingen `direction: rtl` i `index.html`
- [ ] "Logg inn" peker til `/login.html`
- [ ] `.superpowers/` er i `.gitignore`
- [ ] Visuell sjekk på desktop (1280px+)
