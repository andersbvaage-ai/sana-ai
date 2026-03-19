/**
 * Kill-switch middleware (seksjon 5.3 i arbeidsdokumentet).
 * Deaktiverer AI-modulen umiddelbart for alle innkommende forespørsler.
 *
 * Tilstanden holdes i minnet. I produksjon: bruk Azure App Configuration
 * eller en feature flag-tjeneste for distribusjon på tvers av instanser.
 */

import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { config } from '../config';

// ─── In-memory kill-switch tilstand ───────────────────────────────────────────
let killSwitchActive = config.killSwitch.enabled;

export function getKillSwitchState(): boolean {
  return killSwitchActive;
}

export function setKillSwitch(active: boolean): void {
  killSwitchActive = active;
  console.warn(
    `[KILL_SWITCH] AI-modul ${active ? 'DEAKTIVERT' : 'AKTIVERT'} – ` +
    new Date().toISOString()
  );
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export function killSwitchGuard(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (killSwitchActive) {
    res.status(503).json({
      error: 'AI-oppsummering er midlertidig utilgjengelig.',
      code: 'KILL_SWITCH_ACTIVE',
      message:
        'Tjenesten er deaktivert av IT-ansvarlig. Kontakt systemadministrator.',
    });
    return;
  }
  next();
}

// ─── Admin-autorisasjon for kill-switch ───────────────────────────────────────
export function requireAdminToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers['x-admin-token'];
  const expected = config.killSwitch.adminToken;
  const valid = typeof token === 'string' &&
    token.length === expected.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!valid) {
    res.status(401).json({
      error: 'Ugyldig eller manglende admin-token',
      code: 'UNAUTHORIZED',
    });
    return;
  }
  next();
}
