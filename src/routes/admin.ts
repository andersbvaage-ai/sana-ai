/**
 * Admin-ruter (krever x-admin-token header).
 *
 * POST /api/admin/kill-switch  – aktiver/deaktiver AI-modulen (seksjon 5.3)
 * GET  /api/admin/status       – hent nåværende kill-switch-tilstand
 * POST /api/review-outcome     – EPJ rapporterer utfall av helsepersonells gjennomgang (F4-4)
 */

import { Router, Request, Response } from 'express';
import { requireAdminToken, setKillSwitch, getKillSwitchState } from '../middleware/killSwitch';
import { writeAuditLog } from '../logging/auditLogger';
import { ReviewOutcome, AuditLogEntry } from '../config/types';

export const adminRouter = Router();

// ─── POST /api/admin/kill-switch ──────────────────────────────────────────────
adminRouter.post('/kill-switch', requireAdminToken, (req: Request, res: Response): void => {
  const { active } = req.body as { active?: boolean };

  if (typeof active !== 'boolean') {
    res.status(400).json({
      error: 'Body må inneholde { "active": true/false }',
      code: 'INVALID_REQUEST',
    });
    return;
  }

  setKillSwitch(active);

  res.status(200).json({
    message: `Kill-switch ${active ? 'aktivert' : 'deaktivert'}`,
    active,
    timestamp: new Date().toISOString(),
  });
});

// ─── GET /api/admin/status ────────────────────────────────────────────────────
adminRouter.get('/status', requireAdminToken, (_req: Request, res: Response): void => {
  res.status(200).json({
    killSwitchActive: getKillSwitchState(),
    timestamp: new Date().toISOString(),
  });
});

// ─── POST /api/review-outcome ─────────────────────────────────────────────────
// Kalles av EPJ-systemet etter at helsepersonell har godkjent, redigert eller forkastet.
// Oppdaterer revisjonsloggen med faktisk utfall (F4-4 / F5-1).
adminRouter.post('/review-outcome', requireAdminToken, async (req: Request, res: Response): Promise<void> => {
  const { correlationId, outcome, userId, patientPseudonym, noteId } = req.body as {
    correlationId?: string;
    outcome?: ReviewOutcome;
    userId?: string;
    patientPseudonym?: string;
    noteId?: string;
  };

  if (!correlationId || !outcome || !userId || !patientPseudonym || !noteId) {
    res.status(400).json({
      error: 'Manglende felt: correlationId, outcome, userId, patientPseudonym, noteId',
      code: 'INVALID_REQUEST',
    });
    return;
  }

  const validOutcomes: ReviewOutcome[] = ['godkjent_uendret', 'redigert', 'forkastet'];
  if (!validOutcomes.includes(outcome)) {
    res.status(400).json({
      error: `Ugyldig outcome. Gyldige verdier: ${validOutcomes.join(', ')}`,
      code: 'INVALID_OUTCOME',
    });
    return;
  }

  // Skriv oppdatert loggoppføring (outcome-oppdatering)
  const updateEntry: AuditLogEntry = {
    correlationId: `${correlationId}_review`,
    userId,
    role: 'annet',            // rollen er allerede logget i original-oppføringen
    patientPseudonym,
    noteId,
    requestTimestamp: new Date().toISOString(),
    responseTimestamp: new Date().toISOString(),
    outcome,
    modelId: 'review_update',
    tokensInput: 0,
    tokensOutput: 0,
    scrubbedFields: [],
  };

  await writeAuditLog(updateEntry);

  res.status(200).json({
    message: 'Utfall registrert i revisjonslogg',
    correlationId,
    outcome,
  });
});
