/**
 * Wire types.
 *
 * These mirror `server/src/game/types.ts` and `server/src/content/passages.ts`.
 * The two packages build independently, so the shapes are duplicated rather
 * than imported across the workspace boundary — keep them in step when the
 * server contract changes.
 */

export type Difficulty = "easy" | "medium" | "hard";
export type RaceMode = "race" | "sprint";
export type RoomPhase = "lobby" | "countdown" | "racing" | "finished";

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export interface DifficultyMeta {
  id: Difficulty;
  label: string;
  codename: string;
  blurb: string;
  accent: string;
}

export interface Passage {
  id: string;
  difficulty: Difficulty;
  title: string;
  text: string;
}

export interface RoomSettings {
  mode: RaceMode;
  difficulty: Difficulty;
  countdownSec: number;
  timeLimitSec: number;
  allowLateJoin: boolean;
  maxPlayers: number;
  passageId: string | null;
}

export interface RacerState {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isHost: boolean;
  isSpectator: boolean;
  connected: boolean;
  ready: boolean;
  progress: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
  correctChars: number;
  streak: number;
  boostUntil: number | null;
  finishedAt: number | null;
  position: number | null;
  personalBest: number | null;
}

export interface RoomState {
  code: string;
  phase: RoomPhase;
  settings: RoomSettings;
  hostUserId: string | null;
  passage: { id: string; title: string; text: string; difficulty: Difficulty } | null;
  racers: RacerState[];
  startsAt: number | null;
  endsAt: number | null;
  serverTime: number;
  raceId: string | null;
  round: number;
}

/**
 * The per-frame update: only the numbers that move, as a positional array.
 * [userId, progress, wpm, accuracy, errors, correctChars, boostUntil, finishedAt, position]
 */
export type RacerTick = [
  string,
  number,
  number,
  number,
  number,
  number,
  number | null,
  number | null,
  number | null,
];

export interface RoomTick {
  t: number;
  r: RacerTick[];
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

export interface ChatMessage {
  userId: string;
  displayName: string;
  text: string;
  at: number;
}

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
  bests: Array<{ difficulty: Difficulty; wpm: number; accuracy: number; achievedAt: number }>;
  recent: Array<{
    id: string;
    mode: string;
    difficulty: Difficulty;
    wpm: number;
    accuracy: number;
    position: number | null;
    createdAt: number;
  }>;
}

export interface SoloResultResponse {
  score: { wpm: number; rawWpm: number; accuracy: number; consistency: number };
  saved: boolean;
  resultId?: string;
  isPersonalBest?: boolean;
  previousBest?: number | null;
  rank?: number | null;
  integrity: { suspicious: boolean; reasons: string[] };
}

export interface AdminRoomRow {
  code: string;
  phase: RoomPhase;
  mode: RaceMode;
  difficulty: Difficulty;
  round: number;
  players: number;
  connected: number;
  createdAt: number;
  hostUserId: string | null;
}
