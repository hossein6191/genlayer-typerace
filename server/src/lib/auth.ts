import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { env } from "./env.js";
import { getUser, toPublicUser, touch, type PublicUser, type UserRow } from "./db.js";

export const SESSION_COOKIE = "gl_session";
export const ADMIN_COOKIE = "gl_admin";
const SESSION_TTL_DAYS = 60;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserRow;
      isAdmin?: boolean;
    }
  }
}

const cookieBase = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: env.isProd,
  path: "/",
};

/* ------------------------------------------------------------------ */
/* Session cookies                                                     */
/* ------------------------------------------------------------------ */

export function issueSession(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, env.SESSION_SECRET, {
    expiresIn: `${SESSION_TTL_DAYS}d`,
  });
  res.cookie(SESSION_COOKIE, token, {
    ...cookieBase,
    maxAge: SESSION_TTL_DAYS * 86_400_000,
  });
}

export function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieBase);
}

export function userIdFromToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.SESSION_SECRET) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Populates `req.user` when a valid session cookie is present. Never rejects. */
export function attachUser(req: Request, _res: Response, next: NextFunction) {
  const id = userIdFromToken(req.cookies?.[SESSION_COOKIE]);
  if (id) {
    const user = getUser(id);
    if (user) {
      req.user = user;
      touch(user.id);
    }
  }
  req.isAdmin = verifyAdminCookie(req.cookies?.[ADMIN_COOKIE]);
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "sign_in_required" });
    return;
  }
  next();
}

export function currentUser(req: Request): PublicUser | null {
  return req.user ? toPublicUser(req.user) : null;
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export function issueAdminCookie(res: Response) {
  const token = jwt.sign({ role: "admin" }, env.SESSION_SECRET, { expiresIn: "12h" });
  res.cookie(ADMIN_COOKIE, token, { ...cookieBase, maxAge: 12 * 3_600_000 });
}

export function clearAdminCookie(res: Response) {
  res.clearCookie(ADMIN_COOKIE, cookieBase);
}

export function verifyAdminCookie(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, env.SESSION_SECRET) as { role?: string };
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/** Constant-time password comparison so the endpoint cannot be timed. */
export function adminPasswordMatches(candidate: string): boolean {
  const expected = env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still burn a comparison so the timing profile stays flat.
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAdmin) {
    res.status(403).json({ error: "admin_required" });
    return;
  }
  next();
}
