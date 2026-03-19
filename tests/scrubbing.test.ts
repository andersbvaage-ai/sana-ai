import { scrubInput } from '../src/services/scrubbing/legacyScrubber';

describe('inputScrubber', () => {
  test('fjerner fødselsnummer', () => {
    const { scrubbedText, removedFields } = scrubInput(
      'Pasient med fnr: 12057812345 møtte til kontroll.'
    );
    expect(scrubbedText).not.toContain('12057812345');
    expect(scrubbedText).toContain('[FNR FJERNET]');
    expect(removedFields).toContain('fødselsnummer_etikett');
  });

  test('fjerner telefonnummer', () => {
    const { scrubbedText, removedFields } = scrubInput(
      'Pårørende: Per Hansen, tlf 98765432.'
    );
    expect(scrubbedText).not.toContain('98765432');
    expect(removedFields).toContain('telefonnummer');
  });

  test('fjerner gateadresse', () => {
    const { scrubbedText, removedFields } = scrubInput(
      'Bor på Storgata 12, 0182 Oslo.'
    );
    expect(scrubbedText).not.toContain('Storgata 12');
    expect(removedFields).toContain('gateadresse');
  });

  test('fjerner pårørende-linje', () => {
    const { scrubbedText, removedFields } = scrubInput(
      'Pårørende: Kari Nordmann, ektefelle.'
    );
    expect(scrubbedText).not.toMatch(/Pårørende: Kari Nordmann/i);
    expect(removedFields).toContain('parorende');
  });

  test('beholder klinisk innhold', () => {
    const klinisk = 'Pasienten har type 2 diabetes, HbA1c 58 mmol/mol.';
    const { scrubbedText } = scrubInput(klinisk);
    expect(scrubbedText).toContain('HbA1c 58 mmol/mol');
  });

  test('scrubber komplett journalnotat korrekt', () => {
    const notat = `Pasient: Kari Nordmann, fnr: 12057812345
Adresse: Storgata 12, 0182 Oslo
Pårørende: Per Nordmann, tlf: 98765432
Diagnose: Type 2 diabetes. HbA1c 58 mmol/mol. Plan: kontroll om 3 mnd.`;

    const { scrubbedText, removedFields } = scrubInput(notat);
    expect(scrubbedText).not.toContain('12057812345');
    expect(scrubbedText).not.toContain('98765432');
    expect(scrubbedText).toContain('HbA1c 58 mmol/mol');
    expect(removedFields.length).toBeGreaterThan(0);
  });
});
