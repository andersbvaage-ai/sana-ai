import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { parseBuffer, parseZip } from '../services/documents/documentParser';
import {
  getSession, setSession, resetSession, createEmptySession, buildDocumentBlock,
} from '../services/journal/documentStore';
import { buildJournalSystemPrompt, extractScores, stripScoresPrefix } from '../services/journal/journalPrompt';
import { extractFacts } from '../services/journal/factExtractor';
import { invokeModelStream } from '../services/ai/bedrockClient';

export const journalRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

function getUserId(req: Request): string {
  return req.currentUser?.sub ?? 'anonymous';
}

// ── Upload documents ────────────────────────────────────────────────────────
journalRouter.post(
  '/last-opp',
  upload.fields([
    { name: 'journal', maxCount: 1 },
    { name: 'nav', maxCount: 1 },
    { name: 'legeerklæring', maxCount: 1 },
    { name: 'mandat', maxCount: 1 },
    { name: 'samlet', maxCount: 1 },
    { name: 'zip', maxCount: 1 },
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(req);
    const files = req.files as Record<string, Express.Multer.File[]>;
    const session = createEmptySession(userId);

    try {
      if (files?.zip?.[0]) {
        const { documents, mandateDoc, combinedText } = await parseZip(
          files.zip[0].buffer,
          files.zip[0].originalname
        );
        session.documents.samlet = {
          text: combinedText,
          pages: documents.reduce((s, d) => s + d.pages, 0),
          filename: `${files.zip[0].originalname} (${documents.length} filer)`,
          isZip: true,
          zipFiles: documents.map(d => d.filename),
        };
        if (mandateDoc) session.documents.mandat = mandateDoc;
      } else if (files?.samlet?.[0]) {
        session.documents.samlet = await parseBuffer(files.samlet[0].buffer, files.samlet[0].originalname);
      } else {
        for (const field of ['journal', 'nav', 'legeerklæring', 'mandat'] as const) {
          if (files?.[field]?.[0]) {
            session.documents[field] = await parseBuffer(files[field][0].buffer, files[field][0].originalname);
          }
        }
      }

      const hasDocuments = Object.keys(session.documents).length > 0;
      if (!hasDocuments) {
        res.status(400).json({ error: 'Ingen gyldige filer mottatt', code: 'NO_DOCUMENTS' });
        return;
      }

      setSession(userId, session);
      res.status(201).json({ ok: true, harMandat: !!session.documents.mandat });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message, code: 'PARSE_ERROR' });
    }
  }
);

// ── SSE chat ────────────────────────────────────────────────────────────────
journalRouter.post('/chat', async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { melding } = req.body as { melding?: string };

  if (!melding?.trim()) {
    res.status(400).json({ error: 'Melding mangler', code: 'INVALID_INPUT' });
    return;
  }

  const session = getSession(userId);
  if (!session || Object.keys(session.documents).length === 0) {
    res.status(400).json({ error: 'Ingen dokumenter lastet opp', code: 'NO_DOCUMENTS' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sse = (event: string, data: unknown) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  session.conversation.push({ role: 'user', content: melding });
  const systemPrompt = buildJournalSystemPrompt(buildDocumentBlock(session));

  try {
    let fullText = '';
    const requestId = uuidv4();

    for await (const token of invokeModelStream(systemPrompt, session.conversation, requestId)) {
      sse('token', { text: token });
      fullText += token;
    }

    const scores = extractScores(fullText);
    if (scores) {
      session.scores = scores;
      sse('scores', scores);
    }

    session.conversation.push({ role: 'assistant', content: stripScoresPrefix(fullText) });
    session.conversation = session.conversation.slice(-20);
    setSession(userId, session);

    sse('done', { ok: true });
  } catch (err) {
    sse('error', { message: (err as Error).message });
  }

  res.end();
});

// ── Key facts extraction ────────────────────────────────────────────────────
journalRouter.post('/fakta', async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const session = getSession(userId);
  if (!session) {
    res.status(400).json({ error: 'Ingen dokumenter lastet opp', code: 'NO_DOCUMENTS' });
    return;
  }
  const facts = await extractFacts(session, uuidv4());
  res.json(facts);
});

// ── Reset session ───────────────────────────────────────────────────────────
journalRouter.post('/reset', (req: Request, res: Response) => {
  resetSession(getUserId(req));
  res.json({ ok: true });
});

// ── Session status ──────────────────────────────────────────────────────────
journalRouter.get('/session-status', (req: Request, res: Response) => {
  const session = getSession(getUserId(req));
  const d = session?.documents ?? {};
  res.json({
    harDokumenter: !!session && Object.keys(d).length > 0,
    harMandat: !!d.mandat,
    antallMeldinger: Math.floor((session?.conversation.length ?? 0) / 2),
    scores: session?.scores ?? { svindelrisiko: 0, kompleksitet: 0, informasjonsgrunnlag: 0 },
  });
});
