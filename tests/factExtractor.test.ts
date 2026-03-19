import { extractFacts } from '../src/services/journal/factExtractor';
import { createEmptySession } from '../src/services/journal/documentStore';
import { ParsedDocument } from '../src/services/documents/documentParser';

jest.mock('../src/services/ai/bedrockClient', () => ({
  invokeModel: jest.fn().mockResolvedValue({
    text: '{"symptomDato":"15.06.2021","vmi":"10–15 % (1997-tabellen)","vmiKonfidensNiva":"Middels – diagnose dokumentert, mangler sakkyndig","uforegrad":"100 % sykemeldt"}',
    inputTokens: 100,
    outputTokens: 50,
    modelId: 'anthropic.claude-haiku-4-5-20251001',
  }),
  invokeModelStream: jest.fn(),
}));

describe('extractFacts', () => {
  it('returns structured facts from document session', async () => {
    const session = createEmptySession('user-1');
    const doc: ParsedDocument = { text: 'Pasient ble skadet 15.06.2021', pages: 1, filename: 'journal.pdf' };
    session.documents.journal = doc;

    const facts = await extractFacts(session, 'req-1');
    expect(facts).toHaveProperty('symptomDato');
    expect(facts).toHaveProperty('vmi');
    expect(facts).toHaveProperty('uforegrad');
  });

  it('returns fallback on parse error', async () => {
    const { invokeModel } = require('../src/services/ai/bedrockClient');
    invokeModel.mockResolvedValueOnce({ text: 'not json', inputTokens: 0, outputTokens: 0, modelId: '' });

    const session = createEmptySession('user-2');
    const facts = await extractFacts(session, 'req-2');
    expect(facts.symptomDato).toBe('—');
  });
});
