import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { env } from "./env.js";
import type { Difficulty } from "../content/passages.js";

fs.mkdirSync(path.dirname(env.DATABASE_FILE), { recursive: true });

export const db = new Database(env.DATABASE_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  discord_id    TEXT UNIQUE,
  username      TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  is_guest      INTEGER NOT NULL DEFAULT 0,
  is_admin      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS races (
  id           TEXT PRIMARY KEY,
  room_code    TEXT,
  mode         TEXT NOT NULL,
  difficulty   TEXT NOT NULL,
  passage_id   TEXT NOT NULL,
  host_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  started_at   INTEGER NOT NULL,
  finished_at  INTEGER
);

CREATE TABLE IF NOT EXISTS results (
  id          TEXT PRIMARY KEY,
  race_id     TEXT REFERENCES races(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode        TEXT NOT NULL,
  difficulty  TEXT NOT NULL,
  passage_id  TEXT NOT NULL,
  wpm         REAL NOT NULL,
  raw_wpm     REAL NOT NULL,
  accuracy    REAL NOT NULL,
  errors      INTEGER NOT NULL,
  chars_typed INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  position    INTEGER,
  finished    INTEGER NOT NULL DEFAULT 0,
  suspicious  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS personal_bests (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  difficulty  TEXT NOT NULL,
  wpm         REAL NOT NULL,
  accuracy    REAL NOT NULL,
  result_id   TEXT,
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, difficulty)
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  races        INTEGER NOT NULL DEFAULT 0,
  ranked_races INTEGER NOT NULL DEFAULT 0,
  wins         INTEGER NOT NULL DEFAULT 0,
  podiums      INTEGER NOT NULL DEFAULT 0,
  sum_wpm      REAL NOT NULL DEFAULT 0,
  sum_accuracy REAL NOT NULL DEFAULT 0,
  best_wpm     REAL NOT NULL DEFAULT 0,
  last_race_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_results_user      ON results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_board     ON results(difficulty, suspicious, wpm DESC);
CREATE INDEX IF NOT EXISTS idx_results_race      ON results(race_id);
CREATE INDEX IF NOT EXISTS idx_pb_board          ON personal_bests(difficulty, wpm DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name ON users(LOWER(username));
`);

// Databases created before ranked_races existed get the column added in place.
const statsColumns = (db.pragma("table_info(user_stats)") as Array<{ name: string }>).map(
  (c) => c.name,
);
if (!statsColumns.includes("ranked_races")) {
  db.exec("ALTER TABLE user_stats ADD COLUMN ranked_races INTEGER NOT NULL DEFAULT 0");
  db.exec("UPDATE user_stats SET ranked_races = races");
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface UserRow {
  id: string;
  discord_id: string | null;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_guest: number;
  is_admin: number;
  created_at: number;
  last_seen_at: number;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export interface RecordedResult {
  userId: string;
  raceId: string | null;
  mode: string;
  difficulty: Difficulty;
  passageId: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
  charsTyped: number;
  correctChars: number;
  durationMs: number;
  position: number | null;
  finished: boolean;
  suspicious: boolean;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    avatarUrl: row.avatar_url,
    isAdmin: row.is_admin === 1,
  };
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

const selectUserById = db.prepare<[string], UserRow>("SELECT * FROM users WHERE id = ?");
const selectUserByName = db.prepare<[string], UserRow>(
  "SELECT * FROM users WHERE LOWER(username) = ? LIMIT 1",
);
const touchUser = db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?");

export function getUser(id: string): UserRow | undefined {
  return selectUserById.get(id);
}

export function touch(id: string) {
  touchUser.run(Date.now(), id);
}

const insertUser = db.prepare(`
  INSERT INTO users (id, discord_id, username, display_name, avatar_url, is_guest, is_admin, created_at, last_seen_at)
  VALUES (@id, @discord_id, @username, @display_name, @avatar_url, @is_guest, @is_admin, @created_at, @last_seen_at)
`);

const insertStats = db.prepare(
  "INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)",
);

/**
 * Sign in by name.
 *
 * There is no password and no external account: a player types the name they
 * want on the board and gets it back. Names are matched case-insensitively, so
 * typing the same name next week returns the *same* row, and with it every
 * record, stat and leaderboard position that name has already earned.
 */
export function findOrCreateUser(username: string): { user: UserRow; returning: boolean } {
  const existing = selectUserByName.get(username.toLowerCase());
  const now = Date.now();

  if (existing) {
    // Keep the exact capitalisation of the most recent sign-in.
    db.prepare("UPDATE users SET username = ?, display_name = ?, last_seen_at = ? WHERE id = ?").run(
      username,
      username,
      now,
      existing.id,
    );
    return { user: selectUserById.get(existing.id)!, returning: true };
  }

  const id = nanoid(16);
  insertUser.run({
    id,
    discord_id: null,
    username,
    display_name: username,
    avatar_url: null,
    is_guest: 0,
    is_admin: 0,
    created_at: now,
    last_seen_at: now,
  });
  insertStats.run(id);
  return { user: selectUserById.get(id)!, returning: false };
}

/* ------------------------------------------------------------------ */
/* Races and results                                                   */
/* ------------------------------------------------------------------ */

export function createRace(input: {
  id: string;
  roomCode: string | null;
  mode: string;
  difficulty: string;
  passageId: string;
  hostUserId: string | null;
}) {
  db.prepare(
    `INSERT OR REPLACE INTO races (id, room_code, mode, difficulty, passage_id, host_user_id, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.roomCode,
    input.mode,
    input.difficulty,
    input.passageId,
    input.hostUserId,
    Date.now(),
  );
}

export function closeRace(raceId: string) {
  db.prepare("UPDATE races SET finished_at = ? WHERE id = ?").run(Date.now(), raceId);
}

const insertResult = db.prepare(`
  INSERT INTO results (id, race_id, user_id, mode, difficulty, passage_id, wpm, raw_wpm, accuracy,
                       errors, chars_typed, duration_ms, position, finished, suspicious, created_at)
  VALUES (@id, @race_id, @user_id, @mode, @difficulty, @passage_id, @wpm, @raw_wpm, @accuracy,
          @errors, @chars_typed, @duration_ms, @position, @finished, @suspicious, @created_at)
`);

export interface SaveOutcome {
  resultId: string;
  isPersonalBest: boolean;
  previousBest: number | null;
  rank: number | null;
}

/**
 * Persist one player's finished run and fold it into their lifetime stats.
 * Returns whether this beat their previous personal best for that difficulty,
 * which is what the end-of-race screen celebrates for returning players.
 */
/**
 * A run has to be a real sample before it can set a record. Five words is the
 * floor: below that, a player who joins a race and types two letters would
 * otherwise post a 0 wpm "personal best" and sit on the leaderboard forever.
 */
const MIN_RANKABLE_CHARS = 25;

export const saveResult = db.transaction((r: RecordedResult): SaveOutcome => {
  const now = Date.now();
  const resultId = nanoid(16);
  const rankable = !r.suspicious && r.correctChars >= MIN_RANKABLE_CHARS && r.wpm > 0;

  insertResult.run({
    id: resultId,
    race_id: r.raceId,
    user_id: r.userId,
    mode: r.mode,
    difficulty: r.difficulty,
    passage_id: r.passageId,
    wpm: r.wpm,
    raw_wpm: r.rawWpm,
    accuracy: r.accuracy,
    errors: r.errors,
    chars_typed: r.charsTyped,
    duration_ms: r.durationMs,
    position: r.position,
    finished: r.finished ? 1 : 0,
    suspicious: r.suspicious ? 1 : 0,
    created_at: now,
  });

  // Participation always counts; only a rankable run moves the averages and
  // the best, so an abandoned race cannot drag someone's profile down.
  db.prepare(
    `INSERT INTO user_stats (user_id, races, ranked_races, wins, podiums, sum_wpm, sum_accuracy, best_wpm, last_race_at)
     VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       races        = races + 1,
       ranked_races = ranked_races + excluded.ranked_races,
       wins         = wins + excluded.wins,
       podiums      = podiums + excluded.podiums,
       sum_wpm      = sum_wpm + excluded.sum_wpm,
       sum_accuracy = sum_accuracy + excluded.sum_accuracy,
       best_wpm     = MAX(best_wpm, excluded.best_wpm),
       last_race_at = excluded.last_race_at`,
  ).run(
    r.userId,
    rankable ? 1 : 0,
    r.position === 1 ? 1 : 0,
    r.position != null && r.position <= 3 ? 1 : 0,
    rankable ? r.wpm : 0,
    rankable ? r.accuracy : 0,
    rankable ? r.wpm : 0,
    now,
  );

  const prev = db
    .prepare<[string, string], { wpm: number }>(
      "SELECT wpm FROM personal_bests WHERE user_id = ? AND difficulty = ?",
    )
    .get(r.userId, r.difficulty);

  const previousBest = prev?.wpm ?? null;
  let isPersonalBest = false;

  if (rankable && (previousBest == null || r.wpm > previousBest)) {
    db.prepare(
      `INSERT INTO personal_bests (user_id, difficulty, wpm, accuracy, result_id, achieved_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, difficulty) DO UPDATE SET
         wpm = excluded.wpm, accuracy = excluded.accuracy,
         result_id = excluded.result_id, achieved_at = excluded.achieved_at`,
    ).run(r.userId, r.difficulty, r.wpm, r.accuracy, resultId, now);
    isPersonalBest = true;
  }

  // A run that never reaches the board has no rank to report.
  const rankRow = !rankable
    ? null
    : db
        .prepare<[string, string, number], { rank: number }>(
          `SELECT COUNT(*) + 1 AS rank FROM personal_bests
            WHERE difficulty = ? AND user_id != ? AND wpm > ?`,
        )
        .get(r.difficulty, r.userId, Math.max(r.wpm, previousBest ?? 0));

  return { resultId, isPersonalBest, previousBest, rank: rankRow?.rank ?? null };
});

/* ------------------------------------------------------------------ */
/* Leaderboards                                                        */
/* ------------------------------------------------------------------ */

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  wpm: number;
  accuracy: number;
  achievedAt: number;
  races: number;
  wins: number;
}

interface LeaderboardRow {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  wpm: number;
  accuracy: number;
  achieved_at: number;
  races: number;
  wins: number;
}

const leaderboardStmt = db.prepare(`
  SELECT pb.user_id, u.username, u.display_name, u.avatar_url,
         MAX(pb.wpm) AS wpm, pb.accuracy, pb.achieved_at,
         COALESCE(s.races, 0) AS races, COALESCE(s.wins, 0) AS wins
    FROM personal_bests pb
    JOIN users u ON u.id = pb.user_id
    LEFT JOIN user_stats s ON s.user_id = pb.user_id
   WHERE pb.achieved_at >= @since
     AND (@difficulty = 'all' OR pb.difficulty = @difficulty)
GROUP BY pb.user_id
ORDER BY wpm DESC, pb.accuracy DESC, pb.achieved_at ASC
   LIMIT @limit
`);

export function leaderboard(opts: {
  difficulty?: Difficulty | "all";
  window?: "all" | "7d" | "24h";
  limit?: number;
}): LeaderboardEntry[] {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const since =
    opts.window === "7d"
      ? Date.now() - 7 * 86_400_000
      : opts.window === "24h"
        ? Date.now() - 86_400_000
        : 0;

  // "All difficulties" ranks each player by their single best run anywhere;
  // a specific difficulty ranks by the stored personal best for that tier.
  // SQLite resolves the bare `accuracy`/`achieved_at` columns to the row that
  // produced MAX(wpm), which is exactly the run we want to display.
  const rows = leaderboardStmt.all({
    since,
    difficulty: opts.difficulty ?? "all",
    limit,
  }) as LeaderboardRow[];

  return rows.map((row, i) => ({
    rank: i + 1,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name || row.username,
    avatarUrl: row.avatar_url,
    wpm: row.wpm,
    accuracy: row.accuracy,
    achievedAt: row.achieved_at,
    races: row.races,
    wins: row.wins,
  }));
}

export interface UserProfile {
  user: PublicUser;
  stats: {
    races: number;
    wins: number;
    podiums: number;
    avgWpm: number;
    avgAccuracy: number;
    bestWpm: number;
    lastRaceAt: number | null;
  };
  bests: Array<{ difficulty: string; wpm: number; accuracy: number; achievedAt: number }>;
  recent: Array<{
    id: string;
    mode: string;
    difficulty: string;
    wpm: number;
    accuracy: number;
    position: number | null;
    createdAt: number;
  }>;
}

export function userProfile(userId: string): UserProfile | null {
  const row = selectUserById.get(userId);
  if (!row) return null;

  const s =
    db
      .prepare<
        [string],
        {
          races: number;
          wins: number;
          podiums: number;
          sum_wpm: number;
          sum_accuracy: number;
          best_wpm: number;
          last_race_at: number | null;
          ranked_races: number;
        }
      >("SELECT * FROM user_stats WHERE user_id = ?")
      .get(userId) ?? null;

  const races = s?.races ?? 0;
  // Averages are over runs long enough to mean something, not over every
  // race the player happened to sit in.
  const ranked = s?.ranked_races ?? 0;

  return {
    user: toPublicUser(row),
    stats: {
      races,
      wins: s?.wins ?? 0,
      podiums: s?.podiums ?? 0,
      avgWpm: ranked ? (s!.sum_wpm ?? 0) / ranked : 0,
      avgAccuracy: ranked ? (s!.sum_accuracy ?? 0) / ranked : 0,
      bestWpm: s?.best_wpm ?? 0,
      lastRaceAt: s?.last_race_at ?? null,
    },
    bests: db
      .prepare<
        [string],
        { difficulty: string; wpm: number; accuracy: number; achieved_at: number }
      >("SELECT difficulty, wpm, accuracy, achieved_at FROM personal_bests WHERE user_id = ?")
      .all(userId)
      .map((b) => ({
        difficulty: b.difficulty,
        wpm: b.wpm,
        accuracy: b.accuracy,
        achievedAt: b.achieved_at,
      })),
    recent: db
      .prepare<
        [string],
        {
          id: string;
          mode: string;
          difficulty: string;
          wpm: number;
          accuracy: number;
          position: number | null;
          created_at: number;
        }
      >(
        `SELECT id, mode, difficulty, wpm, accuracy, position, created_at
           FROM results WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      )
      .all(userId)
      .map((r) => ({
        id: r.id,
        mode: r.mode,
        difficulty: r.difficulty,
        wpm: r.wpm,
        accuracy: r.accuracy,
        position: r.position,
        createdAt: r.created_at,
      })),
  };
}

export function globalCounters() {
  const one = <T>(sql: string) => db.prepare(sql).get() as T;
  return {
    players: one<{ n: number }>("SELECT COUNT(*) AS n FROM users").n,
    races: one<{ n: number }>("SELECT COUNT(*) AS n FROM races").n,
    results: one<{ n: number }>("SELECT COUNT(*) AS n FROM results").n,
    topWpm: one<{ n: number | null }>(
      "SELECT MAX(wpm) AS n FROM results WHERE suspicious = 0",
    ).n,
  };
}
