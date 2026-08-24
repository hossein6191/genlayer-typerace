import type { Difficulty } from "../content/passages.js";

export type { Difficulty };

/**
 * race   — everyone types the same passage; first past the finish line wins.
 *          This is the "who gets there first" mode, with a time cap so a
 *          stalled player cannot hold the room open forever.
 * sprint — fixed clock (60s by default); the most correct words wins.
 *          This is the "who types the most in one minute" mode.
 */
export type RaceMode = "race" | "sprint";

export type RoomPhase = "lobby" | "countdown" | "racing" | "finished";

export interface RoomSettings {
  mode: RaceMode;
  difficulty: Difficulty;
  /** Seconds of countdown before the passage unlocks. */
  countdownSec: number;
  /** Hard cap for `race`, exact clock for `sprint`. */
  timeLimitSec: number;
  /** When false, late arrivals are seated as spectators once racing starts. */
  allowLateJoin: boolean;
  maxPlayers: number;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  mode: "race",
  difficulty: "medium",
  countdownSec: 5,
  timeLimitSec: 180,
  allowLateJoin: true,
  maxPlayers: 24,
};

export const SPRINT_DEFAULT_SEC = 60;

export interface RacerState {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isHost: boolean;
  isSpectator: boolean;
  connected: boolean;
  ready: boolean;
  /** 0..1 along the passage. */
  progress: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
  correctChars: number;
  /** Consecutive correct characters — drives the Consensus Boost. */
  streak: number;
  boostUntil: number | null;
  finishedAt: number | null;
  position: number | null;
  /** Personal best for this difficulty at the time the race started. */
  personalBest: number | null;
}

export interface RoomState {
  code: string;
  phase: RoomPhase;
  settings: RoomSettings;
  hostUserId: string | null;
  passage: { id: string; title: string; text: string; difficulty: Difficulty } | null;
  racers: RacerState[];
  /** Epoch ms when the countdown ends and typing is allowed. */
  startsAt: number | null;
  /** Epoch ms when the race clock expires. */
  endsAt: number | null;
  serverTime: number;
  raceId: string | null;
  round: number;
}

export interface FinalStanding {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  position: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
  progress: number;
  finished: boolean;
  isPersonalBest: boolean;
  previousBest: number | null;
  suspicious: boolean;
}

export interface RaceSummary {
  raceId: string;
  code: string;
  mode: RaceMode;
  difficulty: Difficulty;
  passageTitle: string;
  standings: FinalStanding[];
  round: number;
}

/** Progress ping sent by the client roughly 10 times a second. */
export interface ProgressPayload {
  correctChars: number;
  typedChars: number;
  keystrokes: number;
  errors: number;
  elapsedMs: number;
  /** Set once the player has typed the final character of the passage. */
  done?: boolean;
}

export interface FinishPayload extends ProgressPayload {
  pasteAttempts: number;
  wpmSamples: number[];
}

/* Socket event maps -------------------------------------------------- */

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:countdown": (payload: { startsAt: number; serverTime: number }) => void;
  "room:started": (payload: { startsAt: number; endsAt: number; serverTime: number }) => void;
  "room:finished": (summary: RaceSummary) => void;
  "room:chat": (msg: { userId: string; displayName: string; text: string; at: number }) => void;
  "room:error": (payload: { code: string; message: string }) => void;
  "racer:boost": (payload: { userId: string; until: number }) => void;
  pong2: (payload: { clientSent: number; serverTime: number }) => void;
}

export interface ClientToServerEvents {
  "room:join": (
    payload: { code: string; asSpectator?: boolean },
    ack: (res: { ok: boolean; state?: RoomState; error?: string }) => void,
  ) => void;
  "room:leave": () => void;
  "room:ready": (ready: boolean) => void;
  "room:settings": (settings: Partial<RoomSettings>) => void;
  "room:start": () => void;
  "room:abort": () => void;
  "room:next": () => void;
  "room:kick": (userId: string) => void;
  "race:progress": (payload: ProgressPayload) => void;
  "race:finish": (payload: FinishPayload) => void;
  "room:chat": (text: string) => void;
  ping2: (clientSent: number) => void;
}
