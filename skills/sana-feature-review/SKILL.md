---
name: sana-feature-review
description: Use when designing or implementing any new feature in Sana AI — runs a two-phase compliance gate covering GDPR Art. 9, EU AI Act high-risk, PII leakage, audit log, and explainability requirements.
---

# Sana Feature Review

## Oversikt

To-fase compliance-gate for Sana AI. Kjøres to ganger: én gang ved konsept (før koding), én gang ved kode-review (etter implementasjon).

**Oppgi kontekst:**
- Hva featuren gjør
- Hvilke data den berører
- Hvem som bruker den (rådgivende lege / skadebehandler / fagsjef / pasient)

---

## Kritisk bakgrunn — kjente åpne gaps i Sana AI

Disse er **ikke løst** og påvirker vurderingen av nye features:

| Gap | Status | Konsekvens |
|---|---|---|
| DPA med AWS ikke signert | Åpen | Art. 9-data behandles uten formell avtale |
| DPIA ikke gjennomført | Åpen | Obligatorisk før produksjon |
| Rettslig grunnlag Art. 9 uavklart | Åpen | Blokkerer lovlig behandling |
| Informasjonsplikt til pasient (Art. 13/14, AI Act Art. 50) | Åpen | Mangler implementasjon |
| EU AI Act høyrisiko-klassifisering | Uavklart | Krever konformitetsvurdering |
| cases.json ukryptert på disk | Åpen | Data at rest ikke beskyttet |

Ny feature som **utvider eksponering** på et åpent gap = eksplisitt advarsel i output.

---

## Fase 1 — Konsept-sjekk (før koding)

Kjør disse 6 spørsmålene. Svar Ja/Nei/Usikker per punkt.

**1. Art. 9-data**
Behandler featuren helseopplysninger, diagnoser, behandlingshistorikk eller andre særkategori-data?
→ Ja: krever eksplisitt rettslig grunnlag (Art. 9(2)) — er dette avklart?

**2. Nytt behandlingsgrunnlag**
Introduserer featuren en ny *type* behandling av persondata som ikke allerede er dekket av eksisterende grunnlag?
→ Ja: stopp — avklar juridisk grunnlag før koding starter.

**3. DPIA-scope**
Utvider featuren omfanget av automatisert behandling av sensitive data eller profilering?
→ Ja: notér at DPIA må oppdateres (allerede åpen gap — ikke utsett ytterligere).

**4. EU AI Act**
Øker featuren systemets autonomi i beslutninger som påvirker forsikringsdekning?
→ Ja: høyrisiko-eksponeringen øker — vurder om konformitetsvurdering fremskyndes.

**5. Informasjonsplikt**
Behandler featuren data om pasienter som ikke er direkte brukere av systemet?
→ Ja: sjekk om Art. 13/14 og AI Act Art. 50 (transparens) krever ny varsling.

**6. Minimum nødvendig data**
Samler featuren mer data enn strengt nødvendig for formålet?
→ Ja: skjær ned til minimum før koding.

**Fase 1-output:**
- ✅ Grønn: ingen nye gaps, trygt å kode
- ⚠️ Gul: avklaringer anbefalt, men ikke blokkerende
- 🔴 Rød: juridisk avklaring kreves før koding

---

## Fase 2 — Kode-sjekk (etter implementasjon)

Gå gjennom koden og svar på hvert punkt.

**PII og datahåndtering**
- [ ] Alle nye datapunkter som kan inneholde PII går gjennom eksisterende scrubber
- [ ] Ingen helseopplysninger logges i klartekst (CloudWatch, konsoll, filer)
- [ ] Data minimeres — bare nødvendig info sendes til Bedrock/Claude
- [ ] Ingen nye ukrypterte lagringspunkter (jf. cases.json-gap)

**Audit log**
- [ ] Alle nye brukerhandlinger logges til CloudWatch med bruker-ID, timestamp og handling
- [ ] Logg er uforanderlig (append-only, ingen slette-API)
- [ ] Sensitive feltverdier logges ikke — kun at handlingen skjedde

**Tilgangskontroll**
- [ ] Rollebasert tilgang er verifisert: skadebehandler ser ikke full journal
- [ ] Ny funksjonalitet krever gyldig JWT — ingen uautentiserte endepunkter
- [ ] Autorisasjonslogikk valideres server-side, ikke bare i frontend

**Forklarbarhet**
- [ ] AI-output presenterer funn og resonnement — ikke bare konklusjon
- [ ] Legen kan se hva systemet baserte analysen på
- [ ] Systemet markerer eksplisitt når det er usikkert

**Informasjonsplikt**
- [ ] Hvis featuren eksponerer ny AI-funksjonalitet mot pasientdata: er Art. 50 AI Act-varsling dekket?

**Fase 2-output:**
- ✅ Grønn: alle punkter OK
- ⚠️ Gul: mindre punkter mangler, notér som tech debt
- 🔴 Rød: blokkerende funn — ikke merge før løst

---

## Anbefalingsformat

Avslutt alltid med:

**Fase [1/2] — [Grønn/Gul/Rød]**

> Kort begrunnelse (1–2 setninger).

**Åpne punkter:**
- Punkt 1
- Punkt 2

**Neste steg:** Maks 2 konkrete handlinger.
