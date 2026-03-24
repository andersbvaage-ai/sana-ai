# Sana AI — Compliance Register

> Sist oppdatert: 2026-03-24
> Dette er det interne levende dokumentet. For ekstern presentasjon: se `public/sikkerhet.html`.

---

## 1. Implementert — teknisk

| Tiltak | Implementert i | Status |
|--------|----------------|--------|
| Geografisk datakontroll (all behandling i EU) | AWS eu-north-1 (Bedrock, S3, EB) | ✅ |
| PII-scrubbing før AI-sending | `src/services/scrubbing/legacyScrubber.ts`, `norwegianScrubber.ts` | ✅ |
| JWT-autentisering (8t sesjon) | `src/middleware/authenticate.ts`, `src/services/auth/userStore.ts` | ✅ |
| Tilgangskontroll på alle beskyttede ruter | `src/middleware/requireAuth.ts` | ✅ |
| Rate limiting per bruker (30 req/t) | `src/middleware/rateLimit.ts` | ✅ |
| Input-sanitering før AI-kall | `src/services/scrubbing/inputScrubber.ts` | ✅ |
| Uforanderlig revisjonslogg | `src/logging/auditLogger.ts` → CloudWatch (`AUDIT_BACKEND=cloudwatch`) | ✅ |
| Secrets via env-vars (ingen hardkodede credentials) | `.env` / EB environment properties | ✅ |
| Kill-switch for øyeblikkelig deaktivering av AI | `src/middleware/killSwitch.ts` | ✅ |
| Menneskelig godkjenning av alle AI-anbefalinger | `public/cases.html` (UI) | ✅ |
| CSP-headers mot XSS | Helmet i `src/app.ts` | ✅ |
| bcrypt-passordhashing | `src/services/auth/userStore.ts` | ✅ |
| Zero data retention i Bedrock | AWS Bedrock standard — verifisert i docs | ✅ |
| Korrelasjonssporing på audit-hendelser | `src/middleware/authenticate.ts` | ✅ |

---

## 2. Juridiske krav — status

| Krav | Hjemmel | Status | Neste steg |
|------|---------|--------|------------|
| Databehandleravtale (DPA) med AWS | GDPR art. 28 | ❌ Ikke inngått | Signer via AWS Console (GDPR DPA Addendum) |
| DPIA — vurdering av personvernkonsekvenser | GDPR art. 35 | ❌ Ikke gjennomført | Bruk Datatilsynets mal + advokatbistand |
| Rettslig grunnlag for Art. 9-data | GDPR art. 9(2) | ❌ Uavklart | Advokatvurdering — se åpne spørsmål |
| Advokatgjennomgang av systemdokumentasjon | — | ❌ Ikke gjort | Send `docs/personvern-systemdokumentasjon.docx` til advokat |
| Informasjonsplikt til klagere om AI-bruk | GDPR art. 13/14, EU AI Act art. 50 | ❌ Ikke implementert | Legg til setning i klagebekreftelse |
| EU AI Act — konformitetsvurdering | EU AI Act Annex III | ❌ Ikke vurdert | Avklar høyrisiko-klassifisering med advokat |
| Normen — godkjenning av AWS Bedrock som leverandør | Normen § 5 | ⚠️ Uavklart | Sjekk Normens veiledning for skytjenester |
| Rettslig grunnlag for revisjonslogging | GDPR art. 6(1)(c) | ✅ Sannsynlig OK | Bekreftes ved advokatgjennomgang |
| Dokumentasjon av behandlingsaktiviteter (art. 30) | GDPR art. 30 | ⚠️ Delvis — systemdok finnes som utkast | Fullføres etter advokatgjennomgang |

---

## 3. Tekniske gaps — prioritert

### 🔴 Kritisk (bør fikses før reelle pasientdata)

| Gap | Beskrivelse | Kilde |
|-----|-------------|-------|
| AWS-nøkler ikke rotert | Nøkler lå i `.env` på Dropbox | audit 2026-03-23 |
| `__DEV__` plaintext-passord bypass | `userStore.ts` har dev-bypass som kan brukes i prod | audit 2026-03-23 |
| Admin-endepunkter kun statisk token | Ikke JWT — lavere sikkerhetsnivå enn resten | audit 2026-03-23 |
| `cases.json` lagrer data i klartekst | Sensitiv data ikke kryptert på disk — bør byttes til DB | todo-RTF 2026-03-14 |
| Ingen CSRF-beskyttelse | State-endrende kall kan trigges fra andre domener | audit 2026-03-23 |
| CORS ikke eksplisitt begrenset | Alle origins tillatt som standard | audit 2026-03-23 |
| Rate limit mangler på login og filopplasting | Kun generell rate limit implementert | audit 2026-03-23 |
| JWT lagret i localStorage | Bør flyttes til sessionStorage for å redusere XSS-risiko | audit 2026-03-23 |
| Ingen rollestyring lege vs. skadebehandler | Alle innloggede brukere har samme tilgang | todo-RTF 2026-03-14 |
| Feilmeldinger kan lekke intern info | Stack traces eller interne feilkoder kan eksponeres | audit 2026-03-23 |

### 🟡 Strategisk (innen 12 måneder)

| Gap | Beskrivelse | Referanse |
|-----|-------------|-----------|
| EU AI Act — formell risikovurdering | Sannsynlig høyrisiko-klassifisering (Annex III pkt. 5b) | EU AI Act |
| Uavhengig sikkerhetsrevisjon | Ingen ekstern OWASP Top 10-gjennomgang | Eleos-standarden |
| ISO 27001 / ISO 27799 | Ikke sertifisert — helsespesifikk (27799) er særlig relevant | ISO, Normen |
| AWS Secrets Manager | Secrets bør ut av `.env` og inn i Secrets Manager | IAM best practice |
| SSO / BankID-autentisering | Individuelle legekontoer via Azure AD eller BankID | todo-RTF, ekspertpanel |
| In-memory state multi-instans problem | Kill-switch og sesjoner fungerer ikke ved skalering | audit 2026-03-23 |
| Case store race condition | Samtidige oppdateringer kan gi datakonflikter | audit 2026-03-23 |
| Docker container kjører som root | Bør kjøre som ikke-privilegert bruker | audit 2026-03-23 |
| S3-bucket uten versjonering | Ingen gjenoppretting ved utilsiktet sletting | audit 2026-03-23 |
| Audit log uten HMAC-signaturkjede | Logger kan ikke bevise at de ikke er manipulert | audit 2026-03-23 |

### 🔵 Langsiktig (på radaren)

| Gap | Beskrivelse |
|-----|-------------|
| ISO 42001 | AI-spesifikk styringsstandard — relevant når vi skalerer |
| CISO-funksjon | Navngitt sikkerhetsansvarlig — dokumenteres i DPIA |
| SOC 2 / HITRUST | Kreves av større forsikringskunder |
| SAIL Framework | 70+ AI-spesifikke risikoer på tvers av 7 faser — vurder implementasjon |
| FHIR-støtte | Strukturerte helsedata for EPJ-integrasjon |

---

## 4. Åpne advokatspørsmål

Fra `docs/personvern-systemdokumentasjon.md` (versjon 0.1, 2026-03-13):

1. Hvilket Art. 9(2)-grunnlag kan benyttes for sending av scrubbet helseopplysning til ekstern AI? (Art. 9(2)(f) rettskrav? Art. 9(2)(h) helse/omsorg?)
2. Er CLOUD Act-risikoen akseptabel gitt eksisterende DPA, eller kreves ytterligere tiltak?
3. Oppfyller scrubbing-tiltakene kravet til dataminimering, eller kreves sterkere anonymisering?
4. Klassifiseres systemet som høyrisiko under EU AI Act Annex III pkt. 5b?
5. Hva er minimumsinnholdet i informasjonsplikten til klagerne?
6. Krever Normen spesifikk godkjenning av AWS Bedrock som leverandør?
7. Er AI-generert analyse (avledet fra helseopplysninger) selv å anse som Art. 9-data?
8. Kan Art. 6(1)(b) (kontraktsoppfyllelse) brukes som grunnlag for AI-analysen, eller kreves Art. 9?
9. Hva er arkivplikten for klagesaker og AI-analyser — og hvilken hjemmel gir rett til sletting?
10. Har forsikringsselskapet eget behandleransvar, eller er Sana AI behandlingsansvarlig overfor klagere?

---

## 5. Rammeverk-mapping

| Rammeverk | Relevans for Sana AI | Status |
|-----------|----------------------|--------|
| **GDPR Art. 9** | Helseopplysninger er særkategori — strengeste krav | ⚠️ Delvis — juridisk grunnlag uavklart |
| **GDPR Art. 28** | DPA med AWS som databehandler | ❌ Ikke signert |
| **GDPR Art. 35** | DPIA-plikt ved ny teknologi + særkategori | ❌ Ikke gjennomført |
| **EU AI Act Annex III** | Sannsynlig høyrisiko-AI (forsikring + helse) | ❌ Ikke vurdert |
| **Normen** | Bransjestandard i norsk helssektor | ⚠️ Delvis implementert |
| **OWASP Top 10** | Teknisk websikkerhet | ⚠️ Ikke eksternt revidert |
| **ISO 27001** | ISMS-sertifisering | ❌ Ikke sertifisert |
| **ISO 27799** | Helsespesifikk informasjonssikkerhet | ❌ Ikke implementert |
| **ISO 42001** | AI Management System | ❌ Langsiktig mål |
| **SAIL Framework** | AI-spesifikke risikoer (70+ på tvers av 7 faser) | ❌ Ikke vurdert |
| **HIA-prinsippene** | Risk-based, Transparency, Privacy, Responsibility, Equity | ⚠️ Prinsipielt fulgt, ikke formalisert |
| **METRIC Framework** | Datakvalitet for medisinsk AI | ❌ Ikke vurdert |

---

## 6. Roadmap

| Tiltak | Prioritet | Eier | Status |
|--------|-----------|------|--------|
| Roter AWS-nøkler i IAM | 🔴 Kritisk | Anders | ❌ Åpen |
| Fjern `__DEV__` passord-bypass | 🔴 Kritisk | Anders | ❌ Åpen |
| Send systemdokumentasjon til advokat | 🔴 Kritisk | Anders | ❌ Åpen |
| Signer DPA med AWS | 🔴 Kritisk | Anders | ❌ Åpen |
| Legg til AI-informasjon i klagebekreftelse | 🔴 Kritisk | Anders | ❌ Åpen |
| Sett CORS eksplisitt | 🟡 Høy | Anders | ❌ Åpen |
| Rate limit på login og filopplasting | 🟡 Høy | Anders | ❌ Åpen |
| Flytt JWT fra localStorage til sessionStorage | 🟡 Høy | Anders | ❌ Åpen |
| Krypter cases.json / bytt til DB | 🟡 Høy | Anders | ❌ Åpen |
| Gjennomfør DPIA | 🟡 Høy | Anders + advokat | ❌ Åpen |
| EU AI Act-vurdering med advokat | 🟡 Høy | Anders + advokat | ❌ Åpen |
| ISO 27001 self-assessment | 🔵 Strategisk | Anders | ❌ Åpen |
| Uavhengig OWASP-revisjon | 🔵 Strategisk | Ekstern | ❌ Åpen |
| AWS Secrets Manager | 🔵 Strategisk | Anders | ❌ Åpen |
| BankID / SSO-autentisering | 🔵 Strategisk | Anders | ❌ Åpen |

---

## Kilder og referanser

- `docs/personvern-systemdokumentasjon.md` — GDPR-utkast (v0.1, 2026-03-13)
- `docs/sikkerhet-status.md` — gap-analyse mot Eleos Health (2026-03-21)
- `docs/TheCareAtHomeExecutivesGuideToAISecurityAndPrivacy-Feb-2026.pdf` — Eleos kildedok
- `memory/audit_2026_03_23.md` — teknisk audit (2026-03-23)
- [Datatilsynets DPIA-veileder](https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/vurdering-av-personvernkonsekvenser-dpia/)
- [Normen](https://www.normen.no)
- [EU AI Act](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689) — Annex III
- [OWASP Top 10](https://owasp.org/Top10/)
