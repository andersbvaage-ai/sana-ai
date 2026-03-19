import { Router, Request, Response } from 'express';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { caseStore } from '../services/cases/caseStore';
import { analyzeCaseText } from '../services/cases/caseAnalyzer';
import { extractTextFromPdf, extractTextFromWord } from '../services/cases/extractText';
import { scrubInput } from '../services/scrubbing/legacyScrubber';
import { writeCaseAuditLog } from '../logging/auditLogger';
import { invokeModel } from '../services/ai/bedrockClient';
import { Case, CaseDocument, DoctorAssessment, CriticalityLevel } from '../config/types';

export const casesRouter = Router();

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Kun PDF og Word-filer er støttet (.pdf, .doc, .docx)'));
    }
  },
});

// ─── Hjelpefunksjon: ekstraher og scrub tekst fra fil ────────────────────────
async function extractAndScrub(buffer: Buffer, mimetype: string) {
  const isPdf = mimetype === 'application/pdf';
  const rawText = isPdf
    ? await extractTextFromPdf(buffer)
    : await extractTextFromWord(buffer);

  if (!rawText || rawText.trim().length < 50) {
    throw new Error('INSUFFICIENT_TEXT');
  }

  return scrubInput(rawText);
}

/** POST /api/cases – last opp første dokument og opprett ny sak */
casesRouter.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'Ingen fil lastet opp', code: 'NO_FILE' });
    return;
  }

  const isPdf = req.file.mimetype === 'application/pdf';
  const filtype: 'pdf' | 'word' = isPdf ? 'pdf' : 'word';
  const filnavn = req.file.originalname.replace(/[^a-zA-Z0-9._\- ]/g, '_');
  const id = uuidv4();
  const requestTimestamp = new Date().toISOString();

  try {
    const { scrubbedText, removedFields } = await extractAndScrub(req.file.buffer, req.file.mimetype);

    // Sjekk at det gjenstår tilstrekkelig tekst ETTER scrubbing
    if (scrubbedText.trim().length < 50) {
      res.status(422).json({ error: 'For lite meningsfull tekst etter fjerning av PII', code: 'INSUFFICIENT_TEXT' });
      return;
    }

    const { analyse, tokensInput, tokensOutput, modellId } = await analyzeCaseText(scrubbedText, id);

    const dokument: CaseDocument = {
      id: uuidv4(),
      filnavn,
      filtype,
      lastOppTidspunkt: requestTimestamp,
    };

    const newCase: Case = {
      id,
      filnavn,
      filtype,
      dokumenter: [dokument],
      lastOppTidspunkt: requestTimestamp,
      status: 'til_vurdering',
      analyse,
      tokensInput,
      tokensOutput,
      modellId,
      scrubbedFields: removedFields,
    };

    await caseStore.add(newCase);

    await writeCaseAuditLog({
      type: 'case_upload', caseId: id, filnavn, filtype,
      requestTimestamp, responseTimestamp: new Date().toISOString(),
      outcome: 'suksess', scrubbedFields: removedFields,
      kritikalitet: analyse.kritikalitet,
    });

    res.status(201).json(newCase);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ukjent feil';
    if (message === 'INSUFFICIENT_TEXT') {
      res.status(422).json({ error: 'Filen inneholder for lite tekst til å analyseres', code: 'INSUFFICIENT_TEXT' });
      return;
    }
    await writeCaseAuditLog({
      type: 'case_error', caseId: id, filnavn, filtype,
      requestTimestamp, responseTimestamp: new Date().toISOString(),
      outcome: 'feil', scrubbedFields: [],
      errorCode: err instanceof Error ? err.constructor.name : 'UNKNOWN_ERROR',
    });
    res.status(500).json({ error: `Analyse feilet: ${message}`, code: 'ANALYSIS_ERROR' });
  }
});

/** POST /api/cases/:id/documents – legg til dokument i eksisterende sak og analyser på nytt */
casesRouter.post('/:id/documents', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  const existing = caseStore.get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Sak ikke funnet', code: 'NOT_FOUND' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'Ingen fil lastet opp', code: 'NO_FILE' });
    return;
  }

  const isPdf = req.file.mimetype === 'application/pdf';
  const filtype: 'pdf' | 'word' = isPdf ? 'pdf' : 'word';
  const filnavn = req.file.originalname.replace(/[^a-zA-Z0-9._\- ]/g, '_');
  const requestTimestamp = new Date().toISOString();

  try {
    const { scrubbedText, removedFields } = await extractAndScrub(req.file.buffer, req.file.mimetype);

    // Hent tekst fra alle eksisterende dokumenter er ikke mulig (ikke lagret),
    // men vi analyserer ny tekst og merger resultatet med ny kontekst
    const combinedText = `[Dokument ${existing.dokumenter.length + 1}: ${filnavn}]\n${scrubbedText}`;

    const { analyse, tokensInput, tokensOutput, modellId } = await analyzeCaseText(combinedText, existing.id);

    const nyttDokument: CaseDocument = {
      id: uuidv4(),
      filnavn,
      filtype,
      lastOppTidspunkt: requestTimestamp,
    };

    const allScrubbedFields = [...(existing.scrubbedFields ?? []), ...removedFields]
      .filter((v, i, a) => a.indexOf(v) === i);

    const updated = await caseStore.update(existing.id, {
      dokumenter: [...existing.dokumenter, nyttDokument],
      analyse,
      tokensInput,
      tokensOutput,
      modellId,
      scrubbedFields: allScrubbedFields,
    });

    await writeCaseAuditLog({
      type: 'case_upload', caseId: existing.id, filnavn, filtype,
      requestTimestamp, responseTimestamp: new Date().toISOString(),
      outcome: 'suksess', scrubbedFields: removedFields,
      kritikalitet: analyse.kritikalitet,
    });

    res.status(200).json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ukjent feil';
    if (message === 'INSUFFICIENT_TEXT') {
      res.status(422).json({ error: 'Filen inneholder for lite tekst', code: 'INSUFFICIENT_TEXT' });
      return;
    }
    res.status(500).json({ error: `Analyse feilet: ${message}`, code: 'ANALYSIS_ERROR' });
  }
});

/** DELETE /api/cases/:id */
casesRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const deleted = await caseStore.delete(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'Sak ikke funnet', code: 'NOT_FOUND' }); return; }
  await writeCaseAuditLog({
    type: 'case_delete', caseId: req.params.id,
    filnavn: '', filtype: 'pdf',
    requestTimestamp: new Date().toISOString(),
    responseTimestamp: new Date().toISOString(),
    outcome: 'suksess', scrubbedFields: [],
  }).catch(err => console.error('[audit] Feil ved logging av sletting:', err));
  res.status(204).send();
});

/** GET /api/cases */
casesRouter.get('/', (_req: Request, res: Response): void => {
  res.json(caseStore.list());
});

/** GET /api/cases/:id */
casesRouter.get('/:id', (req: Request, res: Response): void => {
  const c = caseStore.get(req.params.id);
  if (!c) { res.status(404).json({ error: 'Sak ikke funnet', code: 'NOT_FOUND' }); return; }
  res.json(c);
});

/** PATCH /api/cases/:id/assessment */
casesRouter.patch('/:id/assessment', async (req: Request, res: Response): Promise<void> => {
  const { kritikalitet, estimertTid, notater } = req.body as Partial<DoctorAssessment>;

  const validLevels: CriticalityLevel[] = ['Lav', 'Middels', 'Høy', 'Kritisk'];
  if (kritikalitet && !validLevels.includes(kritikalitet)) {
    res.status(400).json({ error: 'Ugyldig kritikalitetsnivå', code: 'INVALID_INPUT' });
    return;
  }

  const existing = caseStore.get(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Sak ikke funnet', code: 'NOT_FOUND' }); return; }

  const assessment: DoctorAssessment = {
    kritikalitet: kritikalitet ?? existing.analyse.kritikalitet,
    estimertTid: estimertTid ?? existing.analyse.estimertTid,
    notater: notater ?? '',
    vurdertTidspunkt: new Date().toISOString(),
  };

  const updated = await caseStore.update(req.params.id, { status: 'vurdert', legeVurdering: assessment });

  writeCaseAuditLog({
    type: 'case_assessment', caseId: req.params.id,
    filnavn: existing.filnavn, filtype: existing.filtype,
    requestTimestamp: new Date().toISOString(),
    responseTimestamp: new Date().toISOString(),
    outcome: 'suksess', scrubbedFields: [],
    kritikalitet: assessment.kritikalitet,
  }).catch(err => console.error('[audit] Feil ved logging av assessment:', err));

  res.json(updated);
});

/** PATCH /api/cases/:id/title – sett sak-tittel */
casesRouter.patch('/:id/title', async (req: Request, res: Response): Promise<void> => {
  const { tittel } = req.body as { tittel?: string | null };
  if (tittel !== undefined && tittel !== null && (typeof tittel !== 'string' || tittel.length > 200)) {
    res.status(400).json({ error: 'Ugyldig tittel (maks 200 tegn)', code: 'INVALID_INPUT' });
    return;
  }
  const existing = caseStore.get(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Sak ikke funnet', code: 'NOT_FOUND' }); return; }
  const patch: Partial<Case> = {};
  if (tittel === null || tittel === '') {
    patch.tittel = undefined;
  } else if (typeof tittel === 'string') {
    patch.tittel = tittel;
  }
  const updated = await caseStore.update(req.params.id, patch);
  res.json(updated);
});

/** POST /api/cases/:id/ask – still spørsmål til analysen */
casesRouter.post('/:id/ask', async (req: Request, res: Response): Promise<void> => {
  const c = caseStore.get(req.params.id);
  if (!c) { res.status(404).json({ error: 'Sak ikke funnet', code: 'NOT_FOUND' }); return; }

  const { question } = req.body as { question?: string };
  if (!question || question.trim().length < 3) {
    res.status(400).json({ error: 'Spørsmål mangler', code: 'INVALID_INPUT' });
    return;
  }
  if (question.length > 500) {
    res.status(400).json({ error: 'Spørsmålet er for langt (maks 500 tegn)', code: 'INVALID_INPUT' });
    return;
  }

  const systemPrompt = `Du er en medisinsk-faglig rådgiver for et norsk helseforsikringsselskap.
Du hjelper leger med å vurdere klagesaker. Svar konsist og presist på norsk.
Basér svarene dine på analysen som allerede er gjort av saken.

Saksanalyse:
- Sammendrag: ${c.analyse.sammendrag}
- Standpunkt: ${c.analyse.standpunkt} — ${c.analyse.standpunktBegrunnelse}
- Kritikalitet: ${c.analyse.kritikalitet}
- Prioritetsscore: ${c.analyse.prioritetScore}%
- Estimert tid: ${c.analyse.estimertTid}
- Begrunnelse: ${c.analyse.begrunnelse}
- Hovedpunkter: ${c.analyse.hovedpunkter.join(' | ')}
${c.legeVurdering?.notater ? `- Legens notater: ${c.legeVurdering.notater}` : ''}

Svar på legens spørsmål basert på denne konteksten. Hvis spørsmålet ikke kan besvares ut fra tilgjengelig informasjon, si det tydelig.`;

  try {
    const result = await invokeModel(systemPrompt, question.trim(), req.params.id, 800);
    res.json({ answer: result.text, tokensInput: result.inputTokens, tokensOutput: result.outputTokens });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ukjent feil';
    res.status(500).json({ error: `Spørsmål feilet: ${message}`, code: 'AI_ERROR' });
  }
});
