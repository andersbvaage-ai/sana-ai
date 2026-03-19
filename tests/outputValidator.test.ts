import { validateOutput, OutputValidationError } from '../src/services/validation/outputValidator';

const VALID_INPUT = 'Pasient med type 2 diabetes, HbA1c 58 mmol/mol. God respons på metformin.';
const VALID_OUTPUT = 'Diabetespasient med god metabolsk respons. HbA1c normalisert. Videre oppfølging planlagt.';

describe('outputValidator', () => {
  test('godtar gyldig output', () => {
    expect(() => validateOutput(VALID_OUTPUT, VALID_INPUT)).not.toThrow();
  });

  test('avviser output som er for kort', () => {
    expect(() => validateOutput('For kort.', VALID_INPUT))
      .toThrow(OutputValidationError);
  });

  test('avviser output med HTML-tags', () => {
    expect(() =>
      validateOutput('<b>Diabetespasient</b> med god respons.', VALID_INPUT)
    ).toThrow(OutputValidationError);
  });

  test('avviser output med script-tag', () => {
    expect(() =>
      validateOutput('Sammendrag. <script>alert(1)</script>', VALID_INPUT)
    ).toThrow(OutputValidationError);
  });

  test('avviser output som inneholder scrubbing-markør', () => {
    expect(() =>
      validateOutput('Pasient [FNR FJERNET] møtte til kontroll.', VALID_INPUT)
    ).toThrow(OutputValidationError);
  });

  test('feilkode er korrekt for markup', () => {
    try {
      validateOutput('<b>Diabetespasient</b> med god respons.', VALID_INPUT);
      fail('Skal kaste feil');
    } catch (err) {
      expect((err as OutputValidationError).code).toBe('OUTPUT_CONTAINS_MARKUP');
    }
  });
});
