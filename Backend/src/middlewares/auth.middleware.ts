import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { AuthTokenPayload, verifyAuthToken } from '../utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
      isInternal?: boolean;
    }
  }
}

function readBearer(req: Request): string {
  const header = String(req.headers.authorization || '');
  return header.replace(/^Bearer\s+/i, '').trim();
}

export function isInternalRequest(req: Request): boolean {
  const provided = String(req.headers['x-internal-key'] || '');
  const expected = config.internalApiKey;
  if (!expected || !provided || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export function isAdminUser(user?: AuthTokenPayload): boolean {
  return user?.role === 'super_admin' || user?.role === 'admin';
}

/**
 * Attaches req.user / req.isInternal when valid credentials are present; never rejects.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readBearer(req);
  if (token && token.split('.').length === 3) {
    const payload = verifyAuthToken(token);
    if (payload) req.user = payload;
  }
  req.isInternal = isInternalRequest(req);
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  optionalAuth(req, res, () => {
    if (!isAdminUser(req.user)) {
      res.status(401).json({ success: false, error: 'Administrator authentication required. Please sign in again.' });
      return;
    }
    next();
  });
}

export function requireInternal(req: Request, res: Response, next: NextFunction): void {
  if (!isInternalRequest(req)) {
    res.status(401).json({ success: false, error: 'Invalid internal API key' });
    return;
  }
  req.isInternal = true;
  next();
}
