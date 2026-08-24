import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Keyboard as KeyboardIcon,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VintageKeyboard } from "@/components/ui/vintage-keyboard";
import { DifficultyPicker } from "@/components/game/DifficultyPicker";
import { Hud } from "@/components/game/Hud";
import { TypingHint } from "@/components/game/TypingHint";
import { RaceTrack } from "@/components/game/RaceTrack";
import { TypingSurface } from "@/components/game/TypingSurface";
import { SignInDialog } from "@/components/layout/SignInDialog";
import { useAuth } from "@/hooks/useAuth";
import { useTypingEngine, type TypingResult } from "@/hooks/useTypingEngine";
import { api } from "@/lib/api";
import { cn, formatClock } from "@/lib/utils";
import type {
  Difficulty,
  DifficultyMeta,
  Passage,
  RacerState,
  SoloResultResponse,
} from "@/lib/types";

type SoloMode = "passage" | "sprint";

const SPRINT_SEC = 60;
const STORAGE_KEY = "gl-typerace-prefs";

interface Prefs {
  difficulty: Difficulty;
  mode: SoloMode;
  keyboard: boolean;
  sound: boolean;
  ranked: boolean;
}

const DEFAULT_PREFS: Prefs = {
  difficulty: "easy",
  mode: "passage",
  keyboard: true,
  sound: true,
  ranked: true,
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export default function Play() {
  const { user, profile, refresh } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [difficulties, setDifficulties] = useState<DifficultyMeta[]>([]);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(true);
  const [signInOpen, setSignInOpen] = useState(false);
  const [outcome, setOutcome] = useState<SoloResultResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sprintEndsAt, setSprintEndsAt] = useState<number | null>(null);
  // Keystrokes must never leak to the page — a stray space would press
  // whatever button happens to hold focus. When the field loses focus the
  // passage dims and asks for a click instead of silently swallowing input.
  const [inputFocused, setInputFocused] = useState(true);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* private mode — preferences just will not persist */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    api
      .meta()
      .then((m) => setDifficulties(m.difficulties))
      .catch(() => setDifficulties([]));
  }, []);

  const loadPassage = useCallback(
    async (difficulty: Difficulty, exclude?: string) => {
      setLoading(true);
      setOutcome(null);
      setSaveError(null);
      setSprintEndsAt(null);
      try {
        setPassage(await api.randomPassage(difficulty, exclude));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadPassage(prefs.difficulty);
  }, [prefs.difficulty, loadPassage]);

  const personalBest = useMemo(
    () => profile?.bests.find((b) => b.difficulty === prefs.difficulty)?.wpm ?? null,
    [profile, prefs.difficulty],
  );

  /* ---------------------------------------------------------------- */
  /* Submission                                                        */
  /* ---------------------------------------------------------------- */

  const submittedRef = useRef(false);

  const handleFinish = useCallback(
    async (result: TypingResult) => {
      if (submittedRef.current || !passage) return;
      submittedRef.current = true;

      if (!user) {
        setSignInOpen(true);
        setOutcome({
          score: {
            wpm: result.wpm,
            rawWpm: result.rawWpm,
            accuracy: result.accuracy,
            consistency: 0,
          },
          saved: false,
          integrity: { suspicious: false, reasons: [] },
        });
        return;
      }

      setSaving(true);
      try {
        const response = await api.submitSolo({
          passageId: passage.id,
          difficulty: passage.difficulty,
          mode: prefs.mode === "sprint" ? "solo-sprint" : "practice",
          correctChars: result.correctChars,
          typedChars: result.typedChars,
          keystrokes: result.keystrokes,
          errors: result.errors,
          durationMs: Math.round(result.elapsedMs),
          finished: result.correctChars >= passage.text.length,
          pasteAttempts: result.pasteAttempts,
          wpmSamples: result.wpmSamples,
          unranked: !prefs.ranked,
        });
        setOutcome(response);
        if (response.saved) void refresh();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Could not save that run");
      } finally {
        setSaving(false);
      }
    },
    [passage, user, prefs.mode, prefs.ranked, refresh],
  );

  const engine = useTypingEngine({
    text: passage?.text ?? "",
    active: !loading && Boolean(passage),
    endsAt: prefs.mode === "sprint" ? sprintEndsAt : null,
    onFinish: handleFinish,
  });

  // The sprint clock starts on the first keystroke, not on page load.
  useEffect(() => {
    if (prefs.mode !== "sprint") {
      setSprintEndsAt(null);
      return;
    }
    if (sprintEndsAt == null && engine.typed.length > 0) {
      setSprintEndsAt(Date.now() + SPRINT_SEC * 1000);
    }
  }, [prefs.mode, engine.typed.length, sprintEndsAt]);

  const restart = useCallback(() => {
    submittedRef.current = false;
    setOutcome(null);
    setSaveError(null);
    setSprintEndsAt(null);
    engine.reset();
    engine.focus();
  }, [engine]);

  const nextPassage = useCallback(() => {
    submittedRef.current = false;
    void loadPassage(prefs.difficulty, passage?.id);
  }, [loadPassage, prefs.difficulty, passage?.id]);

  // Tab/Enter restarts, the same shortcut every typing test uses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") restart();
      if (e.key === "Enter" && engine.finished) {
        e.preventDefault();
        nextPassage();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restart, nextPassage, engine.finished]);

  /* ---------------------------------------------------------------- */
  /* Pace car — you against your own personal best                     */
  /* ---------------------------------------------------------------- */

  const soloRacers = useMemo<RacerState[]>(() => {
    const total = passage?.text.length || 1;
    const base = {
      isHost: false,
      isSpectator: false,
      connected: true,
      ready: true,
      rawWpm: 0,
      errors: 0,
      streak: 0,
      boostUntil: null,
      finishedAt: null,
      position: null,
      personalBest: null,
      avatarUrl: null,
    };

    const you: RacerState = {
      ...base,
      userId: "you",
      username: "you",
      displayName: user?.displayName ?? "You",
      avatarUrl: user?.avatarUrl ?? null,
      progress: engine.snapshot.progress,
      wpm: engine.snapshot.wpm,
      accuracy: engine.snapshot.accuracy,
      correctChars: engine.snapshot.correctChars,
      errors: engine.snapshot.errors,
      finishedAt: engine.finished ? Date.now() : null,
    };

    // No record yet, or the clock has not started: nothing to chase, and a car
    // moving on its own before you have pressed a key is just confusing.
    if (!personalBest || engine.snapshot.elapsedMs <= 0) return [you];

    // The ghost travels at exactly your record pace, so staying ahead of it
    // means you are on track to beat it.
    const ghostChars = (personalBest * 5 * engine.snapshot.elapsedMs) / 60_000;
    const ghost: RacerState = {
      ...base,
      userId: "ghost",
      username: "pb",
      displayName: "Your record pace",
      progress: Math.min(1, ghostChars / total),
      wpm: personalBest,
      accuracy: 100,
      correctChars: Math.round(ghostChars),
    };

    return [you, ghost];
  }, [passage?.text.length, engine.snapshot, engine.finished, personalBest, user]);

  /* ---------------------------------------------------------------- */

  const remainingMs =
    prefs.mode === "sprint" && sprintEndsAt ? Math.max(0, sprintEndsAt - Date.now()) : null;

  const meta = difficulties.find((d) => d.id === prefs.difficulty);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Practice <span className="gl-gradient-text">range</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Warm up solo, and every run counts toward the ledger unless you turn that off
          </p>
        </div>

        <Tabs
          value={prefs.mode}
          onValueChange={(v) => {
            update({ mode: v as SoloMode });
            restart();
          }}
        >
          <TabsList>
            <TabsTrigger value="passage">Full passage</TabsTrigger>
            <TabsTrigger value="sprint">60-second sprint</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DifficultyPicker
        options={difficulties}
        value={prefs.difficulty}
        onChange={(next) => update({ difficulty: next })}
        className="mb-6"
      />

      {/* Pace car sits above the text, exactly like the multiplayer track. */}
      <RaceTrack
        racers={soloRacers}
        meId="you"
        boosts={{}}
        maxWpm={Math.max(80, personalBest ?? 0, engine.snapshot.wpm)}
        ghostIds={["ghost"]}
        compact
        className="mb-4"
      />

      <section className="gl-panel relative overflow-hidden rounded-lg">
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          {meta && (
            <Badge style={{ borderColor: `${meta.accent}55`, color: meta.accent }}>
              {meta.label} · {meta.codename}
            </Badge>
          )}
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">
            {passage?.title ?? "Loading passage…"}
          </p>
          {prefs.mode === "sprint" && (
            <span className="font-mono text-sm font-bold tabular-nums text-gl-pink">
              {formatClock(remainingMs ?? SPRINT_SEC * 1000, false)}
            </span>
          )}
        </header>

        <div className="p-5">
          {loading || !passage ? (
            <div className="flex h-36 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Fetching a passage…
            </div>
          ) : (
            <>
              <TypingSurface
                text={passage.text}
                typed={engine.typed}
                charStates={engine.charStates}
                cursor={engine.typed.length}
                locked={!inputFocused && !engine.finished}
                lockedHint="Click here to keep typing"
                focused={inputFocused}
                onFocusRequest={engine.focus}
                visibleLines={6}
              />
              {/* The real input. Visually hidden but focusable, so browsers and
                  assistive tech treat this like the text field it is. */}
              <textarea
                {...engine.inputProps}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                className="absolute left-[-9999px] size-px opacity-0"
                tabIndex={0}
              />
            </>
          )}
        </div>

        {passage && (
          <TypingHint
            text={passage.text}
            typed={engine.typed}
            wrongTrail={engine.wrongTrail}
            blocked={engine.blocked}
            className="mx-5 mb-4"
          />
        )}

        <div className="border-t border-border px-5 py-4">
          <Hud
            wpm={engine.snapshot.wpm}
            rawWpm={engine.snapshot.rawWpm}
            accuracy={engine.snapshot.accuracy}
            errors={engine.snapshot.errors}
            remainingMs={remainingMs}
            elapsedMs={engine.snapshot.elapsedMs}
            progress={engine.snapshot.progress}
            personalBest={personalBest}
          />
        </div>
      </section>

      {/* Results */}
      {(engine.finished || outcome) && (
        <div className="mt-4 rounded-lg border border-gl-purple/35 bg-gl-purple/6 p-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Speed
              </p>
              <p className="gl-gradient-text text-3xl font-bold tabular-nums">
                {Math.round(outcome?.score.wpm ?? engine.snapshot.wpm)}
                <span className="ml-1 text-base">wpm</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Accuracy
              </p>
              <p className="text-3xl font-bold tabular-nums">
                {(outcome?.score.accuracy ?? engine.snapshot.accuracy).toFixed(1)}%
              </p>
            </div>
            {outcome?.score.consistency != null && outcome.score.consistency > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Consistency
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {outcome.score.consistency.toFixed(0)}%
                </p>
              </div>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {saving && (
                <Badge variant="muted">
                  <Loader2 className="size-3 animate-spin" /> Saving
                </Badge>
              )}
              {outcome?.isPersonalBest && (
                <Badge variant="ok">
                  <Sparkles className="size-3" />
                  New record
                  {outcome.previousBest != null && ` · was ${Math.round(outcome.previousBest)}`}
                </Badge>
              )}
              {outcome?.integrity.suspicious && (
                <Badge variant="warn">
                  <ShieldAlert className="size-3" /> Not ranked
                </Badge>
              )}
              {outcome && !outcome.saved && !outcome.integrity.suspicious && (
                <Badge variant="muted">Unranked run</Badge>
              )}
              <Button variant="outline" onClick={restart}>
                <RotateCcw className="size-4" /> Retry
              </Button>
              <Button variant="gradient" onClick={nextPassage}>
                <RefreshCw className="size-4" /> Next passage
              </Button>
            </div>
          </div>

          {saveError && (
            <p role="alert" className="mt-3 text-xs font-medium text-bad">
              {saveError}
            </p>
          )}
          {outcome?.integrity.suspicious && (
            <p className="mt-3 text-xs leading-relaxed text-warn">
              This run was flagged and kept off the leaderboard: {outcome.integrity.reasons.join("; ")}.
            </p>
          )}
          {!user && (
            <p className="mt-3 text-xs text-muted-foreground">
              <button
                type="button"
                className="cursor-pointer font-semibold text-gl-purple underline underline-offset-2"
                onClick={() => setSignInOpen(true)}
              >
                Sign in
              </button>{" "}
              to keep this score and appear on the leaderboard
            </p>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-surface/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <Switch
            id="opt-keyboard"
            checked={prefs.keyboard}
            onCheckedChange={(v) => update({ keyboard: v })}
          />
          <Label htmlFor="opt-keyboard" className="cursor-pointer normal-case tracking-normal">
            <KeyboardIcon className="mr-1 inline size-3.5" /> On-screen keyboard
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="opt-sound" checked={prefs.sound} onCheckedChange={(v) => update({ sound: v })} />
          <Label htmlFor="opt-sound" className="cursor-pointer normal-case tracking-normal">
            {prefs.sound ? (
              <Volume2 className="mr-1 inline size-3.5" />
            ) : (
              <VolumeX className="mr-1 inline size-3.5" />
            )}
            Key sound
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="opt-ranked" checked={prefs.ranked} onCheckedChange={(v) => update({ ranked: v })} />
          <Label htmlFor="opt-ranked" className="cursor-pointer normal-case tracking-normal">
            <Save className="mr-1 inline size-3.5" /> Record to leaderboard
          </Label>
        </div>
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <p className="text-xs text-muted-foreground">
          <kbd className="rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">
            Esc
          </kbd>{" "}
          restart ·{" "}
          <kbd className="rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">
            Enter
          </kbd>{" "}
          next
        </p>
        <Link
          to="/race"
          className="ml-auto text-xs font-semibold text-gl-purple underline underline-offset-2 transition-colors hover:text-gl-pink"
        >
          Race other people →
        </Link>
      </div>

      {/* The keyboard, under the text, lighting the next key. */}
      <div
        className={cn(
          "mt-6 transition-all duration-300",
          prefs.keyboard ? "opacity-100" : "pointer-events-none h-0 overflow-hidden opacity-0",
        )}
      >
        <VintageKeyboard
          variant="genlayer"
          embedded
          compact
          sound={prefs.sound}
          listenWhileTyping
          highlightChar={engine.nextKeyChar}
          onType={engine.typeChar}
          onBackspace={engine.backspace}
          maxWidth="52rem"
          className="mx-auto"
        />
      </div>

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </div>
  );
}
