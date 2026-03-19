/**
 * F0-5: Sjekker om pasient har reservert seg mot AI-behandling.
 *
 * I produksjon: synkronisert liste fra EPJ eller webhook-basert (EPJ-KRAV-05).
 * I mock-modus: hardkodet liste.
 */

import { config } from '../../config';
import { RESERVATION_LIST } from '../../mock/data/patients';

export class ReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReservationError';
  }
}

export async function checkReservation(patientId: string): Promise<void> {
  const hasReserved = config.mock.enabled
    ? await mockReservationCheck(patientId)
    : await productionReservationCheck(patientId);

  if (hasReserved) {
    throw new ReservationError(
      `Pasient ${patientId} har reservert seg mot AI-behandling. Forespørselen avvises.`
    );
  }
}

// ─── Mock (dev) ───────────────────────────────────────────────────────────────
async function mockReservationCheck(patientId: string): Promise<boolean> {
  return RESERVATION_LIST.has(patientId);
}

// ─── Produksjon ───────────────────────────────────────────────────────────────
async function productionReservationCheck(patientId: string): Promise<boolean> {
  /**
   * EPJ-KRAV-05: Reservasjonsregister tilgjengelig som API eller synkronisert liste.
   *
   * To alternativer:
   * A) API-oppslag per forespørsel (enklest):
   *    GET /api/reservations/{patientId}
   *    -> { "hasReserved": true/false }
   *
   * B) Synkronisert lokal cache oppdatert via webhook (raskere, EPJ-ANBEF-03):
   *    EPJ poster til /api/webhooks/reservation når pasient reserverer/avreserverer.
   *    Sana AI vedlikeholder en lokal cache.
   *
   * Implementasjonen nedenfor bruker alternativ A.
   */
  const epjApiUrl = process.env['EPJ_API_URL'];
  const epjApiToken = process.env['EPJ_API_TOKEN'];

  if (!epjApiUrl || !epjApiToken) {
    // Fail safe: ved konfigurasjonsfeil avviser vi forespørselen
    throw new ReservationError(
      'Reservasjonsregister ikke tilgjengelig – forespørselen avvises av sikkerhetshensyn'
    );
  }

  const axios = (await import('axios')).default;
  const response = await axios.get<{ hasReserved: boolean }>(
    `${epjApiUrl}/api/reservations/${patientId}`,
    {
      headers: { Authorization: `Bearer ${epjApiToken}` },
      timeout: 2000,
    }
  );

  return response.data.hasReserved;
}
