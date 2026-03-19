import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { authenticate } from './middleware/authenticate';
import { requireAuth } from './middleware/requireAuth';
import { userRateLimit } from './middleware/rateLimit';
import { killSwitchGuard } from './middleware/killSwitch';
import { summarizeRouter } from './routes/summarize';
import { adminRouter } from './routes/admin';
import { devRouter } from './routes/dev';
import { casesRouter } from './routes/cases';
import { authRouter } from './routes/auth';
import { contactRouter } from './routes/contact';
import { exportRouter } from './routes/export';
import { statsRouter } from './routes/stats';
import { contentRouter } from './routes/content';

export function createApp(): express.Application {
  const app = express();

  // ── Grunnleggende sikkerheitsheadere ──────────────────────────────────────
  // CSP deaktiveres i development for å tillate inline script i testsiden
  app.use(helmet({
    contentSecurityPolicy: process.env['NODE_ENV'] === 'production'
      ? {
          directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'upgrade-insecure-requests': null,
            'script-src': [
              "'self'",
              'cdnjs.cloudflare.com',
              'unpkg.com',
            ],
            'style-src': [
              "'self'",
              "'unsafe-inline'",
              'fonts.googleapis.com',
              'unpkg.com',
            ],
            'font-src': [
              "'self'",
              'fonts.gstatic.com',
            ],
            'img-src': ["'self'", 'data:'],
            'connect-src': ["'self'"],
          },
        }
      : false,
  }));
  app.use(express.json({ limit: '50kb' }));  // begrens request-størrelse

  // ── Health check (ingen auth) ─────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Statiske filer ────────────────────────────────────────────────────────
  app.use(express.static(path.join(process.cwd(), 'public')));

  // ── Dev-verktøy (kun i development) ──────────────────────────────────────
  if (process.env['NODE_ENV'] !== 'production') {
    app.use('/api/dev', devRouter);
  }

  // ── Autentisering ─────────────────────────────────────────────────────────
  app.use('/api/auth', authRouter);

  // ── Innholdsadministrasjon (GET public, PATCH krever auth) ───────────────
  app.use('/api/content', contentRouter);

  // ── Kontaktskjema (ingen auth) ────────────────────────────────────────────
  app.use('/api/contact', contactRouter);

  // ── Klagesaker (krever innlogging) ────────────────────────────────────────
  app.use('/api/cases', requireAuth, casesRouter);
  app.use('/api/cases', requireAuth, exportRouter);
  app.use('/api/stats', requireAuth, statsRouter);

  // ── Admin-ruter (kun admin-token, ikke EPJ-JWT) ───────────────────────────
  app.use('/api/admin', adminRouter);

  // Review-outcome (kalles av EPJ, ikke av helsepersonell direkte)
  app.use('/api/review-outcome', adminRouter);

  // ── Beskyttede ruter: kill-switch → auth → rate limit → handler ───────────
  app.use(
    '/api/summarize',
    killSwitchGuard,
    authenticate,
    userRateLimit,
    summarizeRouter
  );

  // ── 404 ───────────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endepunkt ikke funnet', code: 'NOT_FOUND' });
  });

  // ── Global feilhåndtering ─────────────────────────────────────────────────
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error('[APP] Uventet feil:', err);
      res.status(500).json({ error: 'Intern serverfeil', code: 'INTERNAL_ERROR' });
    }
  );

  return app;
}
