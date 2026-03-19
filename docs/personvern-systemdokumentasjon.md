# Personverngrunnlag og systemdokumentasjon
## Sana AI – Klagesak-analyse

**Versjon:** 0.1 (utkast for juridisk vurdering)
**Dato:** 2026-03-13
**Status:** Ikke ferdigstilt – krever advokatvurdering før produksjonssetting

---

## 1. Systembeskrivelse

### Formål
Sana AI er et internt analyseverktøy for helseforsikringsselskaper. Formålet er å bistå leger i å prioritere og vurdere innkomne klagesaker ved å bruke en AI-modell til å generere et strukturert sammendrag, standpunkt og prioritetsscore.

AI-analysen er et **beslutningsstøtteverktøy** — all endelig vurdering gjøres av en lege. Ingen vedtak fattes automatisk.

### Aktører
| Rolle | Beskrivelse |
|---|---|
| Behandlingsansvarlig | [Forsikringsselskap – navn fylles inn] |
| Databehandler (AI) | Amazon Web Services EMEA SARL (Bedrock) |
| Sluttbruker | Lege/saksbehandler ansatt hos behandlingsansvarlig |
| Registrert | Klageren (forsikringstaker eller pasient) |

---

## 2. Dataflyt

```
Klagedokument (PDF/Word)
        │
        ▼
[1] Opplasting til intern server (Node.js/Express)
        │
        ▼
[2] Tekstekstraksjon (lokal, ingen ekstern sending)
        │
        ▼
[3] PII-scrubbing (lokal)
    – Fødselsnummer (11 siffer)
    – Telefonnummer
    – E-postadresse
    – Gateadresse
        │
        ▼
[4] Scrubbet tekst sendes til Amazon Bedrock
    – Region: eu-north-1 (Stockholm, Sverige)
    – Modell: Claude Sonnet 4.6 via cross-region inference
    – Ingen lagring hos AWS (Zero data retention)
        │
        ▼
[5] AI-analyse returneres til intern server
        │
        ▼
[6] Analyse lagres i cases.json på intern server
    – Inkluderer: AI-sammendrag, standpunkt, prioritetsscore
    – Inkluderer IKKE: originaldokument eller rå dokumenttekst
        │
        ▼
[7] Lege gjennomgår og godkjenner/justerer
        │
        ▼
[8] Legevurdering lagres i cases.json
```

**Revisjonslogg:** Alle hendelser (opplasting, analyse, vurdering) logges til `audit.jsonl` med tidsstempel, saks-ID og utfall. Ingen personsensitiv innhold logges.

---

## 3. Kategorisering av data

### Data som behandles
| Datakategori | GDPR-kategori | Eksempler |
|---|---|---|
| Klagetekst fra forsikringstaker | Art. 9 – helseopplysninger | Diagnose, behandling, legeattester |
| Navn, adresse, kontaktinfo | Art. 6 – personopplysninger | Scrubbes før AI-sending |
| Fødselsnummer | Art. 9 / særlig sensitiv | Scrubbes alltid |
| AI-generert analyse | Avledet – Art. 9 ved tilknytning | Sammendrag av klagen |
| Legens vurdering og notater | Art. 9 | Lagres internt |

### Data som sendes til AWS Bedrock
Kun scrubbet klagetekst. Direkte identifikatorer (fnr, navn, telefon, e-post, adresse) er fjernet. Medisinsk innhold (diagnoser, behandlinger) **sendes** og er fortsatt å anse som helseopplysninger under Art. 9, selv uten direkte identifikasjon.

**⚠ Juridisk uavklart:** Om scrubbet helseopplysning uten direkte identifikator fortsatt krever Art. 9-grunnlag — dette er et sentralt spørsmål for advokatvurdering.

---

## 4. Rettslig grunnlag — kartlegging

| Behandlingsaktivitet | Foreslått grunnlag | Status |
|---|---|---|
| Motta og lagre klagedokument | Art. 6(1)(b) – kontraktsoppfyllelse | Sannsynlig OK |
| Ekstrahere og scrube tekst | Art. 6(1)(b) – kontraktsoppfyllelse | Sannsynlig OK |
| Sende til AI for analyse | **Uavklart** | ⚠ Krever vurdering |
| Lagre AI-analyse internt | Art. 6(1)(b) – kontraktsoppfyllelse | Sannsynlig OK |
| Revisjonslogging | Art. 6(1)(c) – rettslig forpliktelse | Sannsynlig OK |
| Legens vurdering og godkjenning | Art. 6(1)(b) – kontraktsoppfyllelse | Sannsynlig OK |

**Spørsmål til advokat:**
- Hvilket grunnlag etter Art. 9(2) kan benyttes for sending av (scrubbet) helseopplysning til en ekstern AI-modell?
- Er Art. 9(2)(f) (rettskrav) eller Art. 9(2)(h) (helse/omsorg) aktuelt for helseforsikringers behandling av klager?

---

## 5. Databehandleravtale (DPA) med AWS

- **Status:** [Ikke inngått / Inngått – dato fylles inn]
- AWS tilbyr standard GDPR DPA via AWS console ("AWS GDPR Data Processing Addendum")
- Tjeneste: Amazon Bedrock
- Region: eu-north-1
- AWS er sertifisert: ISO 27001, ISO 27017, ISO 27018, SOC 1/2/3

**Gjenstående tiltak:** Formell inngåelse og arkivering av DPA-dokument.

---

## 6. Risikovurdering

### Identifiserte risikoer

| Risiko | Sannsynlighet | Konsekvens | Tiltak innført | Gjenstår |
|---|---|---|---|---|
| CLOUD Act – US-myndigheters tilgang til AWS-data | Lav (men juridisk mulig) | Høy | DPA med AWS | Juridisk vurdering |
| Utilsiktet re-identifikasjon av scrubbet data | Lav | Høy | PII-scrubbing | Teknisk vurdering av scrubbing-kvalitet |
| Uautorisert tilgang til intern server | Middels | Høy | JWT-auth, kill-switch | Kryptering av lagring, tilgangskontroll |
| Ukryptert lagring (cases.json) | Høy (eksisterer) | Høy | Ingen per nå | Kryptering eller kryptert DB |
| AI-feil påvirker vedtak | Middels | Middels | Obligatorisk legevurdering | Evaluering av AI-nøyaktighet |
| Manglende informasjon til registrert | Høy (eksisterer) | Middels | Ingen per nå | Informasjonsplikt-tekst i klageprosess |

### Tiltak som er innført
- PII-scrubbing (fnr, telefon, e-post, adresse) før AI-sending
- JWT-autentisering for alle API-kall
- Revisjonslogg (JSONL) for alle hendelser
- Kill-switch for øyeblikkelig deaktivering av AI
- Rate limiting
- Menneskelig godkjenning av alle AI-anbefalinger
- Data behandles i EU/EØS (eu-north-1, Stockholm)

---

## 7. Dataminimering

**Spørsmål:** Kan formålet oppnås med mindre data sendt til AI?

Vurderte alternativer:
- Sende kun strukturerte metadata (diagnose-kode, behandlingstype) i stedet for fritekst → mulig, men krever strukturert input fra EPJ-system
- Lokal AI-modell (on-premise) → teknisk krevende, betydelig høyere kostnad
- Anonymisering utover PII-scrubbing → ville redusert analysekvalitet vesentlig

**Konklusjon (foreløpig):** Fritekst-sending er nødvendig for analysekvalitet, men dette bør bekreftes av advokat opp mot dataminimeringsprinsippet.

---

## 8. Informasjonsplikt til registrerte

**Status:** Ikke implementert.

Klagere er per i dag ikke informert om at klagen behandles med AI-assistanse. GDPR Art. 13/14 og EU AI Act Art. 50 krever slik informasjon.

**Forslag til tiltak:**
- Legg til setning i klagemottaks-bekreftelse: *"Klagen din kan bli analysert med AI-assistert verktøy som støtte for legens vurdering. AI-analysen er ikke bindende og godkjennes alltid av en lege."*

---

## 9. EU AI Act — foreløpig vurdering

Systemet kan falle inn under **høyrisiko-kategorien** (Annex III, punkt 5b: AI-systemer brukt i forsikring som påvirker tilgang til tjenester).

Konsekvenser ved høyrisiko-klassifisering:
- Teknisk dokumentasjon (delvis dekket av dette dokumentet)
- Risikovurdering (delvis dekket)
- Menneskelig tilsyn (innført ✅)
- Registrering i EU AI Act-database
- Samsvarsvurdering

**Spørsmål til advokat:** Faller helseforsikrings-klagebehandling inn under Annex III punkt 5b, eller er det andre unntak?

---

## 10. Åpne spørsmål for advokatvurdering

1. Hvilket Art. 9(2)-grunnlag kan benyttes for sending av scrubbet helseopplysning til ekstern AI?
2. Er CLOUD Act-risikoen akseptabel gitt eksisterende DPA, eller kreves det ytterligere tiltak?
3. Oppfyller scrubbing-tiltakene kravet til dataminimering, eller kreves sterkere anonymisering?
4. Klassifiseres systemet som høyrisiko under EU AI Act Annex III?
5. Hva er minimumsinnholdet i informasjonsplikten til klagerne?
6. Krever Normen spesifikk godkjenning av AWS Bedrock som leverandør?

---

*Dette dokumentet er et teknisk utkast utarbeidet som grunnlag for juridisk vurdering. Det er ikke en ferdig DPIA og erstatter ikke juridisk rådgivning.*
