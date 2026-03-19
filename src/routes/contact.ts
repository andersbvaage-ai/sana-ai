import { Router, Request, Response } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

export const contactRouter = Router();

const s3 = new S3Client({ region: config.aws.region });
const BUCKET = 'sana-ai-cases-480437358794';

contactRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { navn, epost, selskap, melding } = req.body as {
    navn?: string; epost?: string; selskap?: string; melding?: string;
  };

  if (!navn?.trim() || !epost?.trim() || !melding?.trim()) {
    res.status(400).json({ error: 'Navn, e-post og melding er påkrevd', code: 'INVALID_INPUT' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epost.trim())) {
    res.status(400).json({ error: 'Ugyldig e-postadresse', code: 'INVALID_INPUT' });
    return;
  }
  if (melding.trim().length > 2000) {
    res.status(400).json({ error: 'Meldingen er for lang (maks 2000 tegn)', code: 'INVALID_INPUT' });
    return;
  }

  const entry = {
    id: uuidv4(),
    navn: navn.trim(),
    epost: epost.trim(),
    selskap: selskap?.trim() ?? '',
    melding: melding.trim(),
    tidspunkt: new Date().toISOString(),
  };

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `contacts/${entry.tidspunkt.slice(0, 10)}_${entry.id}.json`,
    Body: JSON.stringify(entry, null, 2),
    ContentType: 'application/json',
  }));

  console.log(`[contact] Ny henvendelse fra ${entry.epost} (${entry.navn})`);
  res.status(201).json({ ok: true });
});
