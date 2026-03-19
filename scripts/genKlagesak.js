/* eslint-disable */
const { PDFDocument, StandardFonts, rgb } = require('../node_modules/pdf-lib');
const fs = require('fs');
const path = require('path');

async function create() {
  const pdfDoc = await PDFDocument.create();
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const navy = rgb(0.1, 0.23, 0.36);
  const gray = rgb(0.25, 0.25, 0.25);
  const lgray = rgb(0.75, 0.75, 0.75);
  const red = rgb(0.65, 0.1, 0.1);
  const white = rgb(1, 1, 1);

  let page, y;

  function newPage() {
    page = pdfDoc.addPage([595, 842]);
    y = 800;
  }

  function ensureSpace(needed) {
    if (y < needed + 50) newPage();
  }

  function hline() {
    page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: lgray });
    y -= 14;
  }

  function section(title) {
    ensureSpace(40);
    y -= 6;
    page.drawRectangle({ x: 50, y: y - 4, width: 495, height: 20, color: rgb(0.92, 0.95, 0.98) });
    page.drawText(title, { x: 56, y: y + 2, font: bold, size: 11, color: navy });
    y -= 20;
  }

  function para(text, font, size, color, indent) {
    const x = 50 + (indent || 0);
    const maxW = 495 - (indent || 0);
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        ensureSpace(size * 2);
        page.drawText(line, { x, y, font, size, color });
        y -= Math.round(size * 1.65);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      ensureSpace(size * 2);
      page.drawText(line, { x, y, font, size, color });
      y -= Math.round(size * 1.65);
    }
  }

  function bullet(text) {
    ensureSpace(20);
    page.drawText('>', { x: 56, y, font: bold, size: 9, color: navy });
    para(text, regular, 9, gray, 16);
  }

  function kv(label, value) {
    ensureSpace(16);
    page.drawText(label, { x: 56, y, font: bold, size: 9, color: gray });
    page.drawText(value, { x: 210, y, font: regular, size: 9, color: gray });
    y -= 14;
  }

  function event(time, desc) {
    ensureSpace(30);
    page.drawText(time, { x: 56, y, font: bold, size: 9, color: navy });
    y -= 13;
    para(desc, regular, 9, gray, 10);
    y -= 4;
  }

  function svikt(title, body) {
    ensureSpace(60);
    page.drawText(title, { x: 56, y, font: bold, size: 9.5, color: red });
    y -= 14;
    para(body, regular, 9, gray, 0);
    y -= 8;
  }

  // ── SIDE 1 ──
  newPage();

  // Toppboks
  page.drawRectangle({ x: 50, y: y - 62, width: 495, height: 72, color: navy });
  page.drawText('KLAGESAK – FORSIKRINGSKRAV', { x: 60, y: y - 20, font: bold, size: 16, color: white });
  page.drawText('Norsk Helseforsikring AS  ·  Avdeling for medisinske klager', { x: 60, y: y - 38, font: regular, size: 10, color: rgb(0.8, 0.85, 0.9) });
  page.drawText('STRENGT KONFIDENSIELT', { x: 60, y: y - 54, font: bold, size: 9, color: rgb(1, 0.75, 0.2) });
  y -= 82;

  section('SAKSINFORMASJON');
  y -= 2;
  kv('Saksnummer:', 'NHF-2025-04821');
  kv('Dato for innlevering:', '14. januar 2026');
  kv('Klager:', 'Marianne Thorvaldsen (paa vegne av avdoede Tor Egil Thorvaldsen)');
  kv('Forsikringspolise:', 'POL-88341-T');
  kv('Behandlende sykehus:', 'Regionsykehuset i Stavanger HF');
  kv('Avdeling:', 'Ortopedisk kirurgi, Operasjonsavdeling 3B');
  kv('Ansvarlig kirurg:', 'Prof. dr. med. Kjetil Ravnaas (pensjonert)');
  kv('Hendelsesdato:', '17. mars 2025');
  kv('Doedsdato:', '29. april 2025');
  kv('Klageadvokat:', 'Adv. Silje Moerk, Moerk & Partnere AS, Bergen');
  kv('Krav (forlopig):', 'NOK 8 400 000');
  y -= 6;
  hline();

  section('SAMMENDRAG AV KLAGEN');
  y -= 2;
  para(
    'Klagen gjelder alvorlig operasjonsfeil og etterfolgend behandlingssvikt under og etter en planlagt kneprotese-operasjon (total knearthroplastikk, TKA) paa Regionsykehuset i Stavanger 17. mars 2025. Pasienten Tor Egil Thorvaldsen (57 aar) dode 29. april 2025 som direkte folge av komplikasjoner utlost av feilimplantasjon av kneprotese, peroperativ nerveskade og en paafolgene ukontrollert MRSA-infeksjon. Familien anforer at flere klare svikt i behandlingskjeden er dokumentert, og at doden var unngaaelig dersom standard prosedyrer hadde blitt fulgt.',
    regular, 9.5, gray, 0
  );
  y -= 8;
  hline();

  section('PASIENTENS SYKEHISTORIE OG BAKGRUNN');
  y -= 2;
  para(
    'Tor Egil Thorvaldsen, fodt 12. august 1967, var til operasjonstidspunktet i relativt god allmenntilstand. Kjent type 2 diabetes (velregulert, HbA1c 52 mmol/mol januar 2025), mild hypertensjon behandlet med ramipril 5mg x1, BMI 28,4. Ingen tidligere kirurgi i generell anestesi. Aktiv toekommermann. Progressiv artrose hoyre kne (Kellgren-Lawrence grad IV) over tre aar. Preoperativ utredning januar-februar 2025 konkluderte med at pasienten var egnet for TKA. ASA-klassifikasjon II. Alle preoperative parametere (HbA1c, koagulasjon, nyrefunksjon) innenfor akseptable grenser.',
    regular, 9.5, gray, 0
  );
  y -= 8;
  hline();

  // ── SIDE 2 ──
  newPage();
  y -= 10;

  section('HENDELSESFORLOEP – DETALJERT KRONOLOGI');
  y -= 4;

  event('17. mars 2025, 07:15',
    'Pasient innsjekket ved Ortopedisk dagkirurgi. Preoperativ sjekkliste gjennomgaatt. Antibiotikaprofylakse (cefazolin 2g IV) dokumentert gitt kl. 07:42 – kun 18 minutter foer incisjon. Anbefalt vindu er 30-60 min foer incisjon (Norsk selskap for infeksjonsmedisin, retningslinje 2022).');

  event('17. mars 2025, 08:00',
    'Operasjonsstart. Generell anestesi innledet. Ansvarlig kirurg: Prof. Ravnaas. Assisterende: LIS-lege Haakon Brekke (17 maaneders erfaring, ingen dokumentert supervisjon for TKA). Operasjonssykepleier: Tone Vik.');

  event('17. mars 2025, 08:55',
    'Intraoperativ feil: Feil rotasjonsvinkel paa femoral komponent implantert. Postoperativt roentgen avdekket 11 graders ekstern rotasjonsavvik. Klinisk toleranse er pluss/minus 3 grader (NOF 2023). Avviket ikke erkjent intraoperativt. Kirurg Ravnaas dokumenterte i operasjonsnotatet at inngrepet forloep ukomplisert.');

  event('17. mars 2025, 09:40',
    'Peroperativ skade paa n. peroneus communis under retraktor-plassering. Skaden ikke erkjent intraoperativt. Pasienten utviklet postoperativt dropfot paa hoyre side – bekreftet ved nevrofysiologisk utredning 22. mars.');

  event('17.–20. mars 2025',
    'Postoperativ overvaakning. Pasienten klaget over sterk smerte (NRS 9/10), hevelse og rodme allerede dag 1. Sykepleiernotater viser gjentatte meldinger til vakthavende. Vakthavende lege tilsaa pasienten kun en gang (18. mars) og dokumenterte forventet postoperativ reaksjon uten aa ta CRP, leukocytter eller saarkultur.');

  event('21. mars 2025',
    'CRP 287 mg/L, leukocytter 18,4 x10^9/L. Saarkultur tatt. Diagnose: Postoperativ dypinfeksjon (periprostetisk leddsinfeksjon, PJI). Bekreftet 23. mars med funn av MRSA. Infeksjon sannsynlig etablert allerede 48-72 timer postoperativt.');

  event('24. mars 2025',
    'Reoperasjon: Debridement, antibiotika og implantatskylling (DAIR-prosedyre). Mikrobiolog anbefalte totalt implantatskift. Anbefalingen ble kun delvis fulgt.');

  event('28. mars – 10. april 2025',
    'Pasient overflyttet intensivavdeling med septisk sjokk. Vasopressorbehandling igangsatt. Progredient nyre- og leversvikt (SOFA-score 11). Tre dialysesesjoner gjennomfort.');

  event('15. april 2025',
    'MDT-konferanse. Konklusjon: totalt implantatskift nodvendig, men pasientens tilstand vurdert som for kritisk for ytterligere kirurgi. Palliativ fase innledet.');

  event('29. april 2025',
    'Tor Egil Thorvaldsen avgikk ved doden kl. 03:22. Dodsaarsak: Sepsis med multiorgansvikt, utlost av periprostetisk MRSA-infeksjon etter TKA.');

  y -= 4;
  hline();

  // ── SIDE 3 ──
  newPage();
  y -= 10;

  section('ANFORTE SVIKT OG RETTSLIG GRUNNLAG');
  y -= 4;

  svikt('1. Feilimplantasjon av kneprotese (pasientskadeloven § 2-1)',
    'Femoralkomponenten implantert med 11 graders ekstern rotasjonsavvik – langt utenfor akseptert toleranse paa pluss/minus 3 grader. Dette er en objektiv teknisk feil som etter retningslinjene fra NOF skal fanges opp intraoperativt. Avviket foraarsaker biomekanisk instabilitet, okt trykk mot blovev og vanskeliggjort rehabilitering.');

  svikt('2. Nerveskade – manglende erkjennelse og informasjon (§ 2-1)',
    'Skade paa n. peroneus communis resulterte i permanent dropfot. Nerven er en kjent risikostruktur ved TKA. At skaden ikke ble erkjent intraoperativt eller kommunisert til pasient og parorende de forste dagene, er et selvstendig sviktgrunnlag etter helsepersonelloven § 10.');

  svikt('3. Forsinket diagnostisering og behandling av infeksjon (§ 2-1, jf. § 3)',
    'Kliniske tegn paa postoperativ infeksjon forelaa fra dag 1-2. PJI-retningslinjer (AAOS 2019, implementert ved Stavanger HF) krever infeksjonsutredning ved vedvarende NRS > 7 og saarreaksjon fra dag 2. Utredning igangsatt forst dag 4. Forsinket behandling er dokumentert aa forverre prognose ved MRSA-PJI og anses som medvirkende dodsaarsak.');

  svikt('4. Utilstrekkelig antibiotikaprofylakse (§ 2-1)',
    'Profylaktisk antibiotika gitt kun 18 minutter foer incisjon – i strid med retningslinjene (30-60 min). Suboptimal vevspenetrasjon paa operasjonstidspunktet kan ha bidratt til infeksjonsetablering.');

  svikt('5. Manglende kompetanse og supervisjon (helsepersonelloven § 4)',
    'Assisterende kirurg hadde 17 maaneders LIS-erfaring uten dokumentert opplaering i selvstendig TKA. Interne retningslinjer ved Stavanger HF (Kirurgisk klinikk, prosedyremanual v4.2) krever supervisjon for LIS ved kompliserte primaarproteser. Supervisjonsdokumentasjon foreligger ikke.');

  svikt('6. Informasjonssvikt (pasient- og brukerrettighetsloven § 3-2)',
    'Pasient og parorende ble ikke informert om feilimplantasjon, nerveskade eller infeksjonsrisiko paa adekvat tidspunkt. Parorende anforer at de forst ble gjort kjent med feilimplantasjonen 4. april 2025 – 18 dager etter operasjonen.');

  y -= 4;
  hline();

  section('SAKKYNDIGE VURDERINGER (UTDRAG)');
  y -= 2;
  para(
    'Prof. dr. med. Ingrid Haugen (ortopedisk kirurgi, UiO) konkluderer i vedlagt erklaring at rotasjonsavviket paa 11 grader representerer et klart avvik fra forsvarlig standard, og at korrekt implantasjon ville ha gitt pasienten en forventet tilfriskning uten de komplikasjoner som oppstod. Hun vurderer sannsynligheten for at korrekt implantasjon ville forhindret doden som hoy.',
    regular, 9.5, gray, 0
  );
  y -= 8;
  para(
    'Dr. med. Lars Furuseth (infeksjonsmedisin, St. Olavs hospital) anforer at forsinket diagnostikk og behandling av PJI med MRSA i minst 48 timer, kombinert med delvis gjennomfort DAIR-prosedyre, statistisk sett oker dodelighetsrisikoen med 40-60 % sammenlignet med optimal behandling. Han vurderer kausaliteten mellom behandlingssvikten og dodsutfallet som overveiende sannsynlig.',
    regular, 9.5, gray, 0
  );
  y -= 8;
  hline();

  section('VEDLAGT DOKUMENTASJON');
  y -= 2;
  const docs = [
    'Vedlegg A: Fullstendige journalnotater (Stavanger HF) 17. mars – 29. april 2025 (184 sider)',
    'Vedlegg B: Operasjonsprotokoll 17. og 24. mars 2025',
    'Vedlegg C: Postoperative roentgenbilder med radiologisk vurdering av rotasjonsavvik',
    'Vedlegg D: Mikrobiologirapporter – MRSA-dyrkning 23. mars og 1. april 2025',
    'Vedlegg E: Sakkyndig erklaring, prof. Ingrid Haugen (ortopedisk kirurgi)',
    'Vedlegg F: Sakkyndig erklaring, dr. Lars Furuseth (infeksjonsmedisin)',
    'Vedlegg G: Sykepleiernotater med NRS-registreringer og temperaturkurver',
    'Vedlegg H: Anestesiprotokoll og medikamentlogg',
    'Vedlegg I: Kommunikasjon mellom parorende og sykehusledelse',
    'Vedlegg J: Dodsboskifte og fullmakt fra Marianne Thorvaldsen',
    'Vedlegg K: Beregning av erstatningskrav (Moerk & Partnere AS)',
  ];
  for (const d of docs) bullet(d);
  y -= 6;
  hline();

  // ── SIDE 4 ──
  ensureSpace(200);

  section('ERSTATNINGSKRAV');
  y -= 2;
  const krav = [
    ['Fremtidig inntektstap (til pensjonsalder 67 aar):', 'NOK 4 200 000'],
    ['Maerutgifter og paalopte kostnader:', 'NOK 380 000'],
    ['Oppreisningserstatning:', 'NOK 1 500 000'],
    ['Tap av forsorger (ektefelle og to mindeaarige barn):', 'NOK 1 900 000'],
    ['Begravelsesutgifter og advokathonorar:', 'NOK 420 000'],
  ];
  for (const [label, amount] of krav) {
    ensureSpace(16);
    page.drawText(label, { x: 56, y, font: regular, size: 9, color: gray });
    page.drawText(amount, { x: 400, y, font: regular, size: 9, color: gray });
    y -= 14;
  }
  ensureSpace(20);
  page.drawLine({ start: { x: 400, y: y + 4 }, end: { x: 540, y: y + 4 }, thickness: 0.5, color: gray });
  page.drawText('TOTALT KRAV (forlopig):', { x: 56, y, font: bold, size: 10, color: red });
  page.drawText('NOK 8 400 000', { x: 400, y, font: bold, size: 10, color: red });
  y -= 20;
  hline();

  section('AVSLUTTENDE MERKNAD');
  y -= 2;
  para(
    'Familien Thorvaldsen oensker en grundig, uavhengig medisinsk vurdering av hendelsesforlopet. Vi ber om at saken prioriteres gitt alvorlighetsgraden og de sammensatte sviktpunktene. Kopi er sendt til Statsforvalteren i Rogaland, Norsk pasientskadeerstatning (NPE) og Helsetilsynet. Partene er innstilt paa dialog, men forbeholder seg retten til aa ta saken til domstol dersom minnelig losning ikke oppnaas innen 1. mai 2026.',
    regular, 9.5, gray, 0
  );
  y -= 20;
  page.drawText('Bergen, 14. januar 2026', { x: 56, y, font: italic, size: 9, color: gray }); y -= 14;
  page.drawText('Silje Moerk, advokat', { x: 56, y, font: bold, size: 9, color: navy }); y -= 12;
  page.drawText('Moerk & Partnere AS – paa vegne av Marianne Thorvaldsen', { x: 56, y, font: regular, size: 9, color: gray });

  // Footer
  const total = pdfDoc.getPageCount();
  for (let i = 0; i < total; i++) {
    const p = pdfDoc.getPage(i);
    p.drawText('NHF-2025-04821  |  STRENGT KONFIDENSIELT  |  Side ' + (i + 1) + ' av ' + total,
      { x: 50, y: 25, font: regular, size: 8, color: lgray });
  }

  const bytes = await pdfDoc.save({ useObjectStreams: false });
  const outPath = path.join(__dirname, '..', 'klagesak-thorvaldsen.pdf');
  fs.writeFileSync(outPath, bytes);
  console.log('Ferdig:', bytes.length, 'bytes,', total, 'sider ->', outPath);
}

create().catch(e => { console.error(e.message); process.exit(1); });
