---
name: helseforsikring-ekspertpanel
description: Use when analyzing what features give value to a health insurance company, what makes advisory doctors' work easier, or what would make insurers want to buy a medical AI tool like sana-ai.
---

# Helseforsikring Ekspertpanel

## Oversikt

Aktiver et tverrfaglig ekspertpanel på 8 spesialister. Analyser helseforsikriingsverdi fra alle perspektiver og syntetiser til konkrete funksjonsanbefalinger, prioriteringer og salgsargumenter.

**Kontekst:** Norske helseforsikringsselskaper (If, Storebrand, Gjensidige, Codan, Vertikal Helseassistanse) håndterer invaliditets- og ulykkesforsikringskrav der rådgivende leger må vurdere medisinske journaler og gi faglige anbefalinger om dekning. Prosessen er i dag manuell, tidkrevende og inkonsistent.

---

## Ekspertpanelet — Alle 8 må uttale seg

---

### 1. Kari Lunde — Rådgivende lege (15 år, If Forsikring)
**Rolle:** Vurderer 25–40 saker per uke. Leser journaler, epikriser, røntgensvar, NAV-dokumenter og spesialistvurderinger. Gir faglig anbefaling om dekning, avslag eller ytterligere utredning.

**Typisk saksflyt:**
1. Mottar dokumentpakke (ofte 50–200 sider PDF)
2. Leser gjennom for å finne relevant medisinsk historikk
3. Identifiserer pre-eksisterende tilstander som kan påvirke dekning
4. Vurderer om skaden/sykdommen er dekningsmessig etter vilkårene
5. Skriver faglig notat til skadebehandler
6. Svarer på klager og tilleggsspørsmål

**Tidstyvene (det hun hater mest):**
- Lete etter kronologi i ustrukturerte journaler
- Finne hvilke diagnosekoder som er relevante for akkurat dette kravet
- Skrive samme type begrunnelse om og om igjen (WAD II, meniskskade, psykisk lidelse)
- Usikkerhet på om hun har lest *alle* relevante dokumenter
- Manglende sammenheng mellom pasientens egne utsagn og journalnotater
- Komplekse fleresykelighetstilfeller der alt henger i hop

**Hva hun vil ha:**
- Kronologisk medisinsk tidslinje automatisk generert
- Flagging: "Denne journalen nevner ryggplager fra 2019 — relevant for kravet?"
- Utkast til faglig notat hun kan redigere, ikke skrive fra bunnen
- Varsling om inkonsistens: pasienten sier én ting, journalen sier noe annet
- Oversikt over relevante ICD-10-koder og hva de betyr for dette forsikringsvilkåret

---

### 2. Henrik Moe — Skadebehandler (forsikringsselskap, ikke medisinsk utdannet)
**Rolle:** Mottar krav, koordinerer dokumentinnsamling, sender til rådgivende lege, kommuniserer med kunde.

**Tidstyvene:**
- Manuelt sjekke om alle dokumenter er kommet inn
- Purre på sykehus og fastleger som er treige
- Forklare kunden hva som mangler og hvorfor
- Ikke vite om saken er hos rådgivende lege, i kø eller ferdigbehandlet

**Hva han vil ha:**
- Automatisk "hva mangler?"-analyse ved dokumentopplasting
- Status-dashboard: sak X er i steg 3 av 6
- Standardiserte meldinger til kunde om status og mangler
- Estimert behandlingstid basert på sakskompleksitet

---

### 3. Dr. Bjørn Strand — Medisinsk fagsjef (forsikringsselskapet)
**Rolle:** Ansvarlig for faglig kvalitet, konsistens og utvikling av interne retningslinjer.

**Hodepinene:**
- Rådgivende leger tar ulike beslutninger i liknende saker (inkonsistens)
- Vanskelig å gjøre internrevisjoner uten å lese alle saker selv
- Opplæring av nye rådgivende leger er tidkrevende
- Klagenemnda overprøver for ofte = for mange feil

**Hva han vil ha:**
- Konsistensrapport: sammenlign beslutninger mellom rådgivende leger
- Anonymisert "liknende saker"-funksjon: "I 78% av WAD II-saker ble X besluttet"
- Søkbar beslutningsdatabase internt
- Opplæringsgrunnlag: nye rådgivende leger kan se hva erfarne besluttet og hvorfor

---

### 4. Marianne Krog — Compliance og juridisk (forsikringsselskapet)
**Rolle:** Sikrer at selskapet følger GDPR, helsepersonelloven, forsikringsavtaleloven og bransjestandarder.

**Risikoer hun ser:**
- Journaldata er særkategori GDPR — krever strengt samtykke og behandlingsgrunnlag
- AI-beslutninger i forsikring er under lupen i EU AI Act (high-risk system)
- Avslag uten tilstrekkelig begrunnelse = klagerisiko
- Logging: hvem har sett hvilken sak og når — sporbarhet
- Pasienten har rett til innsyn og forklaring (§ 22 i personopplysningsloven)

**Hva hun vil ha:**
- Full audit log: hvem åpnet sak X, når, hva ble besluttet, med hvilken begrunnelse
- Forklarbar AI: systemet foreslår — legen beslutter og signerer
- Automatisk sletting etter arkivfrist (5–10 år avhengig av type)
- Databehandleravtale-maler og DPIA-dokumentasjon ferdig utarbeidet
- Rollebasert tilgang: skadebehandler ser ikke full journal

---

### 5. Sofie Andersen — Pasient/forsikringstaker (38 år, WAD II-krav)
**Situasjon:** Venter på svar etter whiplash-skade. Har sendt inn journaler, røntgen og legeerklæring. Vet ikke hva som skjer.

**Frustrasjoner:**
- Ventetid på 6–12 uker uten statusoppdatering
- Sendte inn journaler to ganger fordi "de kom ikke frem"
- Fikk avslag med vag medisinsk begrunnelse hun ikke forstår
- Vet ikke hva hun kan klage på eller hvordan

**Hva hun trenger:**
- Automatisk bekreftelse: "Vi har mottatt disse dokumentene, mangler X"
- Statusoppdatering underveis
- Avslagsbrev på forståelig norsk med konkret begrunnelse
- Klageveiledn: "Hvis du er uenig, kan du..."

---

### 6. Tor Helgesen — Helseøkonom (konsulentselskap)
**Perspektiv:** Kost/nytte for forsikringsselskapet.

**Tallene som betyr noe:**
- En rådgivende lege koster 1,5–2,2 MNOK/år inkl. sosiale kostnader
- Gjennomsnittlig behandlingstid per sak: 45–90 min (lesetid + notat)
- Et selskap med 10 000 krav/år og 4 rådgivende leger: ~8–12 MNOK/år i legelønnskost
- Klager og klagenemnd: ~15 000–30 000 kr per sak i interne kostnader
- Feil utbetaling (for mye): direktetap
- Feil avslag (for lite): klagekostnad + omdømmeskade

**ROI-beregning:**
- Hvis AI reduserer behandlingstid per sak med 40%: 3–5 MNOK spart/år for et middelsstort selskap
- Hvis klageandelen reduseres med 20%: ytterligere 500 000–1 MNOK spart
- Break-even på et SaaS-abonnement: typisk 6–18 måneder

**Hva han vil se i pitchen:**
- Konkret pilotdesign med målbare KPIer (tid per sak, klageandel, NPS)
- Referansekunder eller studier fra liknende markeder (UK, Sverige, Danmark)
- Pris per sak (per-use) eller abonnement — hva er forutsigbart?

---

### 7. Lise Bøe — Healthcare IT-arkitekt (forsikringsselskap)
**Perspektiv:** Skal godkjenne systemet for intern bruk. Ser på sikkerhet, integrasjon og drift.

**Kravlisten hennes:**
- Databehandling i Norge / EU (ikke USA-sky)
- SSO via Azure AD / Entra ID
- REST API for integrasjon med eksisterende sakssystem (Guidewire, in-house)
- FHIR-støtte for strukturerte helsedata (fremtidsrettet)
- ISO 27001 eller tilsvarende sertifisering
- SLA: 99,5% oppetid, maks 4t nedetid per år
- Penetrasjonstest-rapport tilgjengelig
- Mulighet for on-premise eller private cloud

**Hva som blokkerer innkjøp:**
- "Vi kan ikke ha journaldata på amerikanske servere"
- "Mangler SSO — IT vil ikke administrere separate brukere"
- "Ingen API = manuell kopiering = ny feilkilde"

---

### 8. Pål Rønning — Salg og produktsjef (helseforsikring)
**Perspektiv:** Hva selger dette? Hva er pitchen til forsikringsselskapet?

**Kjøpskriterier han vet forsikringsselskaper bruker:**
- Dokumenterbar ROI innen 12–24 måneder
- Compliance-trygghet (GDPR, AI Act) — ikke en ny risiko
- Kan presenteres som "legen bestemmer, AI hjelper" — ikke trussel mot rådgivende leger
- Referansekunder i Norden
- Pilotmulighet med lav inngangsterskel

**Det han vet IKKE selger:**
- "Vi bruker AI" — alle sier det nå
- Løfter uten målbare resultater
- Systemer som krever lang implementeringstid

**Pitch han vil ha:**
> "Sana-AI hjelper rådgivende leger lese journaler 40% raskere, genererer strukturerte fagnotater og gir full audit trail. Piloten vår hos [selskap] reduserte behandlingstid per sak fra 75 til 43 minutter. Legen bestemmer alltid — AI forbereder."

---

## Synteseramme

Etter at alle eksperter har analysert, kategoriser funn slik:

### A — Kjerneverdier (MÅ ha for å selge)
Funksjoner rådgivende leger og skadebehandlere trenger for å velge dette over manuell prosess.

### B — Differensiatorer (BØR ha for å vinne)
Funksjoner som gjør sana-ai bedre enn konkurrenter og manuell arbeidsflyt.

### C — Hygienefaktorer (FORUTSETNINGER for å kjøpe)
Sikkerhet, GDPR, audit log, SSO — uten disse avvises systemet i innkjøpsprosessen uansett.

### D — Fremtidsmuligheter (HAR POTENSIAL)
Funksjoner som krever mer data, regulatorisk avklaring eller modenhet i markedet.

---

## Prioritert funksjonsmatrise (startpunkt for diskusjon)

| Funksjon | Verdi | Kompleksitet | Prioritet |
|---|---|---|---|
| Automatisk medisinsk tidslinje | Svært høy | Middels | A |
| Utkast til faglig notat | Svært høy | Høy | A |
| "Hva mangler?" ved opplasting | Høy | Lav | A |
| ICD-10 flagging vs. vilkår | Høy | Middels | A |
| Full audit log | Høy | Lav | C |
| Inkonsistens-varsling | Høy | Middels | B |
| Liknende saker (anonymisert) | Middels | Høy | B |
| Status-dashboard for skadebehandler | Middels | Lav | A |
| Forklarbart AI-notat | Høy | Middels | C |
| Konsistensrapport for fagsjef | Middels | Middels | B |
| SSO / Azure AD | Høy | Middels | C |
| FHIR-støtte | Lav (nå) | Høy | D |
| Per-sak ROI-kalkulator | Middels | Lav | B |

---

## Topp 5 quick wins

1. **Kronologisk tidslinje** — parse alle dokumenter og lag én kronologisk oversikt over diagnoser, behandlinger og relevante hendelser. Sparer 20–30 min per sak.
2. **Dokumentkomplettsjekk** — ved opplasting: "mangler legeerklæring fra spesialist" basert på skadetype. Sparer mange runder med purring.
3. **Notatutkast** — strukturert faglig notat basert på analyse, klar til redigering og signering. Sparer 20–40 min per sak.
4. **Audit log** — logg alle handlinger automatisk. Kostnad: lav. Verdi for salg og compliance: svært høy.
5. **Status-dashboard** — enkel saksoversikt for skadebehandler. Reduserer interne statusspørsmål.

---

## Salgsargumenter (til forsikringsselskapet)

- **Effektivitet:** Rådgivende leger behandler 40% flere saker uten å jobbe mer
- **Kvalitet:** Færre oversette funn, mer konsistente beslutninger, lavere klageandel
- **Compliance:** Full sporbarhet, forklarbare beslutninger, GDPR-sertifisert
- **Risiko:** Legen bestemmer alltid — AI forbereder og kvalitetssikrer, erstatter ikke faglig skjønn
- **ROI:** Typisk break-even innen 12 måneder for selskaper med 3+ rådgivende leger

---

## Outputformat

Presenter alltid analysen slik:
1. **Ekspertoppsummering** — ett avsnitt per ekspert med deres viktigste innsikt
2. **Funksjonsmatrise** med A/B/C/D-kategorier
3. **Topp 5 quick wins** — lav kompleksitet, høy verdi
4. **Salgsargumenter** — 3–5 setninger forsikringsselskapet vil høre
5. **Neste steg** — hva bør bygges eller undersøkes videre
