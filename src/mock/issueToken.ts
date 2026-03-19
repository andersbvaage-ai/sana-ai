/**
 * Mock JWT-utsteder.
 * Kjøres med: npx ts-node src/mock/issueToken.ts
 *
 * I produksjon: JWT utstedes av EPJ-systemets Identity Server (DIPS/Carasent).
 * Denne modulen simulerer det for lokalt testformål (Fase F0-2).
 */

import jwt from 'jsonwebtoken';
import { config } from '../config';
import { EPJTokenPayload, UserRole } from '../config/types';

interface IssueOptions {
  userId: string;
  role: UserRole;
  patientId: string;
  noteId: string;
  expiresInMinutes?: number;
}

export function issueToken(opts: IssueOptions): string {
  const payload: Omit<EPJTokenPayload, 'iat' | 'exp'> = {
    sub: opts.userId,
    role: opts.role,
    patient_id: opts.patientId,
    note_id: opts.noteId,
    iss: config.jwt.issuer,
    aud: config.jwt.audience,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: `${opts.expiresInMinutes ?? 60}m`,
    algorithm: 'HS256',
  });
}

// ─── CLI-modus: print testtoken til stdout ────────────────────────────────────
if (require.main === module) {
  const scenarios: IssueOptions[] = [
    {
      userId: 'BRUKER-DR-ANDERSEN',
      role: 'lege',
      patientId: 'PASIENT-A7F2',
      noteId: 'NOTAT-001',
    },
    {
      userId: 'BRUKER-DR-ANDERSEN',
      role: 'lege',
      patientId: 'PASIENT-B3D9',
      noteId: 'NOTAT-003',
    },
    {
      userId: 'BRUKER-SEKR-LIE',
      role: 'sekretær',
      patientId: 'PASIENT-A7F2',
      noteId: 'NOTAT-001',
    },
    {
      userId: 'BRUKER-DR-BAKKE',
      role: 'lege',
      patientId: 'PASIENT-C1E5',  // pasient med reservasjon
      noteId: 'NOTAT-004',
    },
  ];

  console.log('\n=== MOCK JWT TOKENS ===\n');
  for (const s of scenarios) {
    const token = issueToken(s);
    console.log(`Bruker: ${s.userId} | Rolle: ${s.role} | Pasient: ${s.patientId}`);
    console.log(`Token: ${token}`);
    console.log('---');
  }
}
