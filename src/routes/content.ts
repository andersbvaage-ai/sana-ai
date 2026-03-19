import { Router, Request, Response } from 'express';
import {
  getContent, saveContent,
  HEADING_FONTS, BODY_FONTS,
  LandingContent,
} from '../services/content/contentStore';
import { requireAuth } from '../middleware/requireAuth';

export const contentRouter = Router();

/** GET /api/content/landing – returnerer gjeldende konfig (public) */
contentRouter.get('/landing', async (_req: Request, res: Response): Promise<void> => {
  const content = await getContent();
  res.json({ content, headingFonts: Object.keys(HEADING_FONTS), bodyFonts: Object.keys(BODY_FONTS) });
});

/** PATCH /api/content/landing – oppdaterer konfig (krever innlogging) */
contentRouter.patch('/landing', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const patch = req.body as Partial<LandingContent>;

  // Valider font-valg
  if (patch.headingFont && !(patch.headingFont in HEADING_FONTS)) {
    res.status(400).json({ error: 'Ugyldig headingFont', code: 'INVALID_INPUT' }); return;
  }
  if (patch.bodyFont && !(patch.bodyFont in BODY_FONTS)) {
    res.status(400).json({ error: 'Ugyldig bodyFont', code: 'INVALID_INPUT' }); return;
  }

  const updated = await saveContent(patch);
  res.json({ content: updated });
});
