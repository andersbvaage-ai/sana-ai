# Sana AI — Prosjektinstruksjoner

## Hva er dette

AI-drevet klagesak-analyseverktøy for helsesektoren. Lege laster opp dokumenter → PII-scrubbing → AI analyserer → lege godkjenner og eksporterer PDF.

**Produksjon:** http://sana-ai.eu-north-1.elasticbeanstalk.com
**Brukere:** anders.bvaage@gmail.com · demo@sana-ai.no (demo1234)

---

## Arkitektur

```
src/
  app.ts / server.ts
  config/
  middleware/             — authenticate, requireAuth, rateLimit, killSwitch
  routes/                — admin, auth, cases, contact, content, export, stats, summarize
  services/
    ai/                  — bedrockClient.ts (AWS Bedrock, Claude Sonnet, eu-north-1)
    auth/                — userStore, tokenValidator, behandlerVerifier
    cases/               — caseStore (S3), caseAnalyzer, extractText
    content/             — contentStore (S3-backed, in-memory cache)
    scrubbing/           — inputScrubber (PII-fjerning før AI)
    pdf/                 — parsePdf.mjs
public/
  index.html / hero-demo.js   — landingsside + animert demo-loop
  login.html / login.js
  cases.html / cases.js       — klagesak-verktøyet
  stats.html / stats.js
  content-admin.html
  landing-content.js          — henter CMS-innhold via data-lc-attributter
```

**Stack:** Node.js + TypeScript, Express, Helmet (CSP), AWS Bedrock, S3, Elastic Beanstalk, ECR, Docker

---

## Viktige constraints

**CSP (produksjon):** Helmet blokkerer inline event handlers. Alle event handlers må legges i JS-filer via `addEventListener` — aldri `onclick`/`onkeydown` inline i HTML.

**GDPR / Art. 9:** Applikasjonen håndterer helseopplysninger. PII-scrubbing skjer i `inputScrubber.ts` før data sendes til AI. Aldri log pasientdata, analyseinnhold, eller dokumenttekst.

**Autentisering:** JWT-sesjon (8t), bcrypt-passord. Brukere styres via `USERS_JSON` env-var (ikke i kode). `requireAuth`-middleware på alle beskyttede ruter.

---

## Designsystem

**Farger:** Fjord navy `#1B3A4B` · Gull `#B8935A` · Krem `#FAF8F4`
**Fonter:** Playfair Display (h1/h2, logo) · Inter (alt annet)
**Typografi-skala:** 11px labels/eyebrows · 14px kortbrødtekst · 16px kortoverskrifter (h3/h4) · 17px seksjonsinger · Playfair for h1/h2

**Gull-regel:** Gull brukes kun til section eyebrows og `em`-italic i hovedoverskrifter — ikke step-numbers, piler, bars, eller andre dekorative elementer.

**CSS-disiplin:** Labels, eyebrows og captions bruker samme CSS-klasse, skiller seg kun i farge. Inline `style`-overrides er et rødt flagg — konsolider til CSS-klasser.

---

## Landingsside — infrastruktur

- `public/site.css` — delte stiler (nav, footer, knapper, tokens, reveal-animasjoner)
- `public/site.js` — rendrer nav + footer dynamisk, hamburger-meny, IntersectionObserver
- Alle nye HTML-sider linker til disse: `<link rel="stylesheet" href="/site.css">` og `<script src="/site.js"></script>`

**Sider:** `index.html` · `plattform.html` · `sikkerhet.html` · `om-oss.html` · `kontakt.html`

---

## Deploy

Deploy kjøres automatisk via **AWS CodeBuild** (`buildspec.yml`). Trigger via AWS Console eller webhook.

**Manuell fallback:** Se `/deploy`-skill.

**AWS-ressurser (eu-north-1):**
- EB environment: `sana-ai-prod`
- ECR: `480437358794.dkr.ecr.eu-north-1.amazonaws.com/sana-ai`
- S3 saker: `sana-ai-cases-480437358794`
- S3 deploys: `sana-ai-eb-deployments-480437358794`
- IAM-bruker: `sana-ai-dev`
- Audit-logger: stdout → CloudWatch (`AUDIT_BACKEND=cloudwatch`)

---

## Klar for produksjon

- [ ] `tsc --noEmit` passerer
- [ ] `/csp-audit` kjørt på alle endrede HTML-filer
- [ ] `docker build` lokalt uten feil (eller trigger CodeBuild)

---

## Gjenstående oppgaver

- [ ] **Roter AWS-nøkler** i IAM (nøkler lå i .env på Dropbox)
- [ ] **Rekruttere rådgivende lege** for validering av verktøyet
- [ ] **Book forsikringsmøte** — If Forsikring er identifisert som første kandidat
- [ ] E-post ved ny kontakthenvendelse (AWS SES)
- [ ] AWS Secrets Manager for miljøvariabler (lav prioritet)

**Juridisk (blokkerer reell bruk):**
- [ ] DPA med AWS
- [ ] DPIA (Datatilsynet)
- [ ] Rettslig grunnlag for Art. 9-data
- [ ] Advokatgjennomgang av `docs/personvern-systemdokumentasjon.docx`
