import { invokeModel } from '../ai/bedrockClient';
import { JournalSession, buildDocumentBlock } from './documentStore';

const HAIKU_MODEL_ID = 'anthropic.claude-haiku-4-5-20251001';

export interface JournalFacts {
  symptomDato: string;
  vmi: string;
  vmiKonfidensNiva: string;
  uforegrad: string;
}

const FALLBACK: JournalFacts = {
  symptomDato: '—',
  vmi: '—',
  vmiKonfidensNiva: '—',
  uforegrad: '—',
};

export async function extractFacts(session: JournalSession, requestId: string): Promise<JournalFacts> {
  const docBlock = buildDocumentBlock(session);
  if (!docBlock.trim()) return FALLBACK;

  const systemPrompt = 'Du er en medisinsk dokumentanalysator. Svar KUN med ett JSON-objekt, ingen annen tekst.';
  const userMessage = `Les dokumentet og svar med KUN dette JSON-objektet:
{"symptomDato":"[første symptom/skade-dato, f.eks. '15.06.2021', eller 'Ikke funnet']",
"vmi":"[VMI-prosent og tabell, f.eks. '10–15 % (1997-tabellen)', eller 'Ikke vurdert']",
"vmiKonfidensNiva":"[ett av: 'Høy – spesialistuttalelse foreligger', 'Middels – diagnose dokumentert, mangler sakkyndig', 'Lav – mangler diagnose eller spesialistuttalelse']",
"uforegrad":"[uføregrad, f.eks. '100 % sykemeldt siden 2021', eller 'Ikke dokumentert']"}

DOKUMENT:
${docBlock.substring(0, 40000)}`;

  try {
    const result = await invokeModel(systemPrompt, userMessage, requestId, 256, HAIKU_MODEL_ID);
    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) return FALLBACK;
    return JSON.parse(match[0]) as JournalFacts;
  } catch (err) {
    console.error('[factExtractor] extractFacts failed:', (err as Error).message);
    return FALLBACK;
  }
}
