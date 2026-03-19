const PII_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /(?<!\d)[0-3]\d[0-1]\d[2-9]\d{6}(?!\d)/g, replacement: '[FØDSELSNUMMER]' },
  { pattern: /(?<!\d)[4-7]\d[0-1]\d[2-9]\d{6}(?!\d)/g, replacement: '[D-NUMMER]' },
  { pattern: /(?<!\d)[49]\d{7}(?!\d)/g, replacement: '[TELEFON]' },
  { pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, replacement: '[EPOST]' },
  { pattern: /\d{2}[./]\d{2}[./]\d{4}/g, replacement: '[DATO]' },
  { pattern: /\d{4}\s+[A-ZÆØÅ][A-Za-zÆØÅæøå]+/g, replacement: '[POSTNR BY]' },
];

export function scrubNorwegianPII(text: string): string {
  return PII_RULES.reduce((t, rule) => t.replace(rule.pattern, rule.replacement), text);
}
