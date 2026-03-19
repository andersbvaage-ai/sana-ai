import request from 'supertest';
import { createApp } from '../src/app';

jest.mock('../src/middleware/requireAuth', () => ({
  requireAuth: (_req: any, _res: any, next: any) => {
    _req.currentUser = { sub: 'test-user', name: 'Test', role: 'user' };
    next();
  },
}));

jest.mock('../src/services/ai/bedrockClient', () => ({
  invokeModel: jest.fn().mockResolvedValue({
    text: '{"symptomDato":"—","vmi":"—","vmiKonfidensNiva":"—","uforegrad":"—"}',
    inputTokens: 0,
    outputTokens: 0,
    modelId: '',
  }),
  invokeModelStream: jest.fn().mockImplementation(async function* () {
    yield 'SCORES:{"svindelrisiko":10,"kompleksitet":20,"informasjonsgrunnlag":30}\nTest response';
  }),
}));

const app = createApp();

describe('POST /api/journal/reset', () => {
  it('returns 200', async () => {
    const res = await request(app).post('/api/journal/reset');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /api/journal/session-status', () => {
  it('returns session status', async () => {
    const res = await request(app).get('/api/journal/session-status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('harDokumenter');
  });
});
