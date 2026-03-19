/**
 * F4-2: Output-validering.
 * Verifiserer at AI-responsen er trygg å vise i EPJ-grensesnittet.
 *
 * Tre sjekker (ref. arbeidsdokumentet):
 *  a) Lengdesjekk – er responsen innenfor forventet tegnantall?
 *  b) Markup-sjekk – inneholder responsen HTML, skript eller kode?
 *  c) Gjentagelsessjekk – gjentas sensitiv fritekst fra input ordrett?
 */

export class OutputValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'OutputValidationError';
  }
}

const MIN_LENGTH = 20;     // tegn
const MAX_LENGTH = 3000;   // tegn

// HTML-tags, skript og andre markup-mønstre
const MARKUP_PATTERNS: RegExp[] = [
  /<[^>]+>/g,                           // HTML-tags
  /javascript\s*:/gi,                   // javascript: URI
  /<script[\s\S]*?<\/script>/gi,        // skript-blokker
  /on\w+\s*=\s*["'][^"']*["']/gi,       // event-handlere
  /\{\{.*?\}\}/g,                       // template-injeksjon (Handlebars etc.)
  /\$\{.*?\}/g,                         // template literals
];

// Sensitive felter som IKKE skal gjentas ordrett fra input
// (gjentagelsessjekk – ikke full regex, men enkle markers)
const SENSITIVE_MARKERS = [
  '[FNR FJERNET]',
  '[TLF FJERNET]',
  '[ADRESSE FJERNET]',
  '[PÅRØRENDE FJERNET]',
  '[EPOST FJERNET]',
];

export function validateOutput(
  output: string,
  originalInput: string
): void {
  // a) Lengdesjekk
  if (output.length < MIN_LENGTH) {
    throw new OutputValidationError(
      'OUTPUT_TOO_SHORT',
      `AI-respons er for kort (${output.length} tegn, minimum ${MIN_LENGTH})`
    );
  }
  if (output.length > MAX_LENGTH) {
    throw new OutputValidationError(
      'OUTPUT_TOO_LONG',
      `AI-respons overskrider maksimal lengde (${output.length} tegn, maksimum ${MAX_LENGTH})`
    );
  }

  // b) Markup-injeksjonssjekk
  for (const pattern of MARKUP_PATTERNS) {
    if (pattern.test(output)) {
      // Reset regex-state
      pattern.lastIndex = 0;
      throw new OutputValidationError(
        'OUTPUT_CONTAINS_MARKUP',
        'AI-respons inneholder markup/kode som ikke er tillatt i EPJ-visning'
      );
    }
    pattern.lastIndex = 0;
  }

  // c) Gjentagelsessjekk: scrubbing-markører skal ikke finnes i output
  for (const marker of SENSITIVE_MARKERS) {
    if (output.includes(marker)) {
      throw new OutputValidationError(
        'OUTPUT_CONTAINS_SCRUB_MARKER',
        `AI-respons inneholder scrubbing-markør: ${marker}`
      );
    }
  }

  // c2) Sjekk for lange ordrett-gjentakelser fra input (>50 tegn sammenhengende)
  // Dette fanger tilfeller der AI bare kopierer fra input i stedet for å oppsummere
  const longPhrases = extractPhrases(originalInput, 60);
  for (const phrase of longPhrases) {
    if (output.includes(phrase)) {
      throw new OutputValidationError(
        'OUTPUT_VERBATIM_COPY',
        'AI-respons inneholder lang ordrett gjengivelse av input – mulig prompt injection'
      );
    }
  }
}

/** Trekk ut unike fraser over en viss lengde fra tekst */
function extractPhrases(text: string, minLength: number): string[] {
  // Del på linjeskift og punktum, filtrer ut korte setninger
  return text
    .split(/[\n.!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLength)
    .slice(0, 20);  // begrens antall sjekker for ytelse
}
