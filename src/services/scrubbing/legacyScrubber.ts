/**
 * F1-3: Scrubbing-filter.
 * Fjerner identifiserende feltinnhold fra klinisk tekst før sending til AI.
 *
 * Merk: Dette er ikke full anonymisering – det er dataminimering.
 * Feltene som scrubbes er de som sjelden er nødvendige for klinisk oppsummering.
 */

export interface ScrubResult {
  scrubbedText: string;
  removedFields: string[];  // hvilke typer felt ble fjernet (ikke innholdet)
}

// ─── Regex-regler ──────────────────────────────────────────────────────────────
const SCRUB_RULES: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  {
    // Norsk fødselsnummer: 11 siffer (DDMMYYSSSSZ)
    name: 'fødselsnummer',
    pattern: /\b\d{2}[01]\d[2-9]\d{7}\b/g,
    replacement: '[FNR FJERNET]',
  },
  {
    // Fødselsnummer med etikett (f.eks. "fnr: 12057812345" eller "f.nr.: ...")
    name: 'fødselsnummer_etikett',
    pattern: /\b(?:f(?:ødselsnummer|nr|\.nr\.?)\s*[:.]?\s*)\d{11}\b/gi,
    replacement: '[FNR FJERNET]',
  },
  {
    // Norske telefonnumre (8 siffer, ev. med +47 eller 0047)
    name: 'telefonnummer',
    pattern: /(?:\+47|0047)?\s*[2-9]\d{7}\b/g,
    replacement: '[TLF FJERNET]',
  },
  {
    // Norsk postnummer + sted (f.eks. "0182 Oslo", "5003 Bergen")
    name: 'adresse_postnummer',
    pattern: /\b\d{4}\s+[A-ZÆØÅa-zæøå]{2,}\b/g,
    replacement: '[ADRESSE FJERNET]',
  },
  {
    // Gate/vei-adresser (f.eks. "Storgata 12", "Kirkeveien 45")
    name: 'gateadresse',
    pattern: /[A-ZÆØÅ][a-zæøå]+(gata|gaten|gate|veien|vei|vegen|veg|plass|torget|allé)\s+\d+[A-Za-z]?\b/g,
    replacement: '[ADRESSE FJERNET]',
  },
  {
    // Pårørende-linje (f.eks. "Pårørende: Per Nordmann" eller "Pårørende navn:")
    name: 'parorende',
    pattern: /(?:pårørende|nær(?:meste)?\s*pårørende)\s*[:.]?\s*[^\n]{3,50}/gi,
    replacement: '[PÅRØRENDE FJERNET]',
  },
  {
    // E-postadresser
    name: 'epost',
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EPOST FJERNET]',
  },
];

/**
 * Scrubber klinisk tekst og returnerer renset versjon + liste over fjernede felttyper.
 */
export function scrubInput(text: string): ScrubResult {
  let scrubbedText = text;
  const removedFields: string[] = [];

  for (const rule of SCRUB_RULES) {
    const before = scrubbedText;
    scrubbedText = scrubbedText.replace(rule.pattern, rule.replacement);
    if (scrubbedText !== before && !removedFields.includes(rule.name)) {
      removedFields.push(rule.name);
    }
  }

  return { scrubbedText, removedFields };
}

/**
 * Validerer at teksten ikke er tom etter scrubbing og er innenfor max lengde.
 */
export function validateInputLength(
  text: string,
  maxChars = 8000
): void {
  if (!text.trim()) {
    throw new Error('Klinisk tekst er tom etter scrubbing');
  }
  if (text.length > maxChars) {
    throw new Error(
      `Klinisk tekst overskrider maksimal lengde (${text.length} / ${maxChars} tegn)`
    );
  }
}
