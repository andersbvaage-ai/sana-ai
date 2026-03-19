/**
 * F0-3: Validerer JWT-token fra EPJ-systemet.
 *
 * To modi:
 *  - 'symmetric' (mock/dev): HMAC-SHA256 med delt secret
 *  - 'jwks' (produksjon): RSA/ECDSA verifisert mot EPJ-systemets JWKS-endepunkt
 */

import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { EPJTokenPayload } from '../../config/types';

export class TokenValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export async function validateToken(
  authHeader: string | undefined
): Promise<EPJTokenPayload> {
  // Trekk ut Bearer-token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new TokenValidationError(
      'MISSING_TOKEN',
      'Authorization-header mangler eller er ikke Bearer-format'
    );
  }
  const token = authHeader.slice(7);

  try {
    if (config.jwt.mode === 'symmetric') {
      // ── Symmetrisk validering (mock/dev) ────────────────────────────────────
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        algorithms: ['HS256'],
      }) as EPJTokenPayload;

      return validateClaims(decoded);
    } else {
      // ── JWKS-validering (produksjon) ─────────────────────────────────────────
      // jwks-rsa henter offentlig nøkkel fra EPJ-systemets JWKS-endepunkt
      // og cacher den for å unngå gjentatte HTTP-kall
      const { createRemoteJWKSet, jwtVerify } = await import('jose');
      const JWKS = createRemoteJWKSet(new URL(config.jwt.jwksUri));
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      });
      return validateClaims(payload as unknown as EPJTokenPayload);
    }
  } catch (err) {
    if (err instanceof TokenValidationError) throw err;

    const e = err as Error;
    if (e.message.includes('expired')) {
      throw new TokenValidationError('TOKEN_EXPIRED', 'Token er utløpt');
    }
    if (e.message.includes('invalid signature')) {
      throw new TokenValidationError('INVALID_SIGNATURE', 'Ugyldig token-signatur');
    }
    throw new TokenValidationError('INVALID_TOKEN', `Token-validering feilet: ${e.message}`);
  }
}

/** Verifiser at alle påkrevde claims er til stede */
function validateClaims(payload: EPJTokenPayload): EPJTokenPayload {
  const required: (keyof EPJTokenPayload)[] = [
    'sub', 'role', 'patient_id', 'note_id', 'iss', 'aud',
  ];
  for (const claim of required) {
    if (!payload[claim]) {
      throw new TokenValidationError(
        'MISSING_CLAIM',
        `Påkrevd claim mangler i token: ${claim}`
      );
    }
  }

  const validRoles = ['lege', 'sykepleier', 'sekretær', 'annet'];
  if (!validRoles.includes(payload.role)) {
    throw new TokenValidationError(
      'INVALID_ROLE',
      `Ugyldig rolle i token: ${payload.role}`
    );
  }

  return payload;
}
