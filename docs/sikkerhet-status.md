# Sana AI — Sikkerhetsstatus og gap-analyse

> Utarbeidet 2026-03-21. Basert på gjennomgang av Eleos Health «Executive's Guide to AI Security & Privacy» (feb. 2026) sammenholdt med Sana AI-arkitekturen.

---

## Hva vi har i dag ✅

| Område | Tiltak | Implementert i |
|--------|--------|----------------|
| Geografisk datakontroll | All behandling i EU (AWS eu-north-1) | Bedrock, S3, EB |
| De-identifisering | PII fjernes lokalt før data når AI-modellen | `norwegianScrubber.ts`, `legacyScrubber.ts` |
| Autentisering | JWT-sesjon (8t), bcrypt-passord | `authenticate.ts`, `userStore.ts` |
| Tilgangskontroll | `requireAuth` på alle beskyttede ruter | `requireAuth.ts` |
| Rate limiting | Per bruker, per rute | `rateLimit.ts` |
| Input-validering | Sanitering av input før AI-kall | `inputScrubber.ts` |
| Revisjonslogg | Uforanderlig audit-log til CloudWatch | `auditLogger.ts`, `AUDIT_BACKEND=cloudwatch` |
| Hemmeligheter | Ingen hardkodede credentials — env-vars | `.env` / EB environment properties |
| Kill-switch | Nødbrems som deaktiverer AI-funksjonalitet | `killSwitch.ts` |
| Menneskelig tilsyn | Legen godkjenner alltid AI-standpunktet | `cases.html` / `journal.html` |
| CSP-headers | Helmet med strenge script-src-direktiver | `app.ts` |

---

## Hva vi mangler — prioritert

### Kritisk (blokkerer reell produksjonsbruk)

| Gap | Beskrivelse | Referanse |
|-----|-------------|-----------|
| **DPA med AWS** | Databehandleravtale med AWS er ikke signert. AWS behandler helseopplysninger på vegne av oss — dette er et krav etter GDPR art. 28. | GDPR art. 28, Normen |
| **DPIA** | Data Protection Impact Assessment er påkrevd ved behandling av helseopplysninger med ny teknologi (GDPR art. 35). Ikke gjennomført. | GDPR art. 35, Datatilsynet |
| **Rettslig grunnlag for Art. 9-data** | Behandling av helseopplysninger krever eksplisitt rettslig grunnlag (samtykke, nødvendighet, etc.). Ikke formelt etablert. | GDPR art. 9 |
| **Advokatgjennomgang** | Personvern-systemdokumentasjon (`docs/personvern-systemdokumentasjon.docx`) er ikke gjennomgått av juridisk rådgiver. | — |

### Strategisk (bør adresseres innen 12 måneder)

| Gap | Beskrivelse | Referanse |
|-----|-------------|-----------|
| **EU AI Act-vurdering** | Sana AI klassifiseres sannsynligvis som **høyrisiko-AI** (klinisk beslutningsstøtte, GDPR art. 9-data). Krever formell risikovurdering, transparensdokumentasjon og logging av AI-beslutninger med menneskelig tilsyn. EU AI Act gjelder direkte i Norge via EØS. | EU AI Act, vedlegg III |
| **Uavhengig sikkerhetsrevisjon** | Eleos gjennomfører årlig OWASP Top 10-revisjon av uavhengig tredjepart. Vi har ingen ekstern revisjon. | OWASP Top 10 |
| **ISO 27001 / ISO 27799** | Internasjonale standarder for informasjonssikkerhet og helsespesifikk sikkerhet. Ikke sertifisert, men prosessen kan starte med intern self-assessment. | ISO 27001, ISO 27799 |
| **AWS-nøkkelrotasjon** | AWS-nøkler har ligget i `.env` på Dropbox. Bør roteres og flyttes til AWS Secrets Manager. | IAM best practice |

### Langsiktig (ikke aktuelt nå, men på radaren)

| Gap | Beskrivelse |
|-----|-------------|
| **ISO 42001** | Ny AI-spesifikk styringsstandard (AI Management System). Eleos ser på dette som neste steg. Relevant når vi skalerer. |
| **CISO-funksjon** | Dedikert sikkerhetsansvar. Ikke realistisk for tidligfase, men bør dokumenteres som navngitt ansvar i DPIA og personverndokumentasjon. |
| **SOC 2 / HITRUST** | Tredjepartssertifiseringer som vil kreves av større forsikringskunder. Langsiktig mål. |

---

## Sammenligning med Eleos

Eleos er en moden aktør i USA (HIPAA-land). Direkte sammenligning er ikke rettferdig, men gir et nyttig bilde av retningen.

| Område | Eleos | Sana AI |
|--------|-------|---------|
| Data forlater ikke hjemmeregion | ✅ | ✅ |
| De-identifisering før AI | ✅ | ✅ |
| Autentisering + rate limiting | ✅ | ✅ |
| Uforanderlig revisjonslogg | ✅ | ✅ |
| Input-validering | ✅ | ✅ |
| Menneskelig tilsyn ved AI-beslutninger | ✅ | ✅ |
| DPA / BAA med skyleverandør | ✅ | ❌ |
| Formell risikovurdering (DPIA/SRA) | ✅ | ❌ |
| Uavhengig sikkerhetsrevisjon (OWASP) | ✅ | ❌ |
| AI Act / høyrisiko-vurdering | ⚠️ (HIPAA-land) | ❌ |
| ISO 27001 | ✅ | ❌ |

**Konklusjon:** Den tekniske arkitekturen er solid og på linje med Eleos. Hullene er juridiske og prosessuelle — ikke tekniske.

---

## Nøkkelreferanser

- GDPR art. 9 — særlige kategorier (helseopplysninger)
- GDPR art. 28 — databehandleravtale
- GDPR art. 35 — DPIA-plikt
- [Normen](https://www.normen.no) — Norm for informasjonssikkerhet og personvern i helse- og omsorgssektoren
- [EU AI Act](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689) — vedlegg III (høyrisiko-AI-systemer)
- [Datatilsynets DPIA-veileder](https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/vurdering-av-personvernkonsekvenser-dpia/)
- OWASP Top 10 — [owasp.org/Top10](https://owasp.org/Top10/)
- ISO 27001 / 27799 / 42001
