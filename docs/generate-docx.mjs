import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, ShadingType, convertInchesToTwip,
} from 'docx';
import { writeFileSync } from 'fs';

const NAVY  = '1A3A5C';
const TEAL  = '0E7490';
const GRAY  = 'F1F5F9';
const RED   = 'FEE2E2';
const GREEN = 'D1FAE5';
const WARN  = 'FEF3C7';

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 6 } },
    run: { color: NAVY, bold: true },
  });
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 80 },
    run: { color: TEAL, bold: true },
  });
}

function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, ...opts })],
  });
}

function bullet(text, bold = false) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22, bold })],
  });
}

function warning(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    shading: { type: ShadingType.SOLID, color: WARN },
    children: [new TextRun({ text: '⚠  ' + text, size: 22, bold: true, color: '92400E' })],
  });
}

function note(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    shading: { type: ShadingType.SOLID, color: GRAY },
    children: [new TextRun({ text, size: 20, italics: true, color: '475569' })],
  });
}

function tableRow(cells, isHeader = false) {
  return new TableRow({
    tableHeader: isHeader,
    children: cells.map((text, i) => new TableCell({
      shading: isHeader ? { type: ShadingType.SOLID, color: NAVY } : (i === cells.length - 1 && text === '⚠ Krever vurdering' ? { type: ShadingType.SOLID, color: WARN } : {}),
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({
          text,
          size: 20,
          bold: isHeader,
          color: isHeader ? 'FFFFFF' : '1E293B',
        })],
      })],
    })),
  });
}

function makeTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    rows: [
      tableRow(headers, true),
      ...rows.map(r => tableRow(r)),
    ],
  });
}

function spacer() {
  return new Paragraph({ text: '', spacing: { after: 80 } });
}

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 22 } },
      heading1: { run: { font: 'Calibri', size: 32, bold: true, color: NAVY } },
      heading2: { run: { font: 'Calibri', size: 26, bold: true, color: TEAL } },
      heading3: { run: { font: 'Calibri', size: 24, bold: true, color: '334155' } },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          right: convertInchesToTwip(1.1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1.1),
        },
      },
    },
    children: [

      // ── Tittel ──
      new Paragraph({
        spacing: { before: 200, after: 60 },
        children: [new TextRun({ text: 'Personverngrunnlag og systemdokumentasjon', size: 40, bold: true, color: NAVY, font: 'Calibri' })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: 'Sana AI – Klagesak-analyse', size: 28, color: TEAL, font: 'Calibri' })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: 'Versjon: 0.1 (utkast for juridisk vurdering)', size: 20, color: '64748B', italics: true })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: 'Dato: 2026-03-13', size: 20, color: '64748B', italics: true })],
      }),
      new Paragraph({
        spacing: { after: 200 },
        shading: { type: ShadingType.SOLID, color: RED },
        children: [new TextRun({ text: 'Status: Ikke ferdigstilt – krever advokatvurdering før produksjonssetting', size: 20, bold: true, color: '991B1B' })],
      }),

      // ── 1. Systembeskrivelse ──
      h1('1. Systembeskrivelse'),
      h3('Formål'),
      p('Sana AI er et internt analyseverktøy for helseforsikringsselskaper. Formålet er å bistå leger i å prioritere og vurdere innkomne klagesaker ved å bruke en AI-modell til å generere et strukturert sammendrag, standpunkt og prioritetsscore.'),
      p('AI-analysen er et beslutningsstøtteverktøy — all endelig vurdering gjøres av en lege. Ingen vedtak fattes automatisk.'),
      spacer(),
      h3('Aktører'),
      makeTable(
        ['Rolle', 'Beskrivelse'],
        [
          ['Behandlingsansvarlig', '[Forsikringsselskap – navn fylles inn]'],
          ['Databehandler (AI)', 'Amazon Web Services EMEA SARL (Bedrock)'],
          ['Sluttbruker', 'Lege/saksbehandler ansatt hos behandlingsansvarlig'],
          ['Registrert', 'Klageren (forsikringstaker eller pasient)'],
        ]
      ),

      // ── 2. Dataflyt ──
      h1('2. Dataflyt'),
      bullet('[1] Klagedokument (PDF/Word) lastes opp til intern server'),
      bullet('[2] Tekstekstraksjon utføres lokalt — ingen ekstern sending'),
      bullet('[3] PII-scrubbing utføres lokalt: fødselsnummer, telefon, e-post, adresse'),
      bullet('[4] Scrubbet tekst sendes til Amazon Bedrock (eu-north-1, Stockholm)'),
      bullet('[5] AI-analyse returneres til intern server'),
      bullet('[6] Analyse lagres i intern database (cases.json) — inkluderer ikke rå dokumenttekst'),
      bullet('[7] Lege gjennomgår og godkjenner/justerer vurderingen'),
      bullet('[8] Legevurdering lagres i intern database'),
      spacer(),
      p('Revisjonslogg: Alle hendelser logges til audit.jsonl med tidsstempel og saks-ID. Personsensitivt innhold logges ikke.'),

      // ── 3. Kategorisering ──
      h1('3. Kategorisering av data'),
      makeTable(
        ['Datakategori', 'GDPR-kategori', 'Eksempler'],
        [
          ['Klagetekst fra forsikringstaker', 'Art. 9 – helseopplysninger', 'Diagnose, behandling, legeattester'],
          ['Navn, adresse, kontaktinfo', 'Art. 6 – personopplysninger', 'Scrubbes før AI-sending'],
          ['Fødselsnummer', 'Art. 9 / særlig sensitiv', 'Scrubbes alltid'],
          ['AI-generert analyse', 'Avledet – Art. 9 ved tilknytning', 'Sammendrag av klagen'],
          ['Legens vurdering og notater', 'Art. 9', 'Lagres internt'],
        ]
      ),
      spacer(),
      warning('Medisinsk innhold (diagnoser, behandlinger) sendes til AWS Bedrock og er fortsatt å anse som helseopplysninger under Art. 9, selv uten direkte identifikasjon. Om scrubbet helseopplysning uten direkte identifikator fortsatt krever Art. 9-grunnlag er juridisk uavklart.'),

      // ── 4. Rettslig grunnlag ──
      h1('4. Rettslig grunnlag – kartlegging'),
      makeTable(
        ['Behandlingsaktivitet', 'Foreslått grunnlag', 'Status'],
        [
          ['Motta og lagre klagedokument', 'Art. 6(1)(b) – kontraktsoppfyllelse', 'Sannsynlig OK'],
          ['Ekstrahere og scrube tekst', 'Art. 6(1)(b) – kontraktsoppfyllelse', 'Sannsynlig OK'],
          ['Sende til AI for analyse', 'Uavklart', '⚠ Krever vurdering'],
          ['Lagre AI-analyse internt', 'Art. 6(1)(b) – kontraktsoppfyllelse', 'Sannsynlig OK'],
          ['Revisjonslogging', 'Art. 6(1)(c) – rettslig forpliktelse', 'Sannsynlig OK'],
          ['Legens vurdering og godkjenning', 'Art. 6(1)(b) – kontraktsoppfyllelse', 'Sannsynlig OK'],
        ]
      ),
      spacer(),
      h3('Spørsmål til advokat'),
      bullet('Hvilket grunnlag etter Art. 9(2) kan benyttes for sending av scrubbet helseopplysning til en ekstern AI-modell?'),
      bullet('Er Art. 9(2)(f) (rettskrav) eller Art. 9(2)(h) (helse/omsorg) aktuelt for helseforsikringers behandling av klager?'),

      // ── 5. DPA ──
      h1('5. Databehandleravtale (DPA) med AWS'),
      makeTable(
        ['Punkt', 'Status'],
        [
          ['DPA inngått med AWS', '[Ikke inngått / Inngått – dato fylles inn]'],
          ['Tjeneste', 'Amazon Bedrock'],
          ['Region', 'eu-north-1 (Stockholm, Sverige)'],
          ['AWS ISO 27001', '✓ Sertifisert'],
          ['AWS ISO 27017/27018', '✓ Sertifisert'],
          ['AWS SOC 1/2/3', '✓ Sertifisert'],
          ['Zero data retention', '[Bekreftes av AWS]'],
        ]
      ),

      // ── 6. Risikovurdering ──
      h1('6. Risikovurdering'),
      makeTable(
        ['Risiko', 'Sanns.', 'Konsekvens', 'Tiltak innført', 'Gjenstår'],
        [
          ['CLOUD Act – US-myndigheters tilgang', 'Lav', 'Høy', 'DPA med AWS', 'Juridisk vurdering'],
          ['Re-identifikasjon av scrubbet data', 'Lav', 'Høy', 'PII-scrubbing', 'Teknisk revisjon'],
          ['Uautorisert tilgang til server', 'Middels', 'Høy', 'JWT-auth, kill-switch', 'Kryptering av lagring'],
          ['Ukryptert lagring (cases.json)', 'Høy', 'Høy', 'Ingen per nå', 'Kryptert DB'],
          ['AI-feil påvirker vedtak', 'Middels', 'Middels', 'Obligatorisk legevurdering', 'AI-nøyaktighetstest'],
          ['Manglende info til registrert', 'Høy', 'Middels', 'Ingen per nå', 'Informasjonsplikt-tekst'],
        ]
      ),
      spacer(),
      h3('Tiltak som er innført'),
      bullet('PII-scrubbing (fnr, telefon, e-post, adresse) før AI-sending', true),
      bullet('JWT-autentisering for alle API-kall', true),
      bullet('Revisjonslogg (JSONL) for alle hendelser', true),
      bullet('Kill-switch for øyeblikkelig deaktivering av AI', true),
      bullet('Rate limiting på alle endepunkter', true),
      bullet('Menneskelig godkjenning av alle AI-anbefalinger', true),
      bullet('Data behandles i EU/EØS (eu-north-1, Stockholm)', true),

      // ── 7. Dataminimering ──
      h1('7. Dataminimering'),
      p('Vurderte alternativer til sending av fritekst til AI:'),
      bullet('Kun strukturerte metadata (diagnose-kode, behandlingstype) → mulig, men krever strukturert input fra EPJ-system'),
      bullet('Lokal AI-modell (on-premise) → teknisk krevende, betydelig høyere kostnad'),
      bullet('Sterkere anonymisering utover PII-scrubbing → ville redusert analysekvalitet vesentlig'),
      spacer(),
      p('Foreløpig konklusjon: Fritekst-sending er nødvendig for analysekvalitet, men bør bekreftes av advokat opp mot dataminimeringsprinsippet.'),

      // ── 8. Informasjonsplikt ──
      h1('8. Informasjonsplikt til registrerte'),
      warning('Status: Ikke implementert. Klagere er per i dag ikke informert om at klagen behandles med AI-assistanse.'),
      spacer(),
      p('GDPR Art. 13/14 og EU AI Act Art. 50 krever slik informasjon. Forslag til tekst i klagemottaks-bekreftelse:'),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        shading: { type: ShadingType.SOLID, color: GRAY },
        children: [new TextRun({
          text: '"Klagen din kan bli analysert med AI-assistert verktøy som støtte for legens vurdering. AI-analysen er ikke bindende og godkjennes alltid av en lege."',
          size: 22, italics: true, color: '334155',
        })],
      }),

      // ── 9. EU AI Act ──
      h1('9. EU AI Act – foreløpig vurdering'),
      p('Systemet kan falle inn under høyrisiko-kategorien (Annex III, punkt 5b: AI-systemer brukt i forsikring som påvirker tilgang til tjenester).'),
      makeTable(
        ['Krav ved høyrisiko', 'Status'],
        [
          ['Teknisk dokumentasjon', 'Delvis dekket av dette dokumentet'],
          ['Risikovurdering', 'Delvis dekket (seksjon 6)'],
          ['Menneskelig tilsyn', '✓ Innført'],
          ['Registrering i EU AI Act-database', 'Ikke gjort'],
          ['Samsvarsvurdering', 'Ikke gjennomført'],
        ]
      ),

      // ── 10. Åpne spørsmål ──
      h1('10. Åpne spørsmål for advokatvurdering'),
      bullet('Hvilket Art. 9(2)-grunnlag kan benyttes for sending av scrubbet helseopplysning til ekstern AI?'),
      bullet('Er CLOUD Act-risikoen akseptabel gitt DPA, eller kreves ytterligere tiltak?'),
      bullet('Oppfyller scrubbing-tiltakene kravet til dataminimering?'),
      bullet('Klassifiseres systemet som høyrisiko under EU AI Act Annex III?'),
      bullet('Hva er minimumsinnholdet i informasjonsplikten til klagerne?'),
      bullet('Krever Normen spesifikk godkjenning av AWS Bedrock som leverandør?'),
      spacer(),
      spacer(),
      note('Dette dokumentet er et teknisk utkast utarbeidet som grunnlag for juridisk vurdering. Det er ikke en ferdig DPIA og erstatter ikke juridisk rådgivning.'),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync('./docs/personvern-systemdokumentasjon.docx', buffer);
console.log('✓ Lagret: docs/personvern-systemdokumentasjon.docx');
