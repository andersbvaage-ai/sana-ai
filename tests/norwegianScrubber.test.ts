import { scrubNorwegianPII } from '../src/services/scrubbing/norwegianScrubber';

describe('scrubNorwegianPII', () => {
  it('replaces Norwegian personal numbers', () => {
    const result = scrubNorwegianPII('Pasient fnr: 12057812345');
    expect(result).not.toContain('12057812345');
    expect(result).toContain('[FØDSELSNUMMER]');
  });

  it('replaces phone numbers', () => {
    const result = scrubNorwegianPII('Tlf: 91234567');
    expect(result).toContain('[TELEFON]');
  });

  it('replaces email addresses', () => {
    const result = scrubNorwegianPII('Kontakt: test@example.com');
    expect(result).toContain('[EPOST]');
  });

  it('replaces dates', () => {
    const result = scrubNorwegianPII('Dato: 15.06.2021');
    expect(result).toContain('[DATO]');
  });

  it('replaces postal codes with city', () => {
    const result = scrubNorwegianPII('Adresse: 0182 Oslo');
    expect(result).toContain('[POSTNR BY]');
  });

  it('replaces D-numbers', () => {
    const result = scrubNorwegianPII('D-nummer: 41057812345');
    expect(result).toContain('[D-NUMMER]');
  });

  it('returns unchanged text when no PII found', () => {
    const clean = 'Pasienten klager over hodepine og kvalme.';
    expect(scrubNorwegianPII(clean)).toBe(clean);
  });
});
