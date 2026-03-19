/**
 * F0-4: Verifiserer at helsepersonell er registrert behandler for pasienten.
 *
 * I produksjon: gjør HTTP-kall til EPJ-systemets API (EPJ-KRAV-04).
 * I mock-modus: slår opp i lokalt register.
 */

import { config } from '../../config';
import { isBehandler } from '../../mock/data/behandlere';

export class BehandlerVerificationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'BehandlerVerificationError';
  }
}

export async function verifyBehandler(
  userId: string,
  patientId: string
): Promise<void> {
  const authorized = config.mock.enabled
    ? await mockBehandlerCheck(userId, patientId)
    : await productionBehandlerCheck(userId, patientId);

  if (!authorized) {
    throw new BehandlerVerificationError(
      'NOT_BEHANDLER',
      `Bruker ${userId} er ikke registrert behandler for pasient ${patientId}`
    );
  }
}

// ─── Mock (dev) ───────────────────────────────────────────────────────────────
async function mockBehandlerCheck(
  userId: string,
  patientId: string
): Promise<boolean> {
  return isBehandler(userId, patientId);
}

// ─── Produksjon ───────────────────────────────────────────────────────────────
async function productionBehandlerCheck(
  userId: string,
  patientId: string
): Promise<boolean> {
  /**
   * EPJ-KRAV-04: EPJ eksponerer et API-endepunkt der Sana AI kan verifisere
   * at bruker_ID er registrert behandler for pasient_ID. Svar innen 2 sekunder.
   *
   * Eksempel-kall:
   *   GET /api/behandler-check?userId={userId}&patientId={patientId}
   *   Authorization: Bearer <service-to-service token>
   *   -> { "isBehandler": true/false }
   */
  const epjApiUrl = process.env['EPJ_API_URL'];
  const epjApiToken = process.env['EPJ_API_TOKEN'];

  if (!epjApiUrl || !epjApiToken) {
    throw new BehandlerVerificationError(
      'CONFIG_ERROR',
      'EPJ_API_URL eller EPJ_API_TOKEN er ikke konfigurert'
    );
  }

  const axios = (await import('axios')).default;
  const response = await axios.get<{ isBehandler: boolean }>(
    `${epjApiUrl}/api/behandler-check`,
    {
      params: { userId, patientId },
      headers: { Authorization: `Bearer ${epjApiToken}` },
      timeout: 2000,  // EPJ-KRAV-04: svar innen 2 sekunder
    }
  );

  return response.data.isBehandler;
}
