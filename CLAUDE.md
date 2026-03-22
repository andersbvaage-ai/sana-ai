# Sana AI — Prosjektinstruksjoner

## Hva er dette

AI-drevet klagesak-analyseverktøy for helsesektoren. Lege laster opp dokumenter → PII-scrubbing → AI analyserer → lege godkjenner og eksporterer PDF.

**Produksjon:** http://sana-ai.eu-north-1.elasticbeanstalk.com
**Brukere:** anders.bvaage@gmail.com · demo@sana-ai.no (demo1234)

---

## Arkitektur

```
src/
  app.ts                        — Express-app, middleware-oppsett
  server.ts                     — inngangspunkt
  config/                       — env-vars og typer
  middleware/                   — authenticate, requireAuth, rateLimit, killSwitch
  routes/                       — admin, auth, cases, contact, content, export, stats, summarize
  services/
    ai/                         — bedrockClient.ts (AWS Bedrock, Claude Sonnet, eu-north-1)
    auth/                       — userStore, tokenValidator, behandlerVerifier
    cases/                      — caseStore (S3), caseAnalyzer, extractText
    content/                    — contentStore (S3-backed, in-memory cache)
    scrubbing/                  — inputScrubber (PII-fjerning før AI)
    pdf/                        — parsePdf.mjs
public/
  index.html                    — landingsside
  hero-demo.js                  — animert 3-fase demo loop i hero (upload → analyzing → results)
  login.html / login.js         — innlogging
  cases.html / cases.js         — klagesak-verktøyet
  stats.html / stats.js         — statistikkpanel
  content-admin.html            — CMS-admin
  landing-content.js            — henter og appliserer CMS-innhold via data-lc-attributter
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

## Deploy-prosess (produksjon)

```bash
# 1. Build og push Docker-image
docker build --no-cache -t sana-ai .
docker tag sana-ai 480437358794.dkr.ecr.eu-north-1.amazonaws.com/sana-ai:latest
docker push 480437358794.dkr.ecr.eu-north-1.amazonaws.com/sana-ai:latest

# 2. Pakk og last opp til S3
powershell Compress-Archive -Path Dockerrun.aws.json -DestinationPath deploy.zip -Force
aws s3 cp deploy.zip s3://sana-ai-eb-deployments-480437358794/deploy-vXX.zip

# 3. Deploy til Elastic Beanstalk
aws elasticbeanstalk create-application-version --application-name sana-ai --version-label vXX --source-bundle S3Bucket=sana-ai-eb-deployments-480437358794,S3Key=deploy-vXX.zip
aws elasticbeanstalk update-environment --environment-name sana-ai-prod --version-label vXX
```

**AWS-ressurser (eu-north-1):**
- EB environment: `sana-ai-prod`
- ECR: `480437358794.dkr.ecr.eu-north-1.amazonaws.com/sana-ai`
- S3 saker: `sana-ai-cases-480437358794`
- S3 deploys: `sana-ai-eb-deployments-480437358794`
- IAM-bruker: `sana-ai-dev`
- Audit-logger: stdout → CloudWatch (`AUDIT_BACKEND=cloudwatch`)

---

## Klar for produksjon

Før deploy — gå gjennom denne listen:

- [ ] `tsc --noEmit` passerer
- [ ] `/csp-audit` kjørt på alle endrede HTML-filer
- [ ] `docker build` lokalt uten feil
- [ ] Deploy-sekvens fra deploy-prosess-seksjonen over kjørt

---

## GitHub

Repo: https://github.com/andersbvaage-ai/sana-ai (privat)
Inviter Morten som collaborator når GitHub-brukernavn er kjent.

**OBS:** AWS-nøkler i `.env` bør roteres — filen har ligget på Dropbox.

---

## Landingsside — designretning

Valgt retning: **Eleos/lys** — implementert i `index.html`.
- System font stack (ikke Google Fonts)
- Lys hero (hvit bakgrunn, mørk tekst)
- Teal pill-knapper (`#93C7C7`)
- Pastell feature-cards
- Nav: kremfarget (`#f7f5e7`)

**Felles infrastruktur:**
- `public/site.css` — delte stiler (nav, footer, knapper, tokens, reveal-animasjoner)
- `public/site.js` — rendrer nav + footer dynamisk, hamburger-meny, IntersectionObserver
- Alle nye HTML-sider linker til disse — legg til `<link rel="stylesheet" href="/site.css">` og `<script src="/site.js"></script>` på nye sider.

**Sidestruktur:**
- `index.html` — forside
- `plattform.html` — produktside
- `sikkerhet.html` — compliance
- `om-oss.html` — team og visjon
- `kontakt.html` — kontaktskjema (erstatter modal, bruker `/api/contact`)

---

## Gjenstående oppgaver

- [ ] **Roter AWS-nøkler** i IAM (nøkler lå i .env på Dropbox)
- [x] **Journal AI-integrasjon** — ferdig og merget til master via PR #1
- [x] Inviter Morten til GitHub-repo (gjort)
- [x] Bestem landingsside-retning — valgt Eleos/lys
- [x] Mobiltest av landingsside — mobilnav implementert
- [x] Landingsside hero-redesign — Eleos-stil, animert demo, metrics-strip, pill-badges (v28b)
- [ ] E-post ved ny kontakthenvendelse (AWS SES)
- [ ] AWS Secrets Manager for miljøvariabler (lav prioritet)
- [ ] `/csp-audit` på alle nye HTML-filer før deploy

**Juridisk (blokkerer reell bruk):**
- [ ] DPA med AWS
- [ ] DPIA (Datatilsynet)
- [ ] Rettslig grunnlag for Art. 9-data
- [ ] Advokatgjennomgang av `docs/personvern-systemdokumentasjon.docx`
