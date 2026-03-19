/**
 * POST /api/summarize
 *
 * Hoved-endepunkt. Kjører gjennom alle faser fra arbeidsdokumentet:
 *  F1: Datautvelgelse og minimering (scrubbing)
 *  F2: Transport (håndteres av middleware)
 *  F3: Azure AI Foundry-kall
 *  F4: Output-validering og svar til EPJ
 *  F5: Revisjonslogg
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { scrubInput, validateInputLength } from '../services/scrubbing/inputScrubber';
import { callAI } from '../services/ai/bedrockClient';
import { validateOutput } from '../services/validation/outputValidator';
import { writeAuditLog, makeErrorEntry } from '../logging/auditLogger';
import {
  AIRequest,
  AuditLogEntry,
  ClinicalContext,
  SummaryLength,
  SummarizeResponse,
} from '../config/types';

export const summarizeRouter = Router();

// ─── Input-schema ──────────────────────────────────────────────────────────────
const RequestSchema = z.object({
  clinicalText: z.string().min(10).max(8000),
  context: z
    .enum(['poliklinikk', 'innleggelse', 'akutt', 'laboratorium', 'generell'])
    .optional()
    .default('generell'),
  desiredLength: z
    .enum(['2-3_setninger', '3-5_setninger', 'utvidet'])
    .optional()
    .default('3-5_setninger'),
});

// ─── POST /api/summarize ──────────────────────────────────────────────────────
summarizeRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const correlationId = req.correlationId!;
  const epj = req.epjContext!;
  const startTime = Date.now();

  // ── Valider request body ───────────────────────────────────────────────────
  const parseResult = RequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'Ugyldig forespørsel',
      code: 'INVALID_REQUEST',
      details: parseResult.error.issues,
      correlationId,
    });
    return;
  }
  const { clinicalText, context, desiredLength } = parseResult.data;

  // ── F1-3: Scrubbing ────────────────────────────────────────────────────────
  let scrubbedText: string;
  let removedFields: string[];

  try {
    const scrubResult = scrubInput(clinicalText);
    scrubbedText = scrubResult.scrubbedText;
    removedFields = scrubResult.removedFields;
    validateInputLength(scrubbedText);
  } catch (err) {
    await writeAuditLog(
      makeErrorEntry(correlationId, epj.sub, epj.patient_id, epj.note_id, 'SCRUB_ERROR')
    );
    res.status(400).json({
      error: (err as Error).message,
      code: 'SCRUB_ERROR',
      correlationId,
    });
    return;
  }

  // ── F1-4: Bygg strukturert AI-forespørsel ─────────────────────────────────
  const aiRequest: AIRequest = {
    klinisk_tekst: scrubbedText,
    formål: 'sammendrag',
    kontekst: context as ClinicalContext,
    ønsket_lengde: desiredLength as SummaryLength,
  };

  // ── F3: Kall Azure AI Foundry ─────────────────────────────────────────────
  let aiResponse;
  try {
    aiResponse = await callAI(aiRequest, epj.note_id);
  } catch (err) {
    const errorCode = (err as { code?: string }).code ?? 'AI_ERROR';
    await writeAuditLog(
      makeErrorEntry(correlationId, epj.sub, epj.patient_id, epj.note_id, errorCode)
    );
    const statusCode = errorCode === 'AI_TIMEOUT' ? 504 : 502;
    res.status(statusCode).json({
      error: (err as Error).message,
      code: errorCode,
      correlationId,
    });
    return;
  }

  // ── F4-2: Output-validering ───────────────────────────────────────────────
  try {
    validateOutput(aiResponse.sammendrag, scrubbedText);
  } catch (err) {
    const errorCode = (err as { code?: string }).code ?? 'OUTPUT_VALIDATION_ERROR';
    await writeAuditLog(
      makeErrorEntry(correlationId, epj.sub, epj.patient_id, epj.note_id, errorCode)
    );
    res.status(422).json({
      error: (err as Error).message,
      code: errorCode,
      correlationId,
    });
    return;
  }

  const totalTime = Date.now() - startTime;

  // ── F5-1: Skriv revisjonslogg ─────────────────────────────────────────────
  // Merk: outcome settes til 'godkjent_uendret' som placeholder.
  // EPJ-systemet er ansvarlig for å kalle /api/review-outcome med faktisk utfall (F4-4).
  const auditEntry: AuditLogEntry = {
    correlationId,
    userId: epj.sub,
    role: epj.role,
    patientPseudonym: epj.patient_id,   // pseudonym, ikke fnr
    noteId: epj.note_id,
    requestTimestamp: new Date(startTime).toISOString(),
    responseTimestamp: new Date().toISOString(),
    outcome: 'godkjent_uendret',        // oppdateres via /api/review-outcome
    modelId: aiResponse.modellId,
    tokensInput: aiResponse.tokensBrukt.input,
    tokensOutput: aiResponse.tokensBrukt.output,
    scrubbedFields: removedFields,
  };
  await writeAuditLog(auditEntry);

  // ── F4-3: Returner svar med tydelig status "pending_review" ───────────────
  const response: SummarizeResponse = {
    correlationId,
    summary: aiResponse.sammendrag,
    status: 'pending_review',           // F4-3: alltid – aldri auto-lagret
    model: aiResponse.modellId,
    processingTimeMs: totalTime,
    warning:
      'AI-generert forslag. MÅ gjennomgås og godkjennes av helsepersonell ' +
      'før innsetting i journalen. Automatisk lagring er ikke tillatt.',
  };

  res.status(200).json(response);
});
