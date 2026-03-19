/**
 * Mock-pasienter med journalnotater.
 * Alle data er fiktive og generert for testformål.
 * Fødselsnummer og adresser er inkludert bevisst for å teste scrubbing-filteret.
 */

export interface MockPatient {
  id: string;             // pseudonymisert ID (det EPJ sender i tokenet)
  fnr: string;            // fødselsnummer – skal ALDRI sendes til AI (scrubbes)
  navn: string;           // fullt navn – scrubbes
  adresse: string;        // scrubbes
  parorende: string;      // scrubbes
  notes: MockNote[];
}

export interface MockNote {
  id: string;
  dato: string;
  type: string;
  innhold: string;        // inneholder bevisst fnr og navn for å teste scrubbing
}

export const MOCK_PATIENTS: MockPatient[] = [
  {
    id: 'PASIENT-A7F2',
    fnr: '00000000001',
    navn: 'Test Testesen',
    adresse: 'Testgata 1, 0001 Testby',
    parorende: 'Test Pårørende, tlf: 00000001',
    notes: [
      {
        id: 'NOTAT-001',
        dato: '2026-03-10',
        type: 'Poliklinisk konsultasjon',
        innhold: `Pasient: Test Testesen, fnr: 00000000001
Dato: 10. mars 2026
Lege: Dr. Andersen

Subjektivt:
Pasient møter til kontroll etter oppstart av metformin 500mg x2 for type 2 diabetes diagnostisert november 2025.
Rapporterer god etterlevelse. Noe kvalme første to uker, men dette har gått over. Kjenner seg ikke hypoglykemisk.
Fastende blodsukker hjemme: 6,8–8,2 mmol/L siste uke.

Objektivt:
Vekt: 84 kg (ned 1,2 kg siden sist). BT: 138/82 mmHg. Puls: 72 reg.
HbA1c: 58 mmol/mol (ned fra 71 ved forrige kontroll).
Kreatinin: 78 µmol/L. eGFR: 82 ml/min. Urin-albumin/kreatinin: 2,1 mg/mmol (normalt).

Vurdering og plan:
God metabolsk respons på metformin. Fortsetter nåværende dose.
Legger til kostholdsrådgivning. Neste kontroll om 3 måneder med ny HbA1c.
Vurdere tillegg av SGLT2-hemmer dersom HbA1c ikke under 53 ved neste kontroll.`,
      },
      {
        id: 'NOTAT-002',
        dato: '2026-02-15',
        type: 'Telefonkonsultasjon',
        innhold: `Pasient: Test Testesen, fnr: 00000000001
Ringde inn vedrørende bivirkning metformin. Kvalme og løs mage etter oppstart.
Rådet til å ta medisinen til mat. Ny kontroll som planlagt 10. mars.`,
      },
    ],
  },
  {
    id: 'PASIENT-B3D9',
    fnr: '00000000002',
    navn: 'Test Testesen2',
    adresse: 'Testgata 2, 0002 Testby',
    parorende: 'Test Pårørende2, tlf: 00000002',
    notes: [
      {
        id: 'NOTAT-003',
        dato: '2026-03-12',
        type: 'Akutt konsultasjon',
        innhold: `Pasient: Test Testesen2, fnr: 00000000002
Dato: 12. mars 2026

Innkomst:
68 år gammel mann innlegges med brystsmerter og tungpustenhet siden 3 timer.
Tidligere: hypertensjon, hyperlipidemi, røyker 10 sigaretter/dag.
Medikamenter: Lisinopril 10mg, Atorvastatin 40mg.

Klinisk funn:
Pasient er blek og svett. BT: 160/95 mmHg. Puls: 98, uregelmessig.
SpO2: 94% på luft. Respirasjonsfrekvens: 22/min.
Auskultasjon hjerte: uregelmessig rytme, ingen bilyder.
Auskultasjon lunger: krepitasjoner basalt bilateralt.

EKG: Atrieflimmer med hurtig ventrikkelrespons, ST-depresjon V4-V6.

Blodprøver: Troponin T: 0,08 µg/L (lett forhøyet). Pro-BNP: 1450 ng/L. CRP: 12 mg/L.

Tiltak:
Oksygen 2L/min på nesekataeter. Metoprolol 5mg IV x2. Heparin iv oppstart.
Innlagt kardiologisk avdeling for videre utredning og behandling.
Ekkokardiografi bestilt til i morgen.`,
      },
    ],
  },
  {
    id: 'PASIENT-C1E5',
    fnr: '00000000003',
    navn: 'Test Testesen3',
    adresse: 'Testgata 3, 0003 Testby',
    parorende: 'Test Pårørende3, tlf: 00000003',
    notes: [
      {
        id: 'NOTAT-004',
        dato: '2026-03-08',
        type: 'Poliklinisk konsultasjon – psykiatri',
        innhold: `Pasient: Test Testesen3, fnr: 00000000003
Dato: 8. mars 2026
Behandler: Psykiater Dr. Bakke

Bakgrunn:
34 år gammel kvinne med kjent recidiverende depresjon og generalisert angstlidelse (GAD).
Har stått på sertralin 100mg siden 2023. Siste innleggelse psykiatrisk avdeling: mai 2024.

Aktuelt:
Pasient beskriver økt grubling siste 4 uker etter jobbskifte. Søvnvansker med innsovningsproblem.
Energinivå redusert. Konsentrasjonsvansker. Benekter suicidalitet og selvskading.
Sosial fungering: opprettholder kontakt med familie og noen venner.

Funksjonsvurdering:
PHQ-9: 14 (moderat depresjon). GAD-7: 11 (moderat angst).

Plan:
Øker sertralin til 150mg. Starter kognitiv atferdsterapi (KAT) - henvist til gruppebehandling.
Avtaler ny konsultasjon om 3 uker. Pasient informert om å ta kontakt ved forverring.
Kontaktperson ved krise: Legevakt tlf 116 117.`,
      },
    ],
  },
];

/** Pasienter som har reservert seg mot AI-behandling */
export const RESERVATION_LIST: Set<string> = new Set([
  // PASIENT-C1E5 (Ingrid Olsen) har reservert seg – for å teste reservasjonssjekken
  'PASIENT-C1E5',
]);
