import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Check,
  Copy,
  Crown,
  Eye,
  Keyboard as KeyboardIcon,
  Link2,
  Loader2,
  LogOut,
  Play as PlayIcon,
  Send,
  Settings2,
  SkipForward,
  Square,
  Users,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VintageKeyboard } from "@/components/ui/vintage-keyboard";
import { Countdown } from "@/components/game/Countdown";
import { Hud } from "@/components/game/Hud";
import { LobbyWaiting } from "@/components/game/LobbyWaiting";
import { PassagePicker } from "@/components/game/PassagePicker";
import { RaceTrack, laneHue } from "@/components/game/RaceTrack";
import { ResultsPanel } from "@/components/game/ResultsPanel";
import { TypingHint } from "@/components/game/TypingHint";
import { TypingSurface } from "@/components/game/TypingSurface";
import { SignInDialog } from "@/components/layout/SignInDialog";
import { useAuth } from "@/hooks/useAuth";
import { useRoom } from "@/hooks/useRoom";
import { useTypingEngine, type TypingResult } from "@/hooks/useTypingEngine";
import { cn, formatClock } from "@/lib/utils";
import type { Difficulty, RaceMode } from "@/lib/types";

export default function Race() {
  const { code } = useParams<{ code: string }>();
  const { user, refresh } = useAuth();
  const [signInOpen, setSignInOpen] = useState(!user);
  const [copied, setCopied] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [keyboardOn, setKeyboardOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  // See Play.tsx — a race is exactly when a leaked keystroke hurts most.
  const [inputFocused, setInputFocused] = useState(true);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSignInOpen(!user);
  }, [user]);

  const room = useRoom(user ? code?.toUpperCase() : undefined);
  const { state, summary, messages, status, error, boosts, actions, toLocalTime } = room;

  const isHost = state?.hostUserId === user?.id;
  const me = state?.racers.find((r) => r.userId === user?.id) ?? null;
  const phase = state?.phase ?? "lobby";

  /* ---------------------------------------------------------------- */
  /* Typing                                                            */
  /* ---------------------------------------------------------------- */

  const startsAtLocal = state?.startsAt != null ? toLocalTime(state.startsAt) : null;
  const endsAtLocal = state?.endsAt != null ? toLocalTime(state.endsAt) : null;
  const racing = phase === "racing";

  const passageText = state?.passage?.text ?? "";

  const handleProgress = useCallback(
    (snapshot: {
      correctChars: number;
      typedChars: number;
      keystrokes: number;
      errors: number;
      elapsedMs: number;
    }) => {
      actions.sendProgress(snapshot);
    },
    [actions],
  );

  const finishedRef = useRef(false);

  const handleFinish = useCallback(
    (result: TypingResult) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      actions.sendFinish({
        correctChars: result.correctChars,
        typedChars: result.typedChars,
        keystrokes: result.keystrokes,
        errors: result.errors,
        elapsedMs: Math.round(result.elapsedMs),
        done: result.correctChars >= passageText.length,
        pasteAttempts: result.pasteAttempts,
        wpmSamples: result.wpmSamples,
      });
    },
    [actions, passageText.length],
  );

  const engine = useTypingEngine({
    text: passageText,
    active: racing && !me?.isSpectator,
    startedAt: racing ? startsAtLocal : null,
    endsAt: endsAtLocal,
    onProgress: handleProgress,
    onFinish: handleFinish,
  });

  // Each new round is a clean slate for the local engine.
  useEffect(() => {
    finishedRef.current = false;
  }, [state?.round]);

  // Results are written server-side, so pull the fresh profile for the header.
  useEffect(() => {
    if (summary) void refresh();
  }, [summary, refresh]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const inviteUrl = useMemo(
    () => (code ? `${window.location.origin}/race/${code.toUpperCase()}` : ""),
    [code],
  );

  const copyInvite = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  }, [inviteUrl]);

  const maxWpm = useMemo(
    () => Math.max(80, ...(state?.racers.map((r) => r.wpm) ?? [0])),
    [state?.racers],
  );

  const remainingMs = endsAtLocal && racing ? Math.max(0, endsAtLocal - Date.now()) : null;

  /* ---------------------------------------------------------------- */
  /* Gates                                                             */
  /* ---------------------------------------------------------------- */

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Race {code?.toUpperCase()}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to take a lane, and your result is written to the ledger under your name
        </p>
        <Button variant="gradient" size="lg" className="mt-6" onClick={() => setSignInOpen(true)}>
          Sign in to join
        </Button>
        <SignInDialog
          open={signInOpen}
          onOpenChange={setSignInOpen}
          reason="This race writes results to the leaderboard, so it needs a name to write them under"
        />
      </div>
    );
  }

  if (status === "error" || (error && !state)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <WifiOff className="mx-auto mb-4 size-8 text-muted-foreground" />
        <h1 className="text-xl font-bold tracking-tight">
          {error === "room_not_found" ? "That race has ended" : "Could not join"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error === "room_not_found"
            ? "The code is wrong, or the host closed the room"
            : "The connection to the race server failed, try again in a moment"}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/race">
            <Button variant="outline">Enter another code</Button>
          </Link>
          <Link to="/play">
            <Button variant="gradient">Practice instead</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">Joining race {code?.toUpperCase()}…</p>
      </div>
    );
  }

  const connectedCount = state.racers.filter((r) => r.connected && !r.isSpectator).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      {/* Room header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-gl-purple/40 bg-gl-purple/10 px-3 py-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gl-purple">Room</p>
            <p className="font-mono text-lg font-bold leading-tight tracking-[0.18em]">
              {state.code}
            </p>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              {state.settings.mode === "sprint" ? "60-second sprint" : "First to finality"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {state.settings.difficulty} · round {Math.max(1, state.round)} ·{" "}
              {connectedCount} racer{connectedCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Badge variant={phase === "racing" ? "ok" : phase === "countdown" ? "warn" : "muted"}>
            {phase === "lobby" && "Waiting for host"}
            {phase === "countdown" && "Starting"}
            {phase === "racing" && "Live"}
            {phase === "finished" && "Finished"}
          </Badge>
          {me?.isSpectator && (
            <Badge variant="blue">
              <Eye className="size-3" /> Spectating
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={copyInvite}>
            {copied ? <Check className="size-4 text-ok" /> : <Link2 className="size-4" />}
            {copied ? "Copied" : "Invite"}
          </Button>
          <Link to="/play">
            <Button variant="ghost" size="sm" onClick={() => actions.leave()}>
              <LogOut className="size-4" /> Leave
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        {/* ---- main column ---- */}
        <div className="min-w-0">
          <RaceTrack
            racers={state.racers}
            meId={user.id}
            boosts={boosts}
            maxWpm={maxWpm}
            className="mb-4"
          />

          {phase === "lobby" && (
            <LobbyWaiting
              racers={state.racers}
              settings={state.settings}
              isHost={isHost}
              className="mb-4"
            />
          )}

          <section className="gl-panel relative overflow-hidden rounded-lg">
            {phase === "countdown" && startsAtLocal && (
              <Countdown startsAtLocal={startsAtLocal} />
            )}

            <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
              <Badge variant="default">{state.settings.difficulty}</Badge>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">
                {state.passage?.title ?? "Passage locked until the countdown"}
              </p>
              {racing && (
                <span className="font-mono text-sm font-bold tabular-nums text-gl-pink">
                  {formatClock(remainingMs ?? 0, false)}
                </span>
              )}
            </header>

            <div className="p-5">
              {state.passage ? (
                <>
                  <TypingSurface
                    text={state.passage.text}
                    typed={engine.typed}
                    charStates={engine.charStates}
                    cursor={engine.typed.length}
                    locked={!racing || Boolean(me?.isSpectator) || !inputFocused}
                    focused={inputFocused}
                    lockedHint={
                      me?.isSpectator
                        ? "You are spectating this round"
                        : phase === "countdown"
                          ? "Get your fingers on the home row"
                          : phase === "finished"
                            ? "Round over"
                            : racing && !inputFocused
                              ? "Click here to keep typing"
                              : undefined
                    }
                    onFocusRequest={engine.focus}
                    visibleLines={6}
                  />
                  <textarea
                    {...engine.inputProps}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => {
                      setInputFocused(false);
                      engine.inputProps.onBlur();
                    }}
                    className="absolute left-[-9999px] size-px opacity-0"
                    tabIndex={0}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-4 text-center text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">The passage is sealed</p>
                  <p className="max-w-sm text-xs leading-relaxed">
                    It is revealed the moment the host starts the countdown, so nobody can read
                    ahead
                  </p>
                </div>
              )}
            </div>

            {racing && state.passage && (
              <TypingHint
                text={state.passage.text}
                typed={engine.typed}
                wrongTrail={engine.wrongTrail}
                blocked={engine.blocked}
                className="mx-5 mb-4"
              />
            )}

            {(racing || phase === "finished") && !me?.isSpectator && (
              <div className="border-t border-border px-5 py-4">
                <Hud
                  wpm={engine.snapshot.wpm}
                  rawWpm={engine.snapshot.rawWpm}
                  accuracy={engine.snapshot.accuracy}
                  errors={engine.snapshot.errors}
                  remainingMs={remainingMs}
                  elapsedMs={engine.snapshot.elapsedMs}
                  progress={engine.snapshot.progress}
                  personalBest={me?.personalBest ?? null}
                />
              </div>
            )}
          </section>

          {summary && (
            <ResultsPanel
              className="mt-4"
              standings={summary.standings}
              meId={user.id}
              title={`Round ${summary.round} · ${summary.passageTitle}`}
              subtitle={
                isHost
                  ? "You are the host, so start the next round when everyone is ready"
                  : "Waiting for the host to start the next round"
              }
            />
          )}

          {/* Keyboard under the text */}
          <div
            className={cn(
              "mt-5 transition-all duration-300",
              keyboardOn ? "opacity-100" : "pointer-events-none h-0 overflow-hidden opacity-0",
            )}
          >
            <VintageKeyboard
              variant="genlayer"
              embedded
              compact
              sound={soundOn}
              listenWhileTyping
              highlightChar={racing ? engine.nextKeyChar : null}
              onType={racing ? engine.typeChar : undefined}
              onBackspace={racing ? engine.backspace : undefined}
              maxWidth="52rem"
              className="mx-auto"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Switch id="kb" checked={keyboardOn} onCheckedChange={setKeyboardOn} />
              <Label htmlFor="kb" className="cursor-pointer normal-case tracking-normal">
                <KeyboardIcon className="mr-1 inline size-3.5" /> Keyboard
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="snd" checked={soundOn} onCheckedChange={setSoundOn} />
              <Label htmlFor="snd" className="cursor-pointer normal-case tracking-normal">
                {soundOn ? (
                  <Volume2 className="mr-1 inline size-3.5" />
                ) : (
                  <VolumeX className="mr-1 inline size-3.5" />
                )}
                Sound
              </Label>
            </div>
            {status === "connecting" && (
              <span className="flex items-center gap-1.5 text-warn">
                <Loader2 className="size-3 animate-spin" /> Reconnecting…
              </span>
            )}
          </div>
        </div>

        {/* ---- side column ---- */}
        <aside className="flex min-w-0 flex-col gap-4">
          {/* Host controls */}
          {isHost && (
            <div className="gl-panel gl-panel-glow rounded-lg p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Crown className="size-4 text-warn" /> Host controls
              </h2>

              {(phase === "lobby" || phase === "finished") && (
                <div className="mb-4 flex flex-col gap-3">
                  <div>
                    <Label className="mb-1.5 block">Mode</Label>
                    <Tabs
                      value={state.settings.mode}
                      onValueChange={(v) => actions.updateSettings({ mode: v as RaceMode })}
                    >
                      <TabsList className="w-full">
                        <TabsTrigger value="race" className="flex-1">
                          Finish line
                        </TabsTrigger>
                        <TabsTrigger value="sprint" className="flex-1">
                          60s sprint
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div>
                    <Label className="mb-1.5 block">Difficulty</Label>
                    <Tabs
                      value={state.settings.difficulty}
                      onValueChange={(v) =>
                        actions.updateSettings({
                          difficulty: v as Difficulty,
                          passageId: null,
                        })
                      }
                    >
                      <TabsList className="w-full">
                        {(["easy", "medium", "hard"] as const).map((d) => (
                          <TabsTrigger key={d} value={d} className="flex-1 capitalize">
                            {d}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>

                  <PassagePicker
                    difficulty={state.settings.difficulty}
                    value={state.settings.passageId}
                    onChange={(id) => actions.updateSettings({ passageId: id })}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="cd" className="mb-1.5 block">
                        Countdown
                      </Label>
                      <Input
                        id="cd"
                        type="number"
                        min={3}
                        max={30}
                        value={state.settings.countdownSec}
                        onChange={(e) =>
                          actions.updateSettings({ countdownSec: Number(e.target.value) })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tl" className="mb-1.5 block">
                        Time cap (s)
                      </Label>
                      <Input
                        id="tl"
                        type="number"
                        min={30}
                        max={600}
                        step={10}
                        disabled={state.settings.mode === "sprint"}
                        value={state.settings.timeLimitSec}
                        onChange={(e) =>
                          actions.updateSettings({ timeLimitSec: Number(e.target.value) })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="mx" className="mb-1.5 block">
                      Max racers
                    </Label>
                    <Input
                      id="mx"
                      type="number"
                      min={2}
                      max={64}
                      value={state.settings.maxPlayers}
                      onChange={(e) =>
                        actions.updateSettings({ maxPlayers: Number(e.target.value) })
                      }
                      className="h-8 text-xs"
                    />
                  </div>

                  <label className="flex cursor-pointer items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Let people join mid-race</span>
                    <Switch
                      checked={state.settings.allowLateJoin}
                      onCheckedChange={(v) => actions.updateSettings({ allowLateJoin: v })}
                    />
                  </label>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {(phase === "lobby" || phase === "finished") && (
                  <Button
                    variant="gradient"
                    className="flex-1"
                    onClick={actions.start}
                    disabled={connectedCount === 0}
                  >
                    <PlayIcon className="size-4" />
                    {phase === "finished" ? "Next round" : "Start race"}
                  </Button>
                )}
                {phase === "finished" && (
                  <Button variant="outline" onClick={actions.nextRound} title="Back to lobby">
                    <SkipForward className="size-4" />
                  </Button>
                )}
                {(phase === "racing" || phase === "countdown") && (
                  <Button variant="danger" className="flex-1" onClick={actions.abort}>
                    <Square className="size-4" /> Abort round
                  </Button>
                )}
              </div>

              {connectedCount === 0 && phase !== "racing" && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Share the invite link, the race needs at least one racer
                </p>
              )}
            </div>
          )}

          {/* Invite */}
          <div className="gl-panel rounded-lg p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-gl-purple" /> Invite
            </h2>
            <div className="flex gap-2">
              <Input
                readOnly
                value={inviteUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="h-8 font-mono text-[11px]"
                aria-label="Invite link"
              />
              <Button variant="outline" size="icon-sm" onClick={copyInvite} aria-label="Copy invite link">
                {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Anyone with this link can join and wait in the lobby until the host starts
            </p>
          </div>

          {/* Roster */}
          <div className="gl-panel min-h-0 rounded-lg">
            <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
              Racers ({state.racers.length})
            </h2>
            <ul className="max-h-56 divide-y divide-border overflow-y-auto">
              {state.racers.map((racer, index) => (
                <li key={racer.userId} className="flex items-center gap-2.5 px-4 py-2.5">
                  <Avatar className="size-6">
                    {racer.avatarUrl && <AvatarImage src={racer.avatarUrl} alt="" />}
                    <AvatarFallback style={{ color: laneHue(index) }}>
                      {racer.displayName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">
                      {racer.displayName}
                      {racer.userId === user.id && (
                        <span className="ml-1 text-[10px] text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {racer.isSpectator
                        ? "spectator"
                        : racer.personalBest
                          ? `pb ${Math.round(racer.personalBest)} wpm`
                          : "no record yet"}
                    </p>
                  </div>
                  {racer.isHost && <Crown className="size-3.5 shrink-0 text-warn" />}
                  {!racer.connected && (
                    <WifiOff className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  {isHost && racer.userId !== user.id && phase !== "racing" && (
                    <button
                      type="button"
                      onClick={() => actions.kick(racer.userId)}
                      className="cursor-pointer text-[10px] font-semibold text-bad opacity-70 transition-opacity hover:opacity-100"
                    >
                      kick
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Chat */}
          <div className="gl-panel flex min-h-0 flex-1 flex-col rounded-lg">
            <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Room chat</h2>
            <div className="max-h-48 flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Say hello while you wait for the host
                </p>
              ) : (
                messages.map((msg, i) => (
                  <p key={`${msg.at}-${i}`} className="text-xs leading-relaxed">
                    <span
                      className={cn(
                        "font-semibold",
                        msg.userId === user.id ? "text-gl-pink" : "text-gl-purple",
                      )}
                    >
                      {msg.displayName}
                    </span>
                    <span className="text-muted-foreground"> {msg.text}</span>
                  </p>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form
              className="flex gap-2 border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const text = chatDraft.trim();
                if (!text) return;
                actions.sendChat(text);
                setChatDraft("");
              }}
            >
              <Input
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Message the room"
                maxLength={240}
                className="h-8 text-xs"
                aria-label="Chat message"
              />
              <Button type="submit" size="icon-sm" variant="outline" aria-label="Send message">
                <Send className="size-3.5" />
              </Button>
            </form>
          </div>

          {!isHost && phase === "lobby" && (
            <p className="flex items-start gap-2 rounded-md border border-border bg-surface/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <Settings2 className="mt-px size-3.5 shrink-0" />
              The host controls the settings and starts the race, so sit tight
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
