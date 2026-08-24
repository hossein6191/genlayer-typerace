import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type CharState = "pending" | "correct" | "wrong" | "current";

export interface TypingSnapshot {
  correctChars: number;
  typedChars: number;
  keystrokes: number;
  errors: number;
  elapsedMs: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  progress: number;
  finished: boolean;
}

export interface TypingResult extends TypingSnapshot {
  pasteAttempts: number;
  wpmSamples: number[];
}

export interface UseTypingEngineOptions {
  text: string;
  /** Typing is only accepted while this is true. */
  active: boolean;
  /**
   * Epoch ms the clock started. In a race the server decides this so every
   * player is timed from the same instant; in practice it starts on the first
   * keystroke.
   */
  startedAt?: number | null;
  /** Hard stop (epoch ms). Used by sprint mode and by the race time cap. */
  endsAt?: number | null;
  /** How many wrong characters may trail before further input is refused. */
  errorRunway?: number;
  onFinish?: (result: TypingResult) => void;
  /** Called at most ~10x/second with the live snapshot. */
  onProgress?: (snapshot: TypingSnapshot) => void;
}

/** Sentinel the on screen keyboard maps to its Backspace key. */
export const BACKSPACE_KEY = "\b";

const PROGRESS_INTERVAL_MS = 100;
const SAMPLE_INTERVAL_MS = 1_000;

function computeWpm(correctChars: number, elapsedMs: number) {
  if (elapsedMs <= 0) return 0;
  return correctChars / 5 / (elapsedMs / 60_000);
}

export function useTypingEngine({
  text,
  active,
  startedAt = null,
  endsAt = null,
  errorRunway = 8,
  onFinish,
  onProgress,
}: UseTypingEngineOptions) {
  const [typed, setTyped] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finished, setFinished] = useState(false);

  const keystrokesRef = useRef(0);
  const errorsRef = useRef(0);
  const pasteAttemptsRef = useRef(0);
  const samplesRef = useRef<number[]>([]);
  const lastSampleAtRef = useRef(0);
  const lastSampleCharsRef = useRef(0);
  const localStartRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Callbacks live in refs so the ticking effect never has to re-subscribe.
  const onFinishRef = useRef(onFinish);
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onFinishRef.current = onFinish;
    onProgressRef.current = onProgress;
  });

  /* ---------------------------------------------------------------- */
  /* Character comparison                                              */
  /* ---------------------------------------------------------------- */

  const correctChars = useMemo(() => {
    let i = 0;
    while (i < typed.length && i < text.length && typed[i] === text[i]) i++;
    return i;
  }, [typed, text]);

  const charStates = useMemo<CharState[]>(() => {
    const states: CharState[] = new Array(text.length);
    for (let i = 0; i < text.length; i++) {
      if (i < typed.length) states[i] = typed[i] === text[i] ? "correct" : "wrong";
      else if (i === typed.length) states[i] = "current";
      else states[i] = "pending";
    }
    return states;
  }, [typed, text]);

  const wrongTrail = typed.length - correctChars;
  const nextChar = typed.length < text.length ? text[typed.length] : null;

  /* ---------------------------------------------------------------- */
  /* Snapshot (kept in refs for the interval to read)                  */
  /* ---------------------------------------------------------------- */

  const snapshot = useMemo<TypingSnapshot>(() => {
    const denominator = Math.max(keystrokesRef.current, typed.length, 1);
    // Before the first keystroke there is nothing to be inaccurate about.
    const accuracy =
      keystrokesRef.current === 0 ? 100 : Math.min(100, (correctChars / denominator) * 100);
    return {
      correctChars,
      typedChars: typed.length,
      keystrokes: keystrokesRef.current,
      errors: errorsRef.current,
      elapsedMs,
      wpm: computeWpm(correctChars, elapsedMs),
      rawWpm: computeWpm(typed.length, elapsedMs),
      accuracy,
      progress: text.length ? correctChars / text.length : 0,
      finished,
    };
  }, [correctChars, typed.length, elapsedMs, text.length, finished]);

  const snapshotRef = useRef(snapshot);
  const correctCharsRef = useRef(correctChars);
  // The entered text, readable synchronously. Two taps inside one tick would
  // otherwise both start from the value React last rendered, and the second
  // would overwrite the first.
  const typedRef = useRef(typed);
  snapshotRef.current = snapshot;
  correctCharsRef.current = correctChars;
  typedRef.current = typed;

  /* ---------------------------------------------------------------- */
  /* Finishing                                                         */
  /* ---------------------------------------------------------------- */

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);

    const now = Date.now();
    const start = startedAt ?? localStartRef.current ?? now;
    const elapsed = Math.max(1, Math.min(now, endsAt ?? now) - start);
    const chars = correctCharsRef.current;
    const typedLen = snapshotRef.current.typedChars;
    const denominator = Math.max(keystrokesRef.current, typedLen, 1);

    const result: TypingResult = {
      correctChars: chars,
      typedChars: typedLen,
      keystrokes: keystrokesRef.current,
      errors: errorsRef.current,
      elapsedMs: elapsed,
      wpm: computeWpm(chars, elapsed),
      rawWpm: computeWpm(typedLen, elapsed),
      accuracy: Math.min(100, (chars / denominator) * 100),
      progress: text.length ? chars / text.length : 0,
      finished: true,
      pasteAttempts: pasteAttemptsRef.current,
      wpmSamples: samplesRef.current.slice(),
    };

    setElapsedMs(elapsed);
    onFinishRef.current?.(result);
  }, [startedAt, endsAt, text.length]);

  /* ---------------------------------------------------------------- */
  /* Clock                                                             */
  /* ---------------------------------------------------------------- */

  const startTime = startedAt ?? localStartRef.current;
  const running = active && startTime != null && !finished;

  useEffect(() => {
    if (!running || startTime == null) return;

    const tick = () => {
      const now = Date.now();
      setElapsedMs(Math.max(0, now - startTime));

      // One WPM sample per second builds the consistency graph.
      if (now - lastSampleAtRef.current >= SAMPLE_INTERVAL_MS) {
        const deltaChars = correctCharsRef.current - lastSampleCharsRef.current;
        const deltaMs = now - (lastSampleAtRef.current || startTime);
        samplesRef.current.push(computeWpm(Math.max(0, deltaChars), deltaMs));
        lastSampleAtRef.current = now;
        lastSampleCharsRef.current = correctCharsRef.current;
      }

      if (endsAt != null && now >= endsAt) {
        finish();
        return;
      }

      onProgressRef.current?.(snapshotRef.current);
    };

    lastSampleAtRef.current = Date.now();
    lastSampleCharsRef.current = correctCharsRef.current;
    const id = window.setInterval(tick, PROGRESS_INTERVAL_MS);
    tick();
    return () => window.clearInterval(id);
  }, [running, startTime, endsAt, finish]);

  /* ---------------------------------------------------------------- */
  /* Input handling                                                    */
  /* ---------------------------------------------------------------- */

  const [blocked, setBlocked] = useState(false);

  /**
   * The single place a new typed value is accepted.
   *
   * Used by the real textarea and by taps on the on screen keyboard, so both
   * routes score identically.
   */
  const applyValue = useCallback(
    (raw: string) => {
      if (!active || finishedRef.current) return;

      const current = typedRef.current;
      let next = raw.slice(0, text.length);

      // Count only additions as keystrokes; backspacing is not a keystroke for
      // accuracy purposes, which is how every typing test scores it.
      if (next.length > current.length) {
        const added = next.length - current.length;

        // A jump of several characters in one input event is a paste, an
        // autofill, or a script, none of which are typing.
        if (added > 2) {
          pasteAttemptsRef.current += 1;
          return;
        }

        keystrokesRef.current += added;
        for (let i = current.length; i < next.length; i++) {
          if (next[i] !== text[i]) errorsRef.current += 1;
        }

        // The error trail is capped so a player has to go back and fix their
        // mistakes. Hitting the cap is reported, because input that silently
        // stops responding reads as the game having frozen.
        let correct = 0;
        while (correct < next.length && next[correct] === text[correct]) correct++;
        if (next.length - correct > errorRunway) {
          next = next.slice(0, correct + errorRunway);
          setBlocked(true);
        } else {
          setBlocked(false);
        }
      } else {
        setBlocked(false);
      }

      if (localStartRef.current == null && startedAt == null && next.length > 0) {
        localStartRef.current = Date.now();
        lastSampleAtRef.current = localStartRef.current;
      }

      typedRef.current = next;
      setTyped(next);

      if (next.length === text.length && next === text) {
        // Point the refs at the finished state before the snapshot is taken,
        // because React has not re-rendered yet at this instant.
        correctCharsRef.current = text.length;
        snapshotRef.current = {
          ...snapshotRef.current,
          correctChars: text.length,
          typedChars: text.length,
        };
        finish();
      }
    },
    [active, text, startedAt, errorRunway, finish],
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => applyValue(event.target.value),
    [applyValue],
  );

  /** Type one character, as a tap on the on screen keyboard does. */
  const typeChar = useCallback(
    (char: string) => applyValue(typedRef.current + char),
    [applyValue],
  );

  /** Delete the last character, as Backspace does. */
  const backspace = useCallback(() => {
    if (!active || finishedRef.current) return;
    setBlocked(false);
    const next = typedRef.current.slice(0, -1);
    typedRef.current = next;
    setTyped(next);
  }, [active]);

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    pasteAttemptsRef.current += 1;
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Tab would blur the field mid-race.
    if (event.key === "Tab") event.preventDefault();
  }, []);

  const handleCopyCut = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
  }, []);

  /* ---------------------------------------------------------------- */
  /* Control                                                           */
  /* ---------------------------------------------------------------- */

  const reset = useCallback(() => {
    typedRef.current = "";
    setTyped("");
    setElapsedMs(0);
    setFinished(false);
    setBlocked(false);
    finishedRef.current = false;
    keystrokesRef.current = 0;
    errorsRef.current = 0;
    pasteAttemptsRef.current = 0;
    samplesRef.current = [];
    lastSampleAtRef.current = 0;
    lastSampleCharsRef.current = 0;
    localStartRef.current = null;
    correctCharsRef.current = 0;
  }, []);

  // A new passage always means a clean slate.
  useEffect(() => {
    reset();
  }, [text, reset]);

  const focus = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (active && !finished) focus();
  }, [active, finished, focus]);

  return {
    typed,
    charStates,
    correctChars,
    wrongTrail,
    nextChar,
    /**
     * What the player should press next. With mistakes on screen the answer is
     * Backspace, not the next letter, so the on screen keyboard stops pointing
     * somewhere the player cannot legally go.
     */
    nextKeyChar: wrongTrail > 0 ? BACKSPACE_KEY : nextChar,
    /** True while input is being refused because the error trail is full. */
    blocked,
    typeChar,
    backspace,
    snapshot,
    finished,
    elapsedMs,
    reset,
    focus,
    finish,
    inputRef,
    pasteAttemptsRef,
    samplesRef,
    /** Spread onto the hidden textarea that captures keystrokes. */
    inputProps: {
      ref: inputRef,
      value: typed,
      onChange: handleChange,
      onPaste: handlePaste,
      onCopy: handleCopyCut,
      onCut: handleCopyCut,
      onKeyDown: handleKeyDown,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      disabled: !active || finished,
      autoComplete: "off" as const,
      autoCorrect: "off",
      autoCapitalize: "off" as const,
      spellCheck: false,
      "aria-label": "Typing input",
    },
  };
}
