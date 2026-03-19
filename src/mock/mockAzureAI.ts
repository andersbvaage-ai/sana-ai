/**
 * Mock for Azure AI Foundry.
 * Brukes når config.mock.useRealAzure === false (standard i dev).
 * Returnerer et realistisk AI-sammendrag basert på noteId.
 */

import { AIRequest, AIResponse } from '../config/types';

const MOCK_SUMMARIES: Record<string, string> = {
  'NOTAT-001':
    'Pasient med type 2 diabetes til kontroll etter oppstart metformin. ' +
    'God metabolsk respons: HbA1c redusert fra 71 til 58 mmol/mol. ' +
    'Vektnedgang 1,2 kg. Nyreparametere normale. Plan: fortsetter nåværende regime, ' +
    'kostholdsrådgivning, kontroll om 3 måneder.',

  'NOTAT-002':
    'Telefonkontakt vedrørende GI-bivirkninger av metformin. ' +
    'Anbefalt inntak til mat. Videre plan som avtalt.',

  'NOTAT-003':
    'Eldre mannlig pasient innlagt med akutt brystsmerte og dyspné. ' +
    'Funn forenlig med atrieflimmer med hurtig ventrikkelrespons og lett troponinlekkasje. ' +
    'Tegn til akutt hjertesvikt (krepitasjoner, forhøyet pro-BNP). ' +
    'Igangsatt frekvensregulering og antikoagulasjon. Innlagt kardiologisk avdeling.',

  'NOTAT-004':
    'Pasient med kjent recidiverende depresjon og GAD til kontroll. ' +
    'Moderat symptombelastning (PHQ-9: 14, GAD-7: 11) relatert til jobbskifte. ' +
    'Sertralin økes til 150mg. Henvist gruppebasert KAT. Neste kontroll om 3 uker.',
};

export async function mockAzureAICall(
  req: AIRequest,
  noteId: string
): Promise<AIResponse> {
  // Simuler nettverksforsinkelse (300–800ms)
  const delay = 300 + Math.random() * 500;
  await new Promise((r) => setTimeout(r, delay));

  const sammendrag =
    MOCK_SUMMARIES[noteId] ??
    'Klinisk notat prosessert. Ingen spesifikke funn å oppsummere i dette testscenarioet.';

  return {
    sammendrag,
    tokensBrukt: {
      input: Math.floor(req.klinisk_tekst.length / 4),
      output: Math.floor(sammendrag.length / 4),
    },
    modellId: 'mock/claude-sonnet-4-5',
    responseTid: Math.round(delay),
  };
}
