import { EventEmitter } from "node:events";
import { nanoid } from "nanoid";
import {
  DIFFICULTIES,
  getPassage,
  randomPassage,
  type Difficulty,
  type Passage,
} from "../content/passages.js";
import { closeRace, createRace, saveResult, toPublicUser, type UserRow } from "../lib/db.js";
import { checkIntegrity, computeScore, progressOf } from "../lib/scoring.js";
import {
  DEFAULT_SETTINGS,
  SPRINT_DEFAULT_SEC,
  type FinalStanding,
  type FinishPayload,
  type ProgressPayload,
  type RaceSummary,
  type RacerState,
  type RoomSettings,
  type RoomState,
} from "./types.js";

/** Ambiguous glyphs (0/O, 1/I/L) are dropped so codes survive being read aloud. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function makeCode(len = 6) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

const BOOST_STREAK = 40;
const BOOST_MS = 4_000;
const IDLE_ROOM_MS = 45 * 60_000;

interface RacerInternal extends RacerState {
  sockets: Set<string>;
  typedChars: number;
  keystrokes: number;
  lastProgressAt: number;
  startedAt: number | null;
  submitted: boolean;
}

export class Room {
  readonly code: string;
  phase: RoomState["phase"] = "lobby";
  settings: RoomSettings;
  hostUserId: string | null = null;
  passage: Passage | null = null;
  startsAt: number | null = null;
  endsAt: number | null = null;
  raceId: string | null = null;
  round = 0;
  createdAt = Date.now();
  lastActivityAt = Date.now();

  readonly racers = new Map<string, RacerInternal>();

  private countdownTimer: NodeJS.Timeout | null = null;
  private endTimer: NodeJS.Timeout | null = null;

  constructor(code: string, settings: Partial<RoomSettings> = {}) {
    this.code = code;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    if (this.settings.mode === "sprint") this.settings.timeLimitSec = SPRINT_DEFAULT_SEC;
  }

  /* ---------------------------------------------------------------- */
  /* Membership                                                        */
  /* ---------------------------------------------------------------- */

  addMember(user: UserRow, socketId: string, opts: { asSpectator?: boolean; personalBest?: number | null } = {}) {
    this.lastActivityAt = Date.now();
    const existing = this.racers.get(user.id);

    if (existing) {
      existing.sockets.add(socketId);
      existing.connected = true;
      const pub = toPublicUser(user);
      existing.username = pub.username;
      existing.displayName = pub.displayName;
      existing.avatarUrl = pub.avatarUrl;
      if (opts.personalBest !== undefined) existing.personalBest = opts.personalBest;
      return existing;
    }

    const midRace = this.phase === "racing" || this.phase === "countdown";
    const spectator = Boolean(opts.asSpectator) || (midRace && !this.settings.allowLateJoin);
    const pub = toPublicUser(user);

    const racer: RacerInternal = {
      userId: user.id,
      username: pub.username,
      displayName: pub.displayName,
      avatarUrl: pub.avatarUrl,
      isHost: false,
      isSpectator: spectator,
      connected: true,
      ready: false,
      progress: 0,
      wpm: 0,
      rawWpm: 0,
      accuracy: 100,
      errors: 0,
      correctChars: 0,
      streak: 0,
      boostUntil: null,
      finishedAt: null,
      position: null,
      personalBest: opts.personalBest ?? null,
      sockets: new Set([socketId]),
      typedChars: 0,
      keystrokes: 0,
      lastProgressAt: 0,
      startedAt: null,
      submitted: false,
    };

    this.racers.set(user.id, racer);
    if (!this.hostUserId) this.promoteHost(user.id);
    return racer;
  }

  removeSocket(userId: string, socketId: string) {
    const racer = this.racers.get(userId);
    if (!racer) return;
    racer.sockets.delete(socketId);
    if (racer.sockets.size > 0) return;

    racer.connected = false;
    racer.ready = false;

    // Nobody is left holding this seat, and no result is at stake — free it.
    if (this.phase === "lobby" || (this.phase === "finished" && !racer.submitted)) {
      this.racers.delete(userId);
    }
    if (this.hostUserId === userId) this.reassignHost();
    this.lastActivityAt = Date.now();
  }

  kick(userId: string) {
    this.racers.delete(userId);
    if (this.hostUserId === userId) this.reassignHost();
  }

  private promoteHost(userId: string) {
    this.hostUserId = userId;
    for (const r of this.racers.values()) r.isHost = r.userId === userId;
  }

  private reassignHost() {
    const next =
      [...this.racers.values()].find((r) => r.connected && !r.isSpectator) ??
      [...this.racers.values()].find((r) => r.connected);
    if (next) this.promoteHost(next.userId);
    else this.hostUserId = null;
  }

  get isEmpty() {
    return [...this.racers.values()].every((r) => !r.connected);
  }

  get isStale() {
    return this.isEmpty && Date.now() - this.lastActivityAt > IDLE_ROOM_MS;
  }

  activePlayers() {
    return [...this.racers.values()].filter((r) => !r.isSpectator && r.connected);
  }

  /* ---------------------------------------------------------------- */
  /* Settings                                                          */
  /* ---------------------------------------------------------------- */

  updateSettings(patch: Partial<RoomSettings>) {
    if (this.phase !== "lobby" && this.phase !== "finished") return false;
    const next: RoomSettings = { ...this.settings };

    if (patch.mode === "race" || patch.mode === "sprint") next.mode = patch.mode;
    if (patch.difficulty && DIFFICULTIES.includes(patch.difficulty as Difficulty)) {
      next.difficulty = patch.difficulty as Difficulty;
    }
    if (typeof patch.countdownSec === "number") {
      next.countdownSec = clampInt(patch.countdownSec, 3, 30);
    }
    if (typeof patch.timeLimitSec === "number") {
      next.timeLimitSec = clampInt(patch.timeLimitSec, 30, 600);
    }
    if (typeof patch.allowLateJoin === "boolean") next.allowLateJoin = patch.allowLateJoin;
    if (typeof patch.maxPlayers === "number") next.maxPlayers = clampInt(patch.maxPlayers, 2, 64);

    if (next.mode === "sprint") next.timeLimitSec = SPRINT_DEFAULT_SEC;

    this.settings = next;
    this.lastActivityAt = Date.now();
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* Race lifecycle                                                    */
  /* ---------------------------------------------------------------- */

  /** Returns null on success, or a reason string on refusal. */
  begin(onCountdownDone: () => void, onTimeUp: () => void): string | null {
    if (this.phase === "countdown" || this.phase === "racing") return "already_running";
    if (this.activePlayers().length === 0) return "no_players";

    this.passage = randomPassage(this.settings.difficulty, this.passage?.id);
    this.raceId = nanoid(16);
    this.round += 1;
    this.phase = "countdown";
    this.startsAt = Date.now() + this.settings.countdownSec * 1000;
    this.endsAt = this.startsAt + this.settings.timeLimitSec * 1000;
    this.lastActivityAt = Date.now();

    for (const racer of this.racers.values()) {
      this.resetRacer(racer);
      // Anyone connected and not explicitly spectating races this round.
      if (racer.connected && racer.isSpectator && this.settings.allowLateJoin) {
        racer.isSpectator = false;
      }
    }

    createRace({
      id: this.raceId,
      roomCode: this.code,
      mode: this.settings.mode,
      difficulty: this.settings.difficulty,
      passageId: this.passage.id,
      hostUserId: this.hostUserId,
    });

    this.clearTimers();
    this.countdownTimer = setTimeout(() => {
      this.phase = "racing";
      const now = Date.now();
      this.startsAt = now;
      this.endsAt = now + this.settings.timeLimitSec * 1000;
      for (const racer of this.activePlayers()) racer.startedAt = now;
      onCountdownDone();
      this.endTimer = setTimeout(onTimeUp, this.settings.timeLimitSec * 1000);
    }, this.settings.countdownSec * 1000);

    return null;
  }

  abort() {
    this.clearTimers();
    this.phase = "lobby";
    this.startsAt = null;
    this.endsAt = null;
    if (this.raceId) closeRace(this.raceId);
    this.raceId = null;
    for (const racer of this.racers.values()) this.resetRacer(racer);
  }

  resetToLobby() {
    this.clearTimers();
    this.phase = "lobby";
    this.startsAt = null;
    this.endsAt = null;
    this.raceId = null;
    this.passage = null;
    for (const racer of this.racers.values()) {
      this.resetRacer(racer);
      racer.ready = false;
    }
  }

  private resetRacer(racer: RacerInternal) {
    racer.progress = 0;
    racer.wpm = 0;
    racer.rawWpm = 0;
    racer.accuracy = 100;
    racer.errors = 0;
    racer.correctChars = 0;
    racer.typedChars = 0;
    racer.keystrokes = 0;
    racer.streak = 0;
    racer.boostUntil = null;
    racer.finishedAt = null;
    racer.position = null;
    racer.startedAt = null;
    racer.submitted = false;
    racer.lastProgressAt = 0;
  }

  clearTimers() {
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    if (this.endTimer) clearTimeout(this.endTimer);
    this.countdownTimer = null;
    this.endTimer = null;
  }

  /* ---------------------------------------------------------------- */
  /* In-race updates                                                   */
  /* ---------------------------------------------------------------- */

  /** Returns `true` when this update earned a fresh Consensus Boost. */
  applyProgress(userId: string, payload: ProgressPayload): { boosted: boolean } {
    const racer = this.racers.get(userId);
    if (!racer || this.phase !== "racing" || racer.isSpectator || racer.finishedAt) {
      return { boosted: false };
    }

    const total = this.passage?.text.length ?? 0;
    const now = Date.now();
    const prevStreak = racer.streak;

    racer.correctChars = clampInt(payload.correctChars, 0, total);
    racer.typedChars = Math.max(0, Math.floor(payload.typedChars));
    racer.keystrokes = Math.max(0, Math.floor(payload.keystrokes));
    racer.errors = Math.max(0, Math.floor(payload.errors));
    racer.lastProgressAt = now;

    const elapsed = Math.max(1, now - (racer.startedAt ?? now));
    const score = computeScore({
      correctChars: racer.correctChars,
      typedChars: racer.typedChars,
      keystrokes: racer.keystrokes,
      errors: racer.errors,
      durationMs: elapsed,
    });

    racer.wpm = score.wpm;
    racer.rawWpm = score.rawWpm;
    racer.accuracy = score.accuracy;
    racer.progress = progressOf(racer.correctChars, total);

    // A clean run builds a streak; any new error resets it. Crossing the
    // threshold lights the Consensus Boost — the network agrees with you.
    racer.streak = racer.errors > 0 && racer.correctChars === 0 ? 0 : racer.correctChars;
    let boosted = false;
    const crossed =
      Math.floor(racer.streak / BOOST_STREAK) > Math.floor(prevStreak / BOOST_STREAK);
    if (crossed && racer.streak >= BOOST_STREAK) {
      racer.boostUntil = now + BOOST_MS;
      boosted = true;
    }
    if (racer.boostUntil && racer.boostUntil < now) racer.boostUntil = null;

    if (payload.done && racer.correctChars >= total && total > 0) {
      this.markFinished(racer, now);
    }

    this.lastActivityAt = now;
    return { boosted };
  }

  private markFinished(racer: RacerInternal, at: number) {
    if (racer.finishedAt) return;
    racer.finishedAt = at;
    racer.progress = 1;
    const taken = [...this.racers.values()].filter((r) => r.position != null).length;
    racer.position = taken + 1;
  }

  recordFinish(userId: string, payload: FinishPayload) {
    const racer = this.racers.get(userId);
    if (!racer || racer.submitted) return;
    this.applyProgress(userId, { ...payload, done: true });
    racer.submitted = true;
    (racer as RacerInternal & { finishPayload?: FinishPayload }).finishPayload = payload;
    if (!racer.finishedAt && this.phase === "racing") {
      // Ran out of the passage but not marked done (sprint mode) — still lock it in.
      racer.finishedAt = Date.now();
    }
  }

  /** Everyone racing has either finished or submitted. */
  allDone() {
    const active = this.activePlayers();
    return active.length > 0 && active.every((r) => r.finishedAt != null || r.submitted);
  }

  /* ---------------------------------------------------------------- */
  /* Results                                                           */
  /* ---------------------------------------------------------------- */

  finalize(): RaceSummary {
    this.clearTimers();
    this.phase = "finished";
    const total = this.passage?.text.length ?? 1;
    const now = Date.now();
    const raceStart = this.startsAt ?? now;

    const contenders = [...this.racers.values()].filter(
      (r) => !r.isSpectator && (r.correctChars > 0 || r.submitted || r.finishedAt),
    );

    // Race mode: finishers first (by finish time), then by progress.
    // Sprint mode: purely by correct words in the fixed window.
    contenders.sort((a, b) => {
      if (this.settings.mode === "race") {
        const af = a.finishedAt ?? Infinity;
        const bf = b.finishedAt ?? Infinity;
        if (af !== bf) return af - bf;
        if (b.correctChars !== a.correctChars) return b.correctChars - a.correctChars;
      }
      if (b.wpm !== a.wpm) return b.wpm - a.wpm;
      return b.accuracy - a.accuracy;
    });

    const standings: FinalStanding[] = contenders.map((racer, index) => {
      const position = index + 1;
      const durationMs = Math.max(
        1,
        (racer.finishedAt ?? Math.min(now, this.endsAt ?? now)) - (racer.startedAt ?? raceStart),
      );

      const finishPayload = (racer as RacerInternal & { finishPayload?: FinishPayload })
        .finishPayload;

      const score = computeScore(
        {
          correctChars: racer.correctChars,
          typedChars: racer.typedChars,
          keystrokes: racer.keystrokes,
          errors: racer.errors,
          durationMs,
        },
        finishPayload?.wpmSamples ?? [],
      );

      const verdict = checkIntegrity({
        correctChars: racer.correctChars,
        typedChars: racer.typedChars,
        keystrokes: racer.keystrokes,
        errors: racer.errors,
        durationMs,
        serverDurationMs: durationMs,
        pasteAttempts: finishPayload?.pasteAttempts ?? 0,
        score,
      });

      const saved = saveResult({
        userId: racer.userId,
        raceId: this.raceId,
        mode: this.settings.mode,
        difficulty: this.settings.difficulty,
        passageId: this.passage?.id ?? "unknown",
        wpm: score.wpm,
        rawWpm: score.rawWpm,
        accuracy: score.accuracy,
        errors: racer.errors,
        charsTyped: racer.typedChars,
        correctChars: racer.correctChars,
        durationMs,
        position,
        finished: racer.finishedAt != null,
        suspicious: verdict.suspicious,
      });

      if (verdict.suspicious) {
        console.warn(
          `[integrity] room=${this.code} user=${racer.displayName} flagged: ${verdict.reasons.join("; ")}`,
        );
      }

      racer.position = position;
      racer.wpm = score.wpm;
      racer.accuracy = score.accuracy;

      return {
        userId: racer.userId,
        displayName: racer.displayName,
        avatarUrl: racer.avatarUrl,
        position,
        wpm: score.wpm,
        rawWpm: score.rawWpm,
        accuracy: score.accuracy,
        errors: racer.errors,
        progress: progressOf(racer.correctChars, total),
        finished: racer.finishedAt != null,
        isPersonalBest: saved.isPersonalBest,
        previousBest: saved.previousBest,
        suspicious: verdict.suspicious,
      };
    });

    if (this.raceId) closeRace(this.raceId);

    return {
      raceId: this.raceId ?? "",
      code: this.code,
      mode: this.settings.mode,
      difficulty: this.settings.difficulty,
      passageTitle: this.passage?.title ?? "",
      standings,
      round: this.round,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Serialisation                                                     */
  /* ---------------------------------------------------------------- */

  toState(): RoomState {
    const now = Date.now();
    // The passage text is withheld until the countdown begins, so nobody can
    // read ahead by opening dev tools while sitting in the lobby.
    const revealed = this.phase !== "lobby" && this.passage;

    return {
      code: this.code,
      phase: this.phase,
      settings: this.settings,
      hostUserId: this.hostUserId,
      passage: revealed
        ? {
            id: this.passage!.id,
            title: this.passage!.title,
            text: this.passage!.text,
            difficulty: this.passage!.difficulty,
          }
        : null,
      racers: [...this.racers.values()].map((r) => ({
        userId: r.userId,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        isHost: r.isHost,
        isSpectator: r.isSpectator,
        connected: r.connected,
        ready: r.ready,
        progress: r.progress,
        wpm: r.wpm,
        rawWpm: r.rawWpm,
        accuracy: r.accuracy,
        errors: r.errors,
        correctChars: r.correctChars,
        streak: r.streak,
        boostUntil: r.boostUntil && r.boostUntil > now ? r.boostUntil : null,
        finishedAt: r.finishedAt,
        position: r.position,
        personalBest: r.personalBest,
      })),
      startsAt: this.startsAt,
      endsAt: this.endsAt,
      serverTime: now,
      raceId: this.raceId,
      round: this.round,
    };
  }
}

/* -------------------------------------------------------------------- */
/* Manager                                                              */
/* -------------------------------------------------------------------- */

export class RoomManager extends EventEmitter {
  private rooms = new Map<string, Room>();
  private sweeper: NodeJS.Timeout;

  constructor() {
    super();
    this.sweeper = setInterval(() => this.sweep(), 5 * 60_000);
    this.sweeper.unref?.();
  }

  create(settings: Partial<RoomSettings> = {}): Room {
    let code = makeCode();
    while (this.rooms.has(code)) code = makeCode();
    const room = new Room(code, settings);
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  destroy(code: string) {
    const room = this.rooms.get(code);
    room?.clearTimers();
    this.rooms.delete(code);
  }

  list() {
    return [...this.rooms.values()].map((r) => ({
      code: r.code,
      phase: r.phase,
      mode: r.settings.mode,
      difficulty: r.settings.difficulty,
      round: r.round,
      players: r.racers.size,
      connected: [...r.racers.values()].filter((x) => x.connected).length,
      createdAt: r.createdAt,
      hostUserId: r.hostUserId,
    }));
  }

  private sweep() {
    for (const [code, room] of this.rooms) {
      if (room.isStale) {
        room.clearTimers();
        this.rooms.delete(code);
      }
    }
  }
}

export const roomManager = new RoomManager();

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

export function passageById(id: string) {
  return getPassage(id);
}
