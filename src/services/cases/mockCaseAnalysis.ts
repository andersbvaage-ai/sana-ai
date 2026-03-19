import { CaseAnalysis, CriticalityLevel } from '../../config/types';

const MOCK_ANALYSES: CaseAnalysis[] = [
  {
    kritikalitet: 'Høy',
    estimertTid: '1–2 timer',
    sammendrag:
      'Klagesak vedrørende forsinket diagnostisering av tykktarmskreft. ' +
      'Pasienten hevder at symptomer ble ignorert over 8 måneder, noe som medførte ' +
      'at kreften ble oppdaget i stadium III fremfor stadium I. Saken involverer ' +
      'flere konsultasjoner hos fastlege og to polikliniske besøk.',
    hovedpunkter: [
      'Forsinket henvisning til koloskopi til tross for vedvarende symptomer',
      'Manglende oppfølging etter negativ prøvesvar i primærhelsetjenesten',
      'Dokumentert tidsgap på 8 måneder mellom første symptomrapport og diagnose',
      'Potensielt forringet prognose som følge av forsinkelsen',
    ],
    begrunnelse:
      'Saken vurderes som Høy kritikalitet grunnet alvorlig grunnsykdom, lang forsinkelse ' +
      'og dokumentert stadiumforskjell. Tidsestimatet på 1–2 timer reflekterer behov for ' +
      'gjennomgang av multiple konsultasjonsnotater og vurdering av kausalitet.',
    standpunkt: 'Støttes delvis',
    standpunktBegrunnelse: 'Forsinkelsen er dokumentert, men kausaliteten mellom forsinkelse og forringet prognose må verifiseres mot journalnotater og faglige retningslinjer.',
    prioritetScore: 78,
  },
  {
    kritikalitet: 'Middels',
    estimertTid: '30–60 min',
    sammendrag:
      'Klage på manglende smertebehandling etter kneoperasjon. Pasienten opplevde ' +
      'utilstrekkelig postoperativ smertelindring de første 48 timene, og mener dette ' +
      'forsinket rehabiliteringen med 2–3 uker.',
    hovedpunkter: [
      'Utilstrekkelig smertelindring i postoperativ fase',
      'Påstått avvik fra standard behandlingsprotokoll',
      'Forsinket mobilisering og rehabilitering',
    ],
    begrunnelse:
      'Middels kritikalitet da det ikke foreligger varig skade, men saken krever ' +
      'gjennomgang av behandlingsprotokoll og sammenligning med journalnotater.',
    standpunkt: 'Uavklart',
    standpunktBegrunnelse: 'Saken har potensielt grunnlag, men krever sammenligning mot gjeldende smertebehandlingsprotokoll før standpunkt kan tas.',
    prioritetScore: 52,
  },
  {
    kritikalitet: 'Lav',
    estimertTid: '15–30 min',
    sammendrag:
      'Klage på kommunikasjon og informasjonsutveksling ved poliklinisk kontroll. ' +
      'Pasienten mottok ikke skriftlig informasjon om prøvesvar innen avtalt tid, ' +
      'noe som medførte unødig bekymring.',
    hovedpunkter: [
      'Manglende skriftlig tilbakemelding på prøvesvar',
      'Prøvesvar var normale – ingen klinisk konsekvens',
      'Rutinesvikt i kommunikasjonsrutiner',
    ],
    begrunnelse:
      'Lav kritikalitet da det ikke er klinisk skade. Saken gjelder administrativ ' +
      'svikt og kan vurderes raskt.',
    standpunkt: 'Avvises',
    standpunktBegrunnelse: 'Ingen klinisk skade er påvist, og forsinkelsen i kommunikasjonen medførte ingen konsekvenser for pasienten.',
    prioritetScore: 18,
  },
  {
    kritikalitet: 'Kritisk',
    estimertTid: 'Halvdag+',
    sammendrag:
      'Klagesak vedrørende feilmedisinering som resulterte i alvorlig legemiddelreaksjon. ' +
      'Pasienten ble feilaktig gitt feil dose warfarin over 3 uker, noe som utløste ' +
      'en alvorlig blødningsepisode med sykehusinnleggelse. Saken er under politianmeldelse.',
    hovedpunkter: [
      'Feil dosering av antikoagulasjonsmedisin over 3 uker',
      'Alvorlig blødningsepisode – innleggelse på intensivavdeling',
      'Mulig journalføringsfeil som kilde til feilmedisineringen',
      'Saken er politianmeldt – koordinering med juridisk avdeling nødvendig',
      'INR-kontroller ikke utført som foreskrevet',
    ],
    begrunnelse:
      'Kritisk prioritet grunnet alvorlig pasientskade, pågående politisak og ' +
      'kompleksitet i årsaksutredning. Krever grundig gjennomgang av samtlige journalnotater, ' +
      'medikamentlister og kommunikasjonslogg.',
    standpunkt: 'Støttes',
    standpunktBegrunnelse: 'Feilmedisineringen er dokumentert og direkte årsak til alvorlig skade er sannsynliggjort. Klagen har sterkt medisinsk grunnlag.',
    prioritetScore: 97,
  },
];

export async function mockCaseAnalysis(text: string): Promise<CaseAnalysis> {
  const delay = 500 + Math.random() * 800;
  await new Promise(r => setTimeout(r, delay));

  // Enkel heuristikk basert på tekstlengde for variasjon i mock
  const idx = Math.floor((text.length / 100)) % MOCK_ANALYSES.length;
  return { ...MOCK_ANALYSES[idx] };
}

export function getCriticalityOrder(level: CriticalityLevel): number {
  return { Kritisk: 4, Høy: 3, Middels: 2, Lav: 1 }[level] ?? 0;
}
