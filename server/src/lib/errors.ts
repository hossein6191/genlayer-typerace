import { nanoid } from "nanoid";
import { db } from "./db.js";

/**
 * A small error log kept in the same database as everything else.
 *
 * The point is that a fault the player hits leaves a trace you can read in the
 * admin panel, instead of living only in a browser console you will never see.
 */
db.exec(`
CREATE TABLE IF NOT EXISTS error_log (
  id         TEXT PRIMARY KEY,
  at         INTEGER NOT NULL,
  source     TEXT NOT NULL,
  message    TEXT NOT NULL,
  detail     TEXT,
  url        TEXT,
  user_id    TEXT,
  user_agent TEXT,
  seen       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_error_log_at ON error_log(at DESC);
`);

export type ErrorSource = "client" | "server" | "socket";

const insert = db.prepare(`
  INSERT INTO error_log (id, at, source, message, detail, url, user_id, user_agent)
  VALUES (@id, @at, @source, @message, @detail, @url, @user_id, @user_agent)
`);

const MAX_ROWS = 2_000;

export function recordError(input: {
  source: ErrorSource;
  message: string;
  detail?: string | null;
  url?: string | null;
  userId?: string | null;
  userAgent?: string | null;
}) {
  try {
    insert.run({
      id: nanoid(16),
      at: Date.now(),
      source: input.source,
      message: input.message.slice(0, 500),
      detail: input.detail?.slice(0, 4_000) ?? null,
      url: input.url?.slice(0, 500) ?? null,
      user_id: input.userId ?? null,
      user_agent: input.userAgent?.slice(0, 300) ?? null,
    });

    // Keep the log from growing without bound on a long lived deployment.
    db.prepare(
      `DELETE FROM error_log WHERE id NOT IN (
         SELECT id FROM error_log ORDER BY at DESC LIMIT ?
       )`,
    ).run(MAX_ROWS);
  } catch (err) {
    // Logging must never be the thing that breaks a request.
    console.error("[errors] could not record:", err);
  }
}

export interface ErrorRow {
  id: string;
  at: number;
  source: string;
  message: string;
  detail: string | null;
  url: string | null;
  user_id: string | null;
  user_agent: string | null;
  seen: number;
}

export function recentErrors(limit = 100): ErrorRow[] {
  return db
    .prepare("SELECT * FROM error_log ORDER BY at DESC LIMIT ?")
    .all(Math.min(Math.max(limit, 1), 500)) as ErrorRow[];
}

export function errorCounts() {
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN at > ? THEN 1 ELSE 0 END) AS last24h,
         SUM(CASE WHEN seen = 0 THEN 1 ELSE 0 END) AS unseen
       FROM error_log`,
    )
    .get(Date.now() - 86_400_000) as {
    total: number;
    last24h: number | null;
    unseen: number | null;
  };
  return { total: row.total, last24h: row.last24h ?? 0, unseen: row.unseen ?? 0 };
}

export function markErrorsSeen() {
  db.prepare("UPDATE error_log SET seen = 1 WHERE seen = 0").run();
}

export function clearErrors() {
  db.prepare("DELETE FROM error_log").run();
}
