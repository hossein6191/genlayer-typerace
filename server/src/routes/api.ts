import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  DIFFICULTIES,
  DIFFICULTY_META,
  getPassage,
  passagesFor,
  randomPassage,
  type Difficulty,
} from "../content/passages.js";
import { globalCounters, leaderboard, saveResult, userProfile } from "../lib/db.js";
import { checkIntegrity, computeScore } from "../lib/scoring.js";
import { requireUser } from "../lib/auth.js";
import { recordError } from "../lib/errors.js";

export const apiRouter = Router();

const difficultySchema = z.enum(["easy", "medium", "hard"]);

apiRouter.get("/meta", (_req, res) => {
  res.json({
    difficulties: DIFFICULTIES.map((d) => ({ id: d, ...DIFFICULTY_META[d] })),
    counters: globalCounters(),
  });
});

/* ---------------------------------------------------------------- */
/* Passages                                                          */
/* ---------------------------------------------------------------- */

apiRouter.get("/passages", (req, res) => {
  const parsed = difficultySchema.safeParse(req.query.difficulty);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_difficulty" });
    return;
  }
  res.json({
    difficulty: parsed.data,
    meta: DIFFICULTY_META[parsed.data],
    passages: passagesFor(parsed.data).map((p) => ({
      id: p.id,
      title: p.title,
      chars: p.text.length,
    })),
  });
});

apiRouter.get("/passages/random", (req, res) => {
  const parsed = difficultySchema.safeParse(req.query.difficulty ?? "easy");
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_difficulty" });
    return;
  }
  const exclude = typeof req.query.exclude === "string" ? req.query.exclude : undefined;
  res.json({ passage: randomPassage(parsed.data, exclude) });
});

apiRouter.get("/passages/:id", (req, res) => {
  const passage = getPassage(req.params.id);
  if (!passage) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ passage });
});

/* ---------------------------------------------------------------- */
/* Leaderboard                                                       */
/* ---------------------------------------------------------------- */

apiRouter.get("/leaderboard", (req, res) => {
  const difficulty =
    req.query.difficulty === "all" || req.query.difficulty == null
      ? "all"
      : difficultySchema.safeParse(req.query.difficulty).data;

  if (!difficulty) {
    res.status(400).json({ error: "invalid_difficulty" });
    return;
  }

  const window = ["all", "7d", "24h"].includes(String(req.query.window))
    ? (req.query.window as "all" | "7d" | "24h")
    : "all";

  const entries = leaderboard({
    difficulty: difficulty as Difficulty | "all",
    window,
    limit: Number(req.query.limit ?? 50),
  });

  const meRank = req.user ? entries.findIndex((e) => e.userId === req.user!.id) + 1 : 0;

  res.json({ difficulty, window, entries, meRank: meRank || null });
});

/* ---------------------------------------------------------------- */
/* Profiles                                                          */
/* ---------------------------------------------------------------- */

apiRouter.get("/profile/:userId", (req, res) => {
  const profile = userProfile(req.params.userId);
  if (!profile) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(profile);
});

/* ---------------------------------------------------------------- */
/* Solo / practice results                                           */
/* ---------------------------------------------------------------- */

const soloLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-7" });

/* ---------------------------------------------------------------- */
/* Client error reports                                              */
/* ---------------------------------------------------------------- */

const errorLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7" });

const errorSchema = z.object({
  message: z.string().min(1).max(500),
  detail: z.string().max(4_000).optional(),
  url: z.string().max(500).optional(),
});

/**
 * The browser tells the server when something broke, so a fault a player hits
 * shows up in the admin panel instead of only in a console nobody reads.
 */
apiRouter.post("/errors", errorLimiter, (req, res) => {
  const parsed = errorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_report" });
    return;
  }
  recordError({
    source: "client",
    message: parsed.data.message,
    detail: parsed.data.detail,
    url: parsed.data.url,
    userId: req.user?.id ?? null,
    userAgent: req.get("user-agent") ?? null,
  });
  res.status(202).json({ ok: true });
});

const soloSchema = z.object({
  passageId: z.string().min(1).max(64),
  difficulty: difficultySchema,
  mode: z.enum(["practice", "solo-sprint"]),
  correctChars: z.number().int().min(0).max(100_000),
  typedChars: z.number().int().min(0).max(100_000),
  keystrokes: z.number().int().min(0).max(200_000),
  errors: z.number().int().min(0).max(100_000),
  durationMs: z.number().int().min(0).max(3_600_000),
  finished: z.boolean(),
  pasteAttempts: z.number().int().min(0).max(10_000).default(0),
  wpmSamples: z.array(z.number().min(0).max(1_000)).max(600).default([]),
  /** Set for practice runs the player asked not to record. */
  unranked: z.boolean().default(false),
});

apiRouter.post("/results", soloLimiter, requireUser, (req, res) => {
  const parsed = soloSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_result", issues: parsed.error.issues });
    return;
  }
  const body = parsed.data;

  const passage = getPassage(body.passageId);
  if (!passage || passage.difficulty !== body.difficulty) {
    res.status(400).json({ error: "unknown_passage" });
    return;
  }
  if (body.correctChars > passage.text.length) {
    res.status(400).json({ error: "impossible_progress" });
    return;
  }

  const score = computeScore(
    {
      correctChars: body.correctChars,
      typedChars: body.typedChars,
      keystrokes: body.keystrokes,
      errors: body.errors,
      durationMs: body.durationMs,
    },
    body.wpmSamples,
  );

  const verdict = checkIntegrity({
    correctChars: body.correctChars,
    typedChars: body.typedChars,
    keystrokes: body.keystrokes,
    errors: body.errors,
    durationMs: body.durationMs,
    // Practice runs are not server-timed, so skip the drift check by passing 0.
    serverDurationMs: 0,
    pasteAttempts: body.pasteAttempts,
    score,
  });

  if (body.unranked) {
    res.json({ score, saved: false, reason: "unranked", integrity: verdict });
    return;
  }

  const outcome = saveResult({
    userId: req.user!.id,
    raceId: null,
    mode: body.mode,
    difficulty: body.difficulty,
    passageId: body.passageId,
    wpm: score.wpm,
    rawWpm: score.rawWpm,
    accuracy: score.accuracy,
    errors: body.errors,
    charsTyped: body.typedChars,
    correctChars: body.correctChars,
    durationMs: body.durationMs,
    position: null,
    finished: body.finished,
    suspicious: verdict.suspicious,
  });

  res.json({ score, saved: true, ...outcome, integrity: verdict });
});
