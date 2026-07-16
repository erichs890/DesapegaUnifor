import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { db, type Usuario } from './db.js';

/**
 * Segredo do JWT: em produção vem de env; em dev usa um valor fixo para o
 * token sobreviver a restarts do tsx watch (login não cai a cada save).
 */
export const JWT_SECRET = process.env.JWT_SECRET ?? 'desapego-dev-secret-troque-em-producao';
const TOKEN_TTL = '7d';

export interface AuthRequest extends Request {
  user?: Usuario;
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function userFromHeader(req: Request): Usuario | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const sub = typeof payload === 'object' && payload.sub ? Number(payload.sub) : NaN;
    if (!Number.isInteger(sub)) return null;
    const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(sub) as unknown as
      | Usuario
      | undefined;
    return user ?? null;
  } catch {
    return null;
  }
}

/** 401 se não houver token válido; popula req.user. */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const user = userFromHeader(req);
  if (!user) {
    res.status(401).json({ error: 'Você precisa estar logado. Entre na sua conta e tente de novo.' });
    return;
  }
  req.user = user;
  next();
}

/** Popula req.user se houver token válido; segue em frente se não houver. */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const user = userFromHeader(req);
  if (user) req.user = user;
  next();
}

/* ---- Rate limit simples em memória: 5 tentativas de login/minuto por email ---- */
const attempts = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

export function loginRateLimited(email: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(email) ?? []).filter((t) => now - t < WINDOW_MS);
  attempts.set(email, recent);
  return recent.length >= MAX_ATTEMPTS;
}

export function registerLoginAttempt(email: string): void {
  const list = attempts.get(email) ?? [];
  list.push(Date.now());
  attempts.set(email, list);
}

export function clearLoginAttempts(email: string): void {
  attempts.delete(email);
}
