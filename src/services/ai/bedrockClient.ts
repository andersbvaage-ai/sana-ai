/**
 * AI-klient for AWS Bedrock (Claude via Anthropic Messages API).
 *
 * Autentisering via AWS SDK credential chain:
 *   1. Miljøvariabler: AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
 *   2. ~/.aws/credentials (etter `aws configure`)
 *   3. IAM Instance Profile (EC2/ECS/Lambda i produksjon)
 *
 * System-prompt og klinisk tekst sendes som adskilte felt (F3-2)
 * for å hindre prompt injection.
 */

import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from '../../config';
import { AIRequest, AIResponse, ClinicalContext } from '../../config/types';
import { mockAzureAICall } from '../../mock/mockAzureAI';

export class AIClientError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AIClientError';
  }
}

// Delt klient-instans (gjenbrukes på tvers av kall)
export const bedrockClient = new BedrockRuntimeClient({
  region: config.aws.region,
});

// ─── System-prompt (F3-2: holdes adskilt fra klinisk tekst) ───────────────────
function buildSystemPrompt(context: ClinicalContext): string {
  const contextDesc: Record<ClinicalContext, string> = {
    poliklinikk: 'poliklinisk konsultasjon',
    innleggelse: 'innleggelse',
    akutt: 'akutt vurdering',
    laboratorium: 'laboratoriesvar',
    generell: 'klinisk notat',
  };
  return [
    'Du er en klinisk assistent som hjelper norsk helsepersonell med å oppsummere journalnotater.',
    `Kontekst: ${contextDesc[context]}.`,
    'Oppgave: Lag et kortfattet, medisinsk presist sammendrag av det kliniske notatet.',
    'Regler:',
    '- Skriv på norsk bokmål.',
    '- Inkluder: hoveddgrunnlag for kontakt, kliniske funn, diagnose/vurdering, plan.',
    '- IKKE gjenta eller gjengi pasientidentifiserende opplysninger (navn, fødselsnummer, adresse).',
    '- IKKE legg til informasjon som ikke finnes i notatet.',
    '- IKKE gi anbefalinger utover det som fremkommer av notatet.',
    '- Sammendraget skal gjennomgås og godkjennes av helsepersonell før det lagres i journalen.',
  ].join('\n');
}

// ─── Bedrock-svartype for Claude ──────────────────────────────────────────────
interface BedrockClaudeResponse {
  content: Array<{ type: string; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
  stop_reason: string;
}

// ─── Lavnivå-hjelper brukt av både callAI og caseAnalyzer ────────────────────
export async function invokeModel(
  systemPrompt: string,
  userMessage: string,
  requestId: string,
  maxTokens?: number,
  modelId?: string
): Promise<{ text: string; inputTokens: number; outputTokens: number; modelId: string }> {
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens ?? config.aws.maxTokens,
    temperature: 0.1,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  };

  const command = new InvokeModelCommand({
    modelId: modelId ?? config.aws.modelId,
    contentType: 'application/json',
    accept: 'application/json',
    // F3-4: ingen innholdslogging — bruker-request-id for sporing
    body: JSON.stringify(body),
  });

  // AWS SDK does not support a per-request timeout natively;
  // the client-level requestHandler timeout covers this.
  const response = await bedrockClient.send(command);
  const result = JSON.parse(
    new TextDecoder().decode(response.body)
  ) as BedrockClaudeResponse;

  if (!result.content?.[0]?.text || result.stop_reason === 'error') {
    throw new AIClientError('AI_NO_RESPONSE', 'AI-modellen returnerte ingen respons');
  }

  return {
    text: result.content[0].text,
    inputTokens: result.usage.input_tokens,
    outputTokens: result.usage.output_tokens,
    modelId: result.model ?? config.aws.modelId,
  };
}

// ─── Streaming-variant for journal-chat ───────────────────────────────────────
export async function* invokeModelStream(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  requestId: string,
  maxTokens = 8192
): AsyncGenerator<string> {
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.slice(-20),
  };

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: config.aws.modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(body),
  });

  const response = await bedrockClient.send(command);
  for await (const event of response.body!) {
    if (event.chunk?.bytes) {
      const json = JSON.parse(new TextDecoder().decode(event.chunk.bytes)) as {
        type: string;
        delta?: { type: string; text?: string };
      };
      if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta' && json.delta.text) {
        yield json.delta.text;
      }
    }
  }
}

// ─── Hoved-klient for /api/summarize ──────────────────────────────────────────
export async function callAI(
  request: AIRequest,
  noteId: string
): Promise<AIResponse> {
  if (config.mock.enabled && !config.mock.useRealAI) {
    return mockAzureAICall(request, noteId);
  }

  const startTime = Date.now();

  const userMessage = [
    `Lag et sammendrag på ${request.ønsket_lengde.replace('_', ' ')} av følgende kliniske notat:`,
    '',
    request.klinisk_tekst,
  ].join('\n');

  try {
    const result = await invokeModel(
      buildSystemPrompt(request.kontekst),
      userMessage,
      noteId
    );

    return {
      sammendrag: result.text,
      tokensBrukt: { input: result.inputTokens, output: result.outputTokens },
      modellId: result.modelId,
      responseTid: Date.now() - startTime,
    };
  } catch (err) {
    if (err instanceof AIClientError) throw err;

    const e = err as Error & { $metadata?: { httpStatusCode?: number } };

    if (e.name === 'TimeoutError' || e.message?.includes('timeout')) {
      throw new AIClientError('AI_TIMEOUT', 'AWS Bedrock svarte ikke innen ventet tid');
    }
    if (e.$metadata?.httpStatusCode === 429) {
      throw new AIClientError('AI_RATE_LIMITED', 'AWS Bedrock rate limit nådd');
    }
    if (e.$metadata?.httpStatusCode && e.$metadata.httpStatusCode >= 500) {
      throw new AIClientError(
        'AI_SERVICE_ERROR',
        `AWS Bedrock servicefeil: HTTP ${e.$metadata.httpStatusCode}`
      );
    }

    throw new AIClientError('AI_ERROR', `Ukjent AI-feil: ${e.message}`);
  }
}
