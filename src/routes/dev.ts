/**
 * Utviklings-ruter – kun tilgjengelig når NODE_ENV=development.
 * Tilbyr token-utstedelse og scrubbing-forhåndsvisning for testformål.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import path from 'path';
import { scrubInput } from '../services/scrubbing/legacyScrubber';
import { issueToken } from '../mock/issueToken';
import { UserRole } from '../config/types';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Kun PDF-filer er tillatt'));
    }
  },
});

const PDF_PARSER = path.join(__dirname, '../services/pdf/parsePdf.mjs');

function parsePdfBuffer(buffer: Buffer): Promise<{ text: string; pages: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [PDF_PARSER], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { err += d.toString(); });
    child.on('close', (code: number) => {
      if (code !== 0) return reject(new Error(err || 'PDF-parsing feilet'));
      try { resolve(JSON.parse(out)); } catch { reject(new Error('Ugyldig JSON fra PDF-parser')); }
    });
    child.stdin.write(buffer.toString('base64'));
    child.stdin.end();
  });
}

export const devRouter = Router();

/** POST /api/dev/token – utsteder et mock-JWT */
devRouter.post('/token', (req: Request, res: Response): void => {
  const {
    userId = 'BRUKER-DR-ANDERSEN',
    role = 'lege',
    patientId = 'PASIENT-A7F2',
    noteId = 'NOTAT-001',
  } = req.body as Partial<{
    userId: string;
    role: UserRole;
    patientId: string;
    noteId: string;
  }>;

  const token = issueToken({ userId, role: role as UserRole, patientId, noteId });
  res.json({ token });
});

/** POST /api/dev/scrub – returnerer scrubbing-resultat uten AI-kall */
devRouter.post('/scrub', (req: Request, res: Response): void => {
  const { text } = req.body as { text?: string };
  if (!text) {
    res.status(400).json({ error: 'Feltet "text" er påkrevd' });
    return;
  }
  const result = scrubInput(text);
  res.json({ original: text, ...result });
});

/** POST /api/dev/parse-pdf – laster opp PDF og returnerer tekst */
devRouter.post('/parse-pdf', upload.single('pdf'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'Ingen PDF-fil lastet opp' });
    return;
  }
  try {
    const text = await parsePdfBuffer(req.file.buffer);
    res.json({ text: text.text, pages: text.pages });
  } catch {
    res.status(422).json({ error: 'Kunne ikke lese PDF-filen' });
  }
});
