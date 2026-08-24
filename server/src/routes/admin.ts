import { Router } from "express";
import { z } from "zod";
import { env } from "../lib/env.js";
import { requireAdmin } from "../lib/auth.js";
import { db, globalCounters } from "../lib/db.js";
import { roomManager } from "../game/rooms.js";
import { clearErrors, errorCounts, markErrorsSeen, recentErrors } from "../lib/errors.js";
import { DEFAULT_SETTINGS, SPRINT_DEFAULT_SEC } from "../game/types.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

const createSchema = z.object({
  mode: z.enum(["race", "sprint"]).default(DEFAULT_SETTINGS.mode),
  difficulty: z.enum(["easy", "medium", "hard"]).default(DEFAULT_SETTINGS.difficulty),
  countdownSec: z.number().int().min(3).max(30).default(DEFAULT_SETTINGS.countdownSec),
  timeLimitSec: z.number().int().min(30).max(600).default(DEFAULT_SETTINGS.timeLimitSec),
  allowLateJoin: z.boolean().default(DEFAULT_SETTINGS.allowLateJoin),
  maxPlayers: z.number().int().min(2).max(64).default(DEFAULT_SETTINGS.maxPlayers),
  passageId: z.string().min(1).max(64).nullable().default(null),
});

/** Create a room and hand back the shareable invite link. */
adminRouter.post("/rooms", (req, res) => {
  const parsed = createSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_settings", issues: parsed.error.issues });
    return;
  }
  const settings = { ...parsed.data };
  if (settings.mode === "sprint") settings.timeLimitSec = SPRINT_DEFAULT_SEC;

  const room = roomManager.create(settings);
  res.status(201).json({
    code: room.code,
    inviteUrl: `${env.PUBLIC_URL}/race/${room.code}`,
    state: room.toState(),
  });
});

adminRouter.get("/rooms", (_req, res) => {
  res.json({ rooms: roomManager.list() });
});

adminRouter.get("/rooms/:code", (req, res) => {
  const room = roomManager.get(req.params.code);
  if (!room) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ state: room.toState(), inviteUrl: `${env.PUBLIC_URL}/race/${room.code}` });
});

adminRouter.delete("/rooms/:code", (req, res) => {
  const room = roomManager.get(req.params.code);
  if (!room) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  room.abort();
  roomManager.destroy(room.code);
  res.json({ ok: true });
});

/* ---------------------------------------------------------------- */
/* Moderation                                                        */
/* ---------------------------------------------------------------- */

adminRouter.get("/stats", (_req, res) => {
  const counters = globalCounters();
  const flagged = db
    .prepare(
      `SELECT r.id, r.wpm, r.accuracy, r.difficulty, r.mode, r.created_at,
              u.username, u.id AS user_id
         FROM results r JOIN users u ON u.id = r.user_id
        WHERE r.suspicious = 1
     ORDER BY r.created_at DESC LIMIT 50`,
    )
    .all();

  const recent = db
    .prepare(
      `SELECT r.id, r.wpm, r.accuracy, r.difficulty, r.mode, r.position, r.created_at,
              u.username, u.id AS user_id
         FROM results r JOIN users u ON u.id = r.user_id
     ORDER BY r.created_at DESC LIMIT 50`,
    )
    .all();

  res.json({
    counters,
    flagged,
    recent,
    activeRooms: roomManager.list(),
    errors: { counts: errorCounts(), recent: recentErrors(50) },
  });
});

adminRouter.post("/errors/seen", (_req, res) => {
  markErrorsSeen();
  res.json({ ok: true });
});

adminRouter.delete("/errors", (_req, res) => {
  clearErrors();
  res.json({ ok: true });
});

/** Remove one result and rebuild the affected personal best from what remains. */
adminRouter.delete("/results/:id", (req, res) => {
  const row = db
    .prepare("SELECT user_id, difficulty FROM results WHERE id = ?")
    .get(req.params.id) as { user_id: string; difficulty: string } | undefined;

  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const purge = db.transaction(() => {
    db.prepare("DELETE FROM results WHERE id = ?").run(req.params.id);

    const best = db
      .prepare(
        `SELECT id, wpm, accuracy, created_at FROM results
          WHERE user_id = ? AND difficulty = ? AND suspicious = 0
       ORDER BY wpm DESC LIMIT 1`,
      )
      .get(row.user_id, row.difficulty) as
      | { id: string; wpm: number; accuracy: number; created_at: number }
      | undefined;

    if (best) {
      db.prepare(
        `INSERT INTO personal_bests (user_id, difficulty, wpm, accuracy, result_id, achieved_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, difficulty) DO UPDATE SET
           wpm = excluded.wpm, accuracy = excluded.accuracy,
           result_id = excluded.result_id, achieved_at = excluded.achieved_at`,
      ).run(row.user_id, row.difficulty, best.wpm, best.accuracy, best.id, best.created_at);
    } else {
      db.prepare("DELETE FROM personal_bests WHERE user_id = ? AND difficulty = ?").run(
        row.user_id,
        row.difficulty,
      );
    }
  });

  purge();
  res.json({ ok: true });
});

/** Clear a suspicious flag after a manual review. */
adminRouter.post("/results/:id/clear-flag", (req, res) => {
  const info = db.prepare("UPDATE results SET suspicious = 0 WHERE id = ?").run(req.params.id);
  res.json({ ok: info.changes > 0 });
});
