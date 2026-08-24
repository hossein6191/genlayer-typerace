/**
 * Scoring and integrity checks.
 *
 * WPM uses the standard typing-test convention: one "word" is five characters,
 * counted from *correctly* typed characters only. Raw WPM counts everything the
 * player entered, so the gap between the two is where the mistakes live.
 */

export interface RunInput {
  /** Characters matching the passage at the moment the run ended. */
  correctChars: number;
  /** Every character the player committed, right or wrong. */
  typedChars: number;
  /** Physical key presses that produced a character (excludes backspace). */
  keystrokes: number;
  errors: number;
  durationMs: number;
}

export interface Score {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
}

export const MAX_PLAUSIBLE_WPM = 260; // The verified human record sits near 220.
export const MIN_RUN_MS = 3_000;

export function computeScore(input: RunInput, samples: number[] = []): Score {
  const minutes = Math.max(input.durationMs, 1) / 60_000;
  const wpm = input.correctChars / 5 / minutes;
  const rawWpm = input.typedChars / 5 / minutes;
  const denominator = Math.max(input.keystrokes, input.typedChars, 1);
  // A run with no keystrokes has nothing to be inaccurate about.
  const accuracy =
    input.keystrokes === 0 && input.typedChars === 0
      ? 100
      : Math.min(100, (input.correctChars / denominator) * 100);

  return {
    wpm: round(wpm),
    rawWpm: round(rawWpm),
    accuracy: round(accuracy),
    consistency: round(consistencyOf(samples)),
  };
}

/**
 * Consistency is 100 minus the coefficient of variation of the per-second WPM
 * samples — a steady typist scores high, a stop-start one scores low.
 */
export function consistencyOf(samples: number[]): number {
  const usable = samples.filter((s) => Number.isFinite(s) && s > 0);
  if (usable.length < 3) return 100;
  const mean = usable.reduce((a, b) => a + b, 0) / usable.length;
  if (mean <= 0) return 0;
  const variance = usable.reduce((a, b) => a + (b - mean) ** 2, 0) / usable.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(100, 100 - cv * 100));
}

export interface IntegrityInput extends RunInput {
  /** How long the server itself observed the run for. */
  serverDurationMs: number;
  pasteAttempts: number;
  score: Score;
}

export interface IntegrityVerdict {
  suspicious: boolean;
  reasons: string[];
}

/**
 * Server-side sanity checks. These do not try to be unbeatable — a determined
 * cheater with a scripted browser can always fake keystrokes. They exist so
 * that casual copy-paste and obviously impossible submissions never reach the
 * public leaderboard.
 */
export function checkIntegrity(input: IntegrityInput): IntegrityVerdict {
  const reasons: string[] = [];

  if (input.score.wpm > MAX_PLAUSIBLE_WPM) {
    reasons.push(`wpm ${input.score.wpm} exceeds the plausible ceiling of ${MAX_PLAUSIBLE_WPM}`);
  }
  if (input.durationMs < MIN_RUN_MS) {
    reasons.push("run shorter than the minimum duration");
  }
  if (input.pasteAttempts > 0) {
    reasons.push(`${input.pasteAttempts} paste attempt(s) blocked`);
  }
  // A player cannot commit more characters than they physically pressed.
  if (input.keystrokes + 2 < input.typedChars) {
    reasons.push("committed more characters than keystrokes recorded");
  }
  // The client clock must roughly agree with the server's own stopwatch.
  const drift = Math.abs(input.serverDurationMs - input.durationMs);
  if (input.serverDurationMs > 0 && drift > Math.max(2_500, input.serverDurationMs * 0.25)) {
    reasons.push(`client/server timing drift of ${Math.round(drift)}ms`);
  }
  if (input.score.wpm > 180 && input.errors === 0 && input.score.consistency > 99) {
    reasons.push("machine-perfect cadence at high speed");
  }

  return { suspicious: reasons.length > 0, reasons };
}

function round(n: number, digits = 2) {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/**
 * Progress along the passage, 0..1. Used to place the racer on the track.
 * Progress is based on *correct* characters, so an error stalls the car until
 * it is fixed — the racing equivalent of failing the Equivalence Principle.
 */
export function progressOf(correctChars: number, totalChars: number) {
  if (totalChars <= 0) return 0;
  return Math.max(0, Math.min(1, correctChars / totalChars));
}
