import { createApp } from './app';
import { config } from './config';
import { initCaseStore } from './services/cases/caseStore';

const app = createApp();

initCaseStore().catch(err => {
  console.error('[server] Feil ved initialisering av caseStore:', err);
  process.exit(1);
});

app.listen(config.server.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║          Sana AI – Integrasjonsmodul                     ║
╠══════════════════════════════════════════════════════════╣
║  Port    : ${String(config.server.port).padEnd(46)}║
║  Miljø   : ${config.server.nodeEnv.padEnd(46)}║
║  Mock    : ${String(config.mock.enabled).padEnd(46)}║
║  Bedrock : ${config.aws.region.padEnd(46)}║
╚══════════════════════════════════════════════════════════╝

Endepunkter:
  GET  /health
  POST /api/summarize        (krever EPJ JWT)
  POST /api/admin/kill-switch (krever x-admin-token)
  GET  /api/admin/status      (krever x-admin-token)
  POST /api/admin/review-outcome
`);
});
