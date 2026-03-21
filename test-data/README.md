# Testcaser – Journalanalyse

Disse filene er syntetiske, anonymiserte testcaser for manuell testing av Sana AI journalanalyse.
**Alle data er fiktive. Ingen ekte pasientdata.**

## Innlogging (testbruker)
- URL: http://sana-ai.eu-north-1.elasticbeanstalk.com/journal.html
- E-post: demo@sana-ai.no
- Passord: demo1234

---

## Case 1 – Enkel WAD-sak (nakkeslengskade)
**Fil:** `case-enkel-WAD.txt`
**Last opp som:** Pasientjournal

Kort og klar sak. Rask å teste. Forventet output:
- VMI 5–10% (WAD II uten nevrologiske utfall)
- Årsakssammenheng klar
- Tilbake i arbeid → varig men begrenset uførhet

---

## Case 2 – Kneskade med arbeidsskadekrav
**Fil:** `case-02-kneskade-arbeidsskade.txt`
**Last opp som:** Pasientjournal

Kompleks arbeidsskadecase med ACL-ruptur, pre-eksisterende meniskforandringer og spørsmål om yrkesrettet attføring. Forventet output:
- VMI 10–15% (ACL-rekonstruksjon)
- Arbeidsskade: Ja (NAV har godkjent)
- Uføregrad: Trolig 50–100% i eget yrke

---

## Case 3 – PTSD + rygg + mulig pasientskade (med mandat)
**Fil:** `case-03-ptsd-komplex-med-mandat.txt`
**Last opp som:** Samlet PDF (inneholder mandat øverst)

Filen inneholder både mandattekst og journal. Systemet skal:
1. Oppdage mandatet
2. Svare direkte på de 5 spørsmålene
3. Bruke barnetabell der relevant

Forventet output:
- VMI PTSD: 20–25%
- VMI rygg + komplikasjoner: 15–25%
- Samlet VMI: 30–45%
- Pasientskade: Mulig (NPE-sak under behandling)

---

## Case 4 – Barnesak, hodeskade ved fødsel, NPE-krav
**Fil:** `case-04-barn-hodeskade-npe.txt`
**Last opp som:** Pasientjournal

Meget kompleks sak med cerebral parese etter fødselsskade, barnetabell, NPE-vedtak og stor erstatningssak. Forventet output:
- Barnetabell: VMI 80–95%
- NPE-grunnlag: Ja (anerkjent)
- Livslang omsorgsbehov
- Erstatningssum svært høy (forventningsavklaring)

---

## Filformat
Filene er `.txt`-format. Sana AI støtter PDF, Word (.docx) og tekstfiler (.txt).
