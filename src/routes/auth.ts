import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { verifyCredentials } from '../services/auth/userStore';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'E-post og passord er påkrevd', code: 'INVALID_INPUT' });
    return;
  }

  const user = await verifyCredentials(email.trim().toLowerCase(), password);
  if (!user) {
    res.status(401).json({ error: 'Feil e-post eller passord', code: 'INVALID_CREDENTIALS' });
    return;
  }

  const token = jwt.sign(
    { name: user.name, role: user.role },
    config.jwt.secret,
    { subject: user.email, issuer: 'sana-ai-app', expiresIn: '8h' }
  );

  res.json({ token, name: user.name, role: user.role });
});
