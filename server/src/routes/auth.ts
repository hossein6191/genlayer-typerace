import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../lib/env.js";
import {
  adminPasswordMatches,
  clearAdminCookie,
  clearSession,
  currentUser,
  issueAdminCookie,
  issueSession,
} from "../lib/auth.js";
import { findOrCreateUser, toPublicUser, userProfile } from "../lib/db.js";

export const authRouter = Router();

const signInLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 12,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "too_many_attempts" },
});

/**
 * The name is the account. Nothing is connected, nothing is authorised, and no
 * wallet or third party is involved: a player types the name they want on the
 * board, and typing the same name again returns the same record.
 */
const signInSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "Pick at least 2 characters")
    .max(24, "Keep it under 24 characters")
    .regex(
      /^[\p{L}\p{N}][\p{L}\p{N}_.\- ]*$/u,
      "Letters, numbers, spaces, dot, underscore and hyphen only",
    ),
});

authRouter.get("/me", (req, res) => {
  const user = currentUser(req);
  res.json({
    user,
    profile: user ? userProfile(user.id) : null,
    isAdmin: Boolean(req.isAdmin),
  });
});

authRouter.post("/signin", signInLimiter, (req, res) => {
  const parsed = signInSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_username", message: parsed.error.issues[0]?.message });
    return;
  }

  const { user, returning } = findOrCreateUser(parsed.data.username);
  issueSession(res, user.id);
  res.json({ user: toPublicUser(user), returning });
});

authRouter.post("/logout", (req, res) => {
  clearSession(res);
  if (req.isAdmin) clearAdminCookie(res);
  res.json({ ok: true });
});

/* ---------------------------------------------------------------- */
/* Admin                                                             */
/* ---------------------------------------------------------------- */

authRouter.post("/admin", adminLimiter, (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!env.ADMIN_PASSWORD) {
    res.status(501).json({ error: "admin_not_configured", message: "ADMIN_PASSWORD is not set" });
    return;
  }
  if (!adminPasswordMatches(password)) {
    res.status(401).json({ error: "bad_password" });
    return;
  }
  issueAdminCookie(res);
  res.json({ ok: true });
});

authRouter.post("/admin/logout", (_req, res) => {
  clearAdminCookie(res);
  res.json({ ok: true });
});
