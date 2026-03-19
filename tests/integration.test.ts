/**
 * Integrasjonstest for /api/summarize.
 * Tester de viktigste scenariene fra arbeidsdokumentet.
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { issueToken } from '../src/mock/issueToken';

const app = createApp();

// ── Testscenarioer ─────────────────────────────────────────────────────────────

describe('GET /health', () => {
  test('returnerer 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/summarize – autentisering', () => {
  test('SK-06: manglende token gir 400', async () => {
    const res = await request(app)
      .post('/api/summarize')
      .send({ clinicalText: 'Testnotat.' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_TOKEN');
  });

  test('SK-06: ugyldig token gir 400', async () => {
    const res = await request(app)
      .post('/api/summarize')
      .set('Authorization', 'Bearer ugyldig.token.her')
      .send({ clinicalText: 'Testnotat.' });
    expect([400, 401]).toContain(res.status);
  });

  test('SK-07: ikke-behandler gir 403', async () => {
    // Sekretær Tone Lie er ikke behandler for noen pasienter
    const token = issueToken({
      userId: 'BRUKER-SEKR-LIE',
      role: 'sekretær',
      patientId: 'PASIENT-A7F2',
      noteId: 'NOTAT-001',
    });
    const res = await request(app)
      .post('/api/summarize')
      .set('Authorization', `Bearer ${token}`)
      .send({ clinicalText: 'Klinisk notat om pasientens tilstand.' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NOT_BEHANDLER');
  });

  test('SK-08: reservert pasient gir 403', async () => {
    // PASIENT-C1E5 (Ingrid Olsen) har reservert seg
    const token = issueToken({
      userId: 'BRUKER-DR-BAKKE',
      role: 'lege',
      patientId: 'PASIENT-C1E5',
      noteId: 'NOTAT-004',
    });
    const res = await request(app)
      .post('/api/summarize')
      .set('Authorization', `Bearer ${token}`)
      .send({ clinicalText: 'Klinisk notat om pasientens tilstand.' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PATIENT_RESERVED');
  });
});

describe('POST /api/summarize – gyldig forespørsel', () => {
  const validToken = () =>
    issueToken({
      userId: 'BRUKER-DR-ANDERSEN',
      role: 'lege',
      patientId: 'PASIENT-A7F2',
      noteId: 'NOTAT-001',
    });

  test('returnerer 200 med sammendrag og status pending_review', async () => {
    const res = await request(app)
      .post('/api/summarize')
      .set('Authorization', `Bearer ${validToken()}`)
      .send({
        clinicalText:
          'Pasient med type 2 diabetes til kontroll. HbA1c 58 mmol/mol. God respons på metformin.',
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending_review');
    expect(res.body.summary).toBeTruthy();
    expect(res.body.correlationId).toBeTruthy();
    expect(res.body.warning).toContain('gjennomgås');
  });

  test('F1-3: scrubber fnr fra input og returnerer likevel svar', async () => {
    const res = await request(app)
      .post('/api/summarize')
      .set('Authorization', `Bearer ${validToken()}`)
      .send({
        clinicalText:
          'Pasient fnr: 12057812345. Diagnose: Type 2 diabetes. HbA1c 58 mmol/mol.',
      });
    expect(res.status).toBe(200);
    // Fnr skal ikke forekomme i svaret
    expect(res.body.summary).not.toContain('12057812345');
  });

  test('returnerer korrelasjons-ID i header', async () => {
    const res = await request(app)
      .post('/api/summarize')
      .set('Authorization', `Bearer ${validToken()}`)
      .send({ clinicalText: 'Klinisk notat om diabetespasient.' });
    expect(res.headers['x-correlation-id']).toBeTruthy();
  });

  test('400 ved for kort clinicalText', async () => {
    const res = await request(app)
      .post('/api/summarize')
      .set('Authorization', `Bearer ${validToken()}`)
      .send({ clinicalText: 'For kort.' });
    expect(res.status).toBe(400);
  });
});

describe('Kill-switch', () => {
  test('503 når kill-switch er aktiv', async () => {
    // Aktiver kill-switch
    await request(app)
      .post('/api/admin/kill-switch')
      .set('x-admin-token', 'admin-token-change-in-prod')
      .send({ active: true });

    const token = issueToken({
      userId: 'BRUKER-DR-ANDERSEN',
      role: 'lege',
      patientId: 'PASIENT-A7F2',
      noteId: 'NOTAT-001',
    });

    const res = await request(app)
      .post('/api/summarize')
      .set('Authorization', `Bearer ${token}`)
      .send({ clinicalText: 'Klinisk notat om diabetespasient.' });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('KILL_SWITCH_ACTIVE');

    // Deaktiver kill-switch igjen for øvrige tester
    await request(app)
      .post('/api/admin/kill-switch')
      .set('x-admin-token', 'admin-token-change-in-prod')
      .send({ active: false });
  });
});
