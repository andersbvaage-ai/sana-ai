import { config } from '../../config';
import { CaseAnalysis, CriticalityLevel, Standpunkt } from '../../config/types';
import { AIClientError, invokeModel } from '../ai/bedrockClient';
import { mockCaseAnalysis } from './mockCaseAnalysis';

const SYSTEM_PROMPT = `Du er en medisinsk rådgiver som analyserer klagesaker innen helseforsikring på vegne av norske forsikringsselskaper.

Oppgave: Analyser den vedlagte klagesaken, ta et klart standpunkt til klagen, og returner en strukturert JSON-vurdering.

Returner KUN gyldig JSON i dette eksakte formatet:
{
  "sammendrag": "Kortfattet oppsummering av saken (2–4 setninger)",
  "kritikalitet": "Lav" | "Middels" | "Høy" | "Kritisk",
  "estimertTid": "15–30 min" | "30–60 min" | "1–2 timer" | "Halvdag+",
  "hovedpunkter": ["Punkt 1", "Punkt 2", "..."],
  "begrunnelse": "Begrunnelse for kritikalitetsnivå og tidsestimat (2–3 setninger)",
  "standpunkt": "Støttes" | "Støttes delvis" | "Avvises" | "Uavklart",
  "standpunktBegrunnelse": "Medisinsk-faglig begrunnelse for standpunktet (2–3 setninger)",
  "prioritetScore": <heltall 0–100>
}

Kriterier for kritikalitet:
- Kritisk: Alvorlig pasientskade, dødfall, juridiske implikasjoner, kompleks årsaksutredning
- Høy: Betydelig helseskade, forsinket diagnose av alvorlig sykdom, feilmedisinering
- Middels: Moderat skade eller ulempe, avvik fra protokoll uten alvorlig utfall
- Lav: Administrativ svikt, kommunikasjonssvikt, ingen klinisk skade

Kriterier for standpunkt:
- Støttes: Klagen er medisinsk-faglig velbegrunnet og bør imøtekommes
- Støttes delvis: Klagen har delvis grunnlag – noe bør imøtekommes, noe avvises
- Avvises: Klagen mangler medisinsk grunnlag eller er uberettiget
- Uavklart: Utilstrekkelig dokumentasjon til å ta stilling

Kriterier for prioritetScore (0–100):
- 90–100: Kritisk – umiddelbar gjennomgang nødvendig
- 70–89: Høy prioritet – bør behandles innen kort tid
- 40–69: Middels prioritet – ordinær saksbehandling
- 0–39: Lav prioritet – kan vente

Regler:
- Skriv på norsk bokmål
- IKKE inkluder pasientidentifiserende opplysninger i svaret
- Vær presis og faktabasert
- Returner kun JSON, ingen annen tekst`;

export interface CaseAnalysisResult {
  analyse: CaseAnalysis;
  tokensInput: number;
  tokensOutput: number;
  modellId: string;
}

export async function analyzeCaseText(text: string, caseId: string): Promise<CaseAnalysisResult> {
  if (config.mock.enabled && !config.mock.useRealAI) {
    return { analyse: await mockCaseAnalysis(text), tokensInput: 0, tokensOutput: 0, modellId: 'mock' };
  }

  try {
    const result = await invokeModel(
      SYSTEM_PROMPT,
      `Analyser følgende klagesak:\n\n${text}`,
      caseId,
      2000
    );

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new AIClientError('AI_INVALID_RESPONSE', 'AI returnerte ikke gyldig JSON');

    let parsed: CaseAnalysis;
    try {
      parsed = JSON.parse(jsonMatch[0]) as CaseAnalysis;
    } catch {
      throw new AIClientError('AI_INVALID_RESPONSE', 'AI returnerte ugyldig JSON-struktur');
    }
    if (!parsed.sammendrag || !parsed.kritikalitet || !parsed.estimertTid) {
      throw new AIClientError('AI_INVALID_RESPONSE', 'AI-respons mangler påkrevde felt');
    }

    const validLevels: CriticalityLevel[] = ['Lav', 'Middels', 'Høy', 'Kritisk'];
    if (!validLevels.includes(parsed.kritikalitet)) parsed.kritikalitet = 'Middels';

    const validStandpunkt: Standpunkt[] = ['Støttes', 'Støttes delvis', 'Avvises', 'Uavklart'];
    if (!validStandpunkt.includes(parsed.standpunkt)) parsed.standpunkt = 'Uavklart';

    if (typeof parsed.prioritetScore !== 'number' || parsed.prioritetScore < 0 || parsed.prioritetScore > 100) {
      parsed.prioritetScore = 50;
    }

    return { analyse: parsed, tokensInput: result.inputTokens, tokensOutput: result.outputTokens, modellId: result.modelId };
  } catch (err) {
    if (err instanceof AIClientError) throw err;
    const e = err as Error;
    if (e.name === 'TimeoutError') throw new AIClientError('AI_TIMEOUT', 'AI-tjenesten svarte ikke i tide');
    throw new AIClientError('AI_ERROR', `AI-analyse feilet: ${e.message}`);
  }
}
