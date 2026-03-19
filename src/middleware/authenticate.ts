/**
 * Autentiserings-middleware (F0-1 til F0-5).
 * Kjøres på alle beskyttede ruter.
 *
 * Rekkefølge:
 *  1. Valider JWT (F0-3)
 *  2. Verifiser behandler (F0-4)
 *  3. Sjekk reservasjon (F0-5)
 *  4. Legg validert kontekst på request-objektet
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validateToken, TokenValidationError } from '../services/auth/tokenValidator';
import { verifyBehandler, BehandlerVerificationError } from '../services/auth/behandlerVerifier';
import { checkReservation, ReservationError } from '../services/auth/reservationChecker';
import { EPJTokenPayload } from '../config/types';

// Utvid Express Request med validert kontekst
declare global {
  namespace Express {
    interface Request {
      epjContext?: EPJTokenPayload;
      correlationId?: string;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Generer korrelasjons-ID for sporbarhet (F4-1)
  req.correlationId = uuidv4();
  res.setHeader('X-Correlation-ID', req.correlationId);

  try {
    // F0-3: Valider JWT
    const payload = await validateToken(req.headers.authorization);

    // F0-4: Verifiser at bruker er behandler for pasienten
    await verifyBehandler(payload.sub, payload.patient_id);

    // F0-5: Sjekk reservasjon
    await checkReservation(payload.patient_id);

    // Legg validert kontekst på request
    req.epjContext = payload;
    next();

  } catch (err) {
    if (err instanceof TokenValidationError) {
      const statusCode = err.code === 'TOKEN_EXPIRED' ? 401 : 400;
      res.status(statusCode).json({
        error: err.message,
        code: err.code,
        correlationId: req.correlationId,
      });
      return;
    }

    if (err instanceof BehandlerVerificationError) {
      res.status(403).json({
        error: err.message,
        code: err.code,
        correlationId: req.correlationId,
      });
      return;
    }

    if (err instanceof ReservationError) {
      res.status(403).json({
        error: err.message,
        code: 'PATIENT_RESERVED',
        correlationId: req.correlationId,
      });
      return;
    }

    // Uventet feil
    console.error('[AUTH] Uventet autentiseringsfeil:', err);
    res.status(500).json({
      error: 'Intern autentiseringsfeil',
      code: 'AUTH_ERROR',
      correlationId: req.correlationId,
    });
  }
}
