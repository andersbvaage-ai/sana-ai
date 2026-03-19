import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

declare global {
  namespace Express {
    interface Request {
      currentUser?: { sub: string; name: string; role: string };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Ikke innlogget', code: 'UNAUTHORIZED' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret, {
      issuer: 'sana-ai-app',
    }) as { sub: string; name: string; role: string };
    req.currentUser = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Ugyldig eller utløpt sesjon', code: 'TOKEN_INVALID' });
  }
}
