# Testcaser – Journalanalyse

Syntetiske, anonymiserte testcaser for manuell testing av Sana AI journalanalyse.
**Alle data er fiktive. Ingen ekte pasientdata.**

## Innlogging (testbruker)
- **URL:** http://sana-ai.eu-north-1.elasticbeanstalk.com/journal.html
- **E-post:** demo@sana-ai.no
- **Passord:** demo1234

---

## Krav til dokumenter i en komplett test

En reell sak skal alltid inneholde disse fire dokumenttypene:

| Dokument | Beskrivelse | Last opp som |
|----------|-------------|--------------|
| **Pasientjournal** | Konsultasjonsnotater, diagnoser, sykemeldinger fra fastlege og spesialister | Pasientjournal |
| **NAV-mappe** | Ytelseshistorikk, sykepengegrunnlag, AAP-vedtak, arbeidsevnevurdering | NAV-mappe |
| **Mandat** | Oppdragsbrev fra forsikringsselskapet med konkrete spørsmål til rådgivende lege | Mandat |
| **Legeerklæring** | Spesialistuttalelse, epikrise eller erklæring til forsikring/NAV | Legeerklæring |

Dersom alle dokumenter er samlet i én PDF, bruk feltet **Samlet PDF** istedenfor.

---

## Case 1 – WAD-sak med fullt dokumentsett (enkel)
**Filer (last opp hver for seg):**
- `case-01-journal.txt` → Pasientjournal
- `case-01-nav.txt` → NAV-mappe
- `case-01-mandat.txt` → Mandat
- `case-01-legeerklaring.txt` → Legeerklæring

**Klinisk scenario:**
38 år gammel kontorarbeider. Nakkeslengskade (WAD II) etter trafikkulykke april 2022.
Nevrologisk utredet – ingen nevrologiske utfall. 6 måneder sykemelding, tilbake i full jobb.
If Skadeforsikring ber om VMI-vurdering, årsakssammenheng og arbeidsuførhetsgrad.

**Forventet output fra systemet:**
- VMI: 7–10% (WAD II, 1997-tabellen)
- Årsakssammenheng: Sannsynliggjort
- Arbeidsuførhet: Midlertidig 6 mnd, ingen varig
- Arbeidsskade: Nei

> Klar PDF-versjon: `test-enkel.pdf` (kun journal, for rask test av grensesnittet)

---

## Case 2 – Kneskade med arbeidsskadekrav (middels)
**Fil:** `case-02-kneskade-arbeidsskade.txt` → Samlet PDF
*(Inneholder journal, NAV-mappe og legeerklæring i én fil)*

**Klinisk scenario:**
44 år gammel rørlegger. Komplett ACL-ruptur etter fall fra stige på jobb.
Operert, rehabilitert, kan ikke returnere til rørleggeryrket. Yrkesskade godkjent av NAV.

**Forventet output:**
- VMI: 10–15% (ACL-rekonstruksjon)
- Arbeidsskade: Ja (dokumentert)
- Uføregrad i eget yrke: Høy

---

## Case 3 – PTSD + rygg + pasientskade med mandat (tung)
**Fil:** `case-03-ptsd-komplex-med-mandat.txt` → Samlet PDF
*(Inneholder mandat øverst + journal + NAV + legeerklæring)*

**Klinisk scenario:**
52 år gammel intensivsykepleier. Tre overlappende hendelser: voldsepisode på jobb (PTSD),
arbeidsulykke (ryggprolaps), og komplikasjon etter ryggoperasjon (mulig pasientskade/NPE).
If Skadeforsikring stiller 5 konkrete spørsmål i mandatet.

**Forventet output:**
- Systemet oppdager mandat og svarer direkte og nummert på spørsmålene
- VMI samlet: 30–45%
- NPE-grunnlag: Mulig

---

## Case 4 – Barnesak, fødselsskade, NPE (svært tung)
**Fil:** `case-04-barn-hodeskade-npe.txt` → Samlet PDF

**Klinisk scenario:**
Gutt 8 år. Cerebral parese etter asfyksi under fødsel (forsinkelse i intervensjon).
NPE-sak anerkjent. Erstatningskrav ca. 44 millioner kr. Barnetabell gjelder.

**Forventet output:**
- Barnetabell: VMI 80–95%
- NPE-grunnlag: Anerkjent
- Erstatningssum: Svært høy

---

## Filformat
Sana AI støtter **.pdf**, **.docx** og **.txt** (etter siste oppdatering).
