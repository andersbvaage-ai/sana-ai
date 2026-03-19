/**
 * F2-4 / SK-09: Rate limiting per bruker.
 * Maks 30 forespørsler per bruker per time.
 * Overskridelse blokkeres og varsles til IT-ansvarlig.
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';

export const userRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,           // 1 time
  max: config.rateLimit.maxRequestsPerHour,
  standardHeaders: true,
  legacyHeaders: false,

  // Bruk bruker-ID fra JWT som nøkkel (ikke IP)
  keyGenerator: (req: Request): string => {
    return req.epjContext?.sub ?? req.ip ?? 'unknown';
  },

  handler: (req: Request, res: Response) => {
    const userId = req.epjContext?.sub ?? 'ukjent';

    // I produksjon: send varsel til IT-ansvarlig via Azure Monitor (F5-4)
    console.warn(
      `[RATE_LIMIT] Bruker ${userId} overskredet grense på ` +
      `${config.rateLimit.maxRequestsPerHour} forespørsler/time`
    );

    res.status(429).json({
      error: 'For mange forespørsler. Grense er 30 per time.',
      code: 'RATE_LIMIT_EXCEEDED',
      correlationId: req.correlationId,
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});
