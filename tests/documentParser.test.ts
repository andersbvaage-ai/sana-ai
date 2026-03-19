import { parseBuffer, ParsedDocument } from '../src/services/documents/documentParser';

describe('parseBuffer', () => {
  it('throws on unsupported file type', async () => {
    const buf = Buffer.from('hello');
    await expect(parseBuffer(buf, 'file.xyz')).rejects.toThrow('Unsupported');
  });

  it('returns ParsedDocument shape for pdf', async () => {
    // Minimal valid 1-page PDF
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const bytes = await pdfDoc.save();
    const buf = Buffer.from(bytes);
    const result = await parseBuffer(buf, 'test.pdf');
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('pages');
    expect(typeof result.text).toBe('string');
    expect(typeof result.pages).toBe('number');
  });
});

describe('isMandateFilename', () => {
  it('detects mandat in filename', () => {
    const { isMandateFilename } = require('../src/services/documents/documentParser');
    expect(isMandateFilename('oppdrag_2024.pdf')).toBe(true);
    expect(isMandateFilename('MANDAT_01.pdf')).toBe(true);
    expect(isMandateFilename('journal.pdf')).toBe(false);
  });
});
