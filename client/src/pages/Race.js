import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Copy, Crown, Eye, Keyboard as KeyboardIcon, Link2, Loader2, LogOut, Play as PlayIcon, Send, Settings2, SkipForward, Square, Users, Volume2, VolumeX, WifiOff, } from "lucide-react";
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
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { cn, formatClock } from "@/lib/utils";
export default function Race() {
    const { code } = useParams();
    const { user, refresh } = useAuth();
    const [signInOpen, setSignInOpen] = useState(!user);
    const [copied, setCopied] = useState(false);
    const [chatDraft, setChatDraft] = useState("");
    const [keyboardOn, setKeyboardOn] = useState(true);
    const [soundOn, setSoundOn] = useState(true);
    // See Play.tsx — a race is exactly when a leaked keystroke hurts most.
    const [inputFocused, setInputFocused] = useState(true);
    const chatEndRef = useRef(null);
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
    const handleProgress = useCallback((snapshot) => {
        actions.sendProgress(snapshot);
    }, [actions]);
    const finishedRef = useRef(false);
    const handleFinish = useCallback((result) => {
        if (finishedRef.current)
            return;
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
    }, [actions, passageText.length]);
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
        if (summary)
            void refresh();
    }, [summary, refresh]);
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ block: "nearest" });
    }, [messages.length]);
    const inviteUrl = useMemo(() => (code ? `${window.location.origin}/race/${code.toUpperCase()}` : ""), [code]);
    const copyInvite = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        }
        catch {
            /* clipboard blocked — the field is selectable as a fallback */
        }
    }, [inviteUrl]);
    const maxWpm = useMemo(() => Math.max(80, ...(state?.racers.map((r) => r.wpm) ?? [0])), [state?.racers]);
    const remainingMs = endsAtLocal && racing ? Math.max(0, endsAtLocal - Date.now()) : null;
    /* ---------------------------------------------------------------- */
    /* Gates                                                             */
    /* ---------------------------------------------------------------- */
    if (!user) {
        return (_jsxs("div", { className: "mx-auto max-w-lg px-4 py-20 text-center", children: [_jsxs("h1", { className: "text-2xl font-bold tracking-tight", children: ["Race ", code?.toUpperCase()] }), _jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Sign in to take a lane, and your result is written to the ledger under your name" }), _jsx(Button, { variant: "gradient", size: "lg", className: "mt-6", onClick: () => setSignInOpen(true), children: "Sign in to join" }), _jsx(SignInDialog, { open: signInOpen, onOpenChange: setSignInOpen, reason: "This race writes results to the leaderboard, so it needs a name to write them under" })] }));
    }
    if (status === "error" || (error && !state)) {
        return (_jsxs("div", { className: "mx-auto max-w-lg px-4 py-20 text-center", children: [_jsx(WifiOff, { className: "mx-auto mb-4 size-8 text-muted-foreground" }), _jsx("h1", { className: "text-xl font-bold tracking-tight", children: error === "room_not_found" ? "That race has ended" : "Could not join" }), _jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: error === "room_not_found"
                        ? "The code is wrong, or the host closed the room"
                        : "The connection to the race server failed, try again in a moment" }), _jsxs("div", { className: "mt-6 flex justify-center gap-2", children: [_jsx(Link, { to: "/race", children: _jsx(Button, { variant: "outline", children: "Enter another code" }) }), _jsx(Link, { to: "/play", children: _jsx(Button, { variant: "gradient", children: "Practice instead" }) })] })] }));
    }
    if (!state) {
        return (_jsxs("div", { className: "mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-24 text-muted-foreground", children: [_jsx(Loader2, { className: "size-6 animate-spin" }), _jsxs("p", { className: "text-sm", children: ["Joining race ", code?.toUpperCase(), "\u2026"] })] }));
    }
    const connectedCount = state.racers.filter((r) => r.connected && !r.isSpectator).length;
    return (_jsxs("div", { className: "mx-auto w-full max-w-6xl px-4 py-6 sm:py-10", children: [_jsxs("div", { className: "mb-5 flex flex-wrap items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "rounded-md border border-gl-purple/40 bg-gl-purple/10 px-3 py-1.5", children: [_jsx("p", { className: "text-[9px] font-bold uppercase tracking-[0.22em] text-gl-purple", children: "Room" }), _jsx("p", { className: "font-mono text-lg font-bold leading-tight tracking-[0.18em]", children: state.code })] }), _jsxs("div", { children: [_jsx("h1", { className: "text-lg font-bold tracking-tight", children: state.settings.mode === "sprint" ? "60-second sprint" : "First to finality" }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [state.settings.difficulty, " \u00B7 round ", Math.max(1, state.round), " \u00B7", " ", connectedCount, " racer", connectedCount === 1 ? "" : "s"] })] })] }), _jsxs("div", { className: "ml-auto flex flex-wrap items-center gap-2", children: [_jsxs(Badge, { variant: phase === "racing" ? "ok" : phase === "countdown" ? "warn" : "muted", children: [phase === "lobby" && "Waiting for host", phase === "countdown" && "Starting", phase === "racing" && "Live", phase === "finished" && "Finished"] }), me?.isSpectator && (_jsxs(Badge, { variant: "blue", children: [_jsx(Eye, { className: "size-3" }), " Spectating"] })), _jsxs(Button, { variant: "outline", size: "sm", onClick: copyInvite, children: [copied ? _jsx(Check, { className: "size-4 text-ok" }) : _jsx(Link2, { className: "size-4" }), copied ? "Copied" : "Invite"] }), _jsx(Link, { to: "/play", children: _jsxs(Button, { variant: "ghost", size: "sm", onClick: () => actions.leave(), children: [_jsx(LogOut, { className: "size-4" }), " Leave"] }) })] })] }), _jsxs("div", { className: "grid gap-4 lg:grid-cols-[1fr_20rem]", children: [_jsxs("div", { className: "min-w-0", children: [_jsx(RaceTrack, { racers: state.racers, meId: user.id, boosts: boosts, maxWpm: maxWpm, className: "mb-4" }), phase === "lobby" && (_jsx(LobbyWaiting, { racers: state.racers, settings: state.settings, isHost: isHost, className: "mb-4" })), _jsxs("section", { className: "gl-panel relative overflow-hidden rounded-lg", children: [phase === "countdown" && startsAtLocal && (_jsx(Countdown, { startsAtLocal: startsAtLocal })), _jsxs("header", { className: "flex flex-wrap items-center gap-3 border-b border-border px-5 py-3", children: [_jsx(Badge, { variant: "default", children: state.settings.difficulty }), _jsx("p", { className: "min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground", children: state.passage?.title ?? "Passage locked until the countdown" }), racing && (_jsx("span", { className: "font-mono text-sm font-bold tabular-nums text-gl-pink", children: formatClock(remainingMs ?? 0, false) }))] }), _jsx("div", { className: "p-5", children: state.passage ? (_jsxs(_Fragment, { children: [_jsx(TypingSurface, { text: state.passage.text, typed: engine.typed, charStates: engine.charStates, cursor: engine.typed.length, locked: !racing || Boolean(me?.isSpectator) || !inputFocused, focused: inputFocused, lockedHint: me?.isSpectator
                                                        ? "You are spectating this round"
                                                        : phase === "countdown"
                                                            ? "Get your fingers on the home row"
                                                            : phase === "finished"
                                                                ? "Round over"
                                                                : racing && !inputFocused
                                                                    ? "Click here to keep typing"
                                                                    : undefined, onFocusRequest: engine.focus, visibleLines: 6 }), _jsx("textarea", { ...engine.inputProps, onFocus: () => setInputFocused(true), onBlur: () => {
                                                        setInputFocused(false);
                                                        engine.inputProps.onBlur();
                                                    }, className: "absolute left-[-9999px] size-px opacity-0", tabIndex: 0 })] })) : (_jsxs("div", { className: "flex flex-col items-center justify-center gap-2 py-4 text-center text-sm text-muted-foreground", children: [_jsx("p", { className: "font-medium text-foreground", children: "The passage is sealed" }), _jsx("p", { className: "max-w-sm text-xs leading-relaxed", children: "It is revealed the moment the host starts the countdown, so nobody can read ahead" })] })) }), racing && state.passage && (_jsx(TypingHint, { text: state.passage.text, typed: engine.typed, wrongTrail: engine.wrongTrail, blocked: engine.blocked, className: "mx-5 mb-4" })), (racing || phase === "finished") && !me?.isSpectator && (_jsx("div", { className: "border-t border-border px-5 py-4", children: _jsx(Hud, { wpm: engine.snapshot.wpm, rawWpm: engine.snapshot.rawWpm, accuracy: engine.snapshot.accuracy, errors: engine.snapshot.errors, remainingMs: remainingMs, elapsedMs: engine.snapshot.elapsedMs, progress: engine.snapshot.progress, personalBest: me?.personalBest ?? null }) }))] }), summary && (_jsx(ResultsPanel, { className: "mt-4", standings: summary.standings, meId: user.id, title: `Round ${summary.round} · ${summary.passageTitle}`, subtitle: isHost
                                    ? "You are the host, so start the next round when everyone is ready"
                                    : "Waiting for the host to start the next round" })), _jsx("div", { className: cn("mt-5 transition-all duration-300", keyboardOn ? "opacity-100" : "pointer-events-none h-0 overflow-hidden opacity-0"), children: _jsx(VintageKeyboard, { variant: "genlayer", embedded: true, compact: true, sound: soundOn, listenWhileTyping: true, highlightChar: racing ? engine.nextKeyChar : null, onType: racing ? engine.typeChar : undefined, onBackspace: racing ? engine.backspace : undefined, maxWidth: "52rem", className: "mx-auto" }) }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Switch, { id: "kb", checked: keyboardOn, onCheckedChange: setKeyboardOn }), _jsxs(Label, { htmlFor: "kb", className: "cursor-pointer normal-case tracking-normal", children: [_jsx(KeyboardIcon, { className: "mr-1 inline size-3.5" }), " Keyboard"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Switch, { id: "snd", checked: soundOn, onCheckedChange: setSoundOn }), _jsxs(Label, { htmlFor: "snd", className: "cursor-pointer normal-case tracking-normal", children: [soundOn ? (_jsx(Volume2, { className: "mr-1 inline size-3.5" })) : (_jsx(VolumeX, { className: "mr-1 inline size-3.5" })), "Sound"] })] }), status === "connecting" && (_jsxs("span", { className: "flex items-center gap-1.5 text-warn", children: [_jsx(Loader2, { className: "size-3 animate-spin" }), " Reconnecting\u2026"] }))] })] }), _jsxs("aside", { className: "flex min-w-0 flex-col gap-4", children: [isHost && (_jsxs("div", { className: "gl-panel gl-panel-glow rounded-lg p-4", children: [_jsxs("h2", { className: "mb-3 flex items-center gap-2 text-sm font-semibold", children: [_jsx(Crown, { className: "size-4 text-warn" }), " Host controls"] }), (phase === "lobby" || phase === "finished") && (_jsxs("div", { className: "mb-4 flex flex-col gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "mb-1.5 block", children: "Mode" }), _jsx(Tabs, { value: state.settings.mode, onValueChange: (v) => actions.updateSettings({ mode: v }), children: _jsxs(TabsList, { className: "w-full", children: [_jsx(TabsTrigger, { value: "race", className: "flex-1", children: "Finish line" }), _jsx(TabsTrigger, { value: "sprint", className: "flex-1", children: "60s sprint" })] }) })] }), _jsxs("div", { children: [_jsx(Label, { className: "mb-1.5 block", children: "Difficulty" }), _jsx(Tabs, { value: state.settings.difficulty, onValueChange: (v) => actions.updateSettings({
                                                            difficulty: v,
                                                            passageId: null,
                                                        }), children: _jsx(TabsList, { className: "w-full", children: ["easy", "medium", "hard"].map((d) => (_jsx(TabsTrigger, { value: d, className: "flex-1 capitalize", children: d }, d))) }) })] }), _jsx(PassagePicker, { difficulty: state.settings.difficulty, value: state.settings.passageId, onChange: (id) => actions.updateSettings({ passageId: id }) }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "cd", className: "mb-1.5 block", children: "Countdown" }), _jsx(Input, { id: "cd", type: "number", min: 3, max: 30, value: state.settings.countdownSec, onChange: (e) => actions.updateSettings({ countdownSec: Number(e.target.value) }), className: "h-8 text-xs" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "tl", className: "mb-1.5 block", children: "Time cap (s)" }), _jsx(Input, { id: "tl", type: "number", min: 30, max: 600, step: 10, disabled: state.settings.mode === "sprint", value: state.settings.timeLimitSec, onChange: (e) => actions.updateSettings({ timeLimitSec: Number(e.target.value) }), className: "h-8 text-xs" })] })] }), _jsxs("label", { className: "flex cursor-pointer items-center justify-between gap-2 text-xs", children: [_jsx("span", { className: "text-muted-foreground", children: "Let people join mid-race" }), _jsx(Switch, { checked: state.settings.allowLateJoin, onCheckedChange: (v) => actions.updateSettings({ allowLateJoin: v }) })] })] })), _jsxs("div", { className: "flex flex-wrap gap-2", children: [(phase === "lobby" || phase === "finished") && (_jsxs(Button, { variant: "gradient", className: "flex-1", onClick: actions.start, disabled: connectedCount === 0, children: [_jsx(PlayIcon, { className: "size-4" }), phase === "finished" ? "Next round" : "Start race"] })), phase === "finished" && (_jsx(Button, { variant: "outline", onClick: actions.nextRound, title: "Back to lobby", children: _jsx(SkipForward, { className: "size-4" }) })), (phase === "racing" || phase === "countdown") && (_jsxs(Button, { variant: "danger", className: "flex-1", onClick: actions.abort, children: [_jsx(Square, { className: "size-4" }), " Abort round"] }))] }), connectedCount === 0 && phase !== "racing" && (_jsx("p", { className: "mt-2 text-[11px] text-muted-foreground", children: "Share the invite link, the race needs at least one racer" }))] })), _jsxs("div", { className: "gl-panel rounded-lg p-4", children: [_jsxs("h2", { className: "mb-2 flex items-center gap-2 text-sm font-semibold", children: [_jsx(Users, { className: "size-4 text-gl-purple" }), " Invite"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { readOnly: true, value: inviteUrl, onFocus: (e) => e.currentTarget.select(), className: "h-8 font-mono text-[11px]", "aria-label": "Invite link" }), _jsx(Button, { variant: "outline", size: "icon-sm", onClick: copyInvite, "aria-label": "Copy invite link", children: copied ? _jsx(Check, { className: "size-3.5 text-ok" }) : _jsx(Copy, { className: "size-3.5" }) })] }), _jsx("p", { className: "mt-2 text-[11px] leading-relaxed text-muted-foreground", children: "Anyone with this link can join and wait in the lobby until the host starts" })] }), _jsxs("div", { className: "gl-panel min-h-0 rounded-lg", children: [_jsxs("h2", { className: "border-b border-border px-4 py-3 text-sm font-semibold", children: ["Racers (", state.racers.length, ")"] }), _jsx("ul", { className: "max-h-56 divide-y divide-border overflow-y-auto", children: state.racers.map((racer, index) => (_jsxs("li", { className: "flex items-center gap-2.5 px-4 py-2.5", children: [_jsxs(Avatar, { className: "size-6", children: [racer.avatarUrl && _jsx(AvatarImage, { src: racer.avatarUrl, alt: "" }), _jsx(AvatarFallback, { style: { color: laneHue(index) }, children: racer.displayName.slice(0, 2) })] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("p", { className: "truncate text-xs font-semibold", children: [racer.displayName, racer.userId === user.id && (_jsx("span", { className: "ml-1 text-[10px] text-muted-foreground", children: "(you)" }))] }), _jsx("p", { className: "text-[10px] text-muted-foreground", children: racer.isSpectator
                                                                ? "spectator"
                                                                : racer.personalBest
                                                                    ? `pb ${Math.round(racer.personalBest)} wpm`
                                                                    : "no record yet" })] }), racer.isHost && _jsx(Crown, { className: "size-3.5 shrink-0 text-warn" }), !racer.connected && (_jsx(WifiOff, { className: "size-3.5 shrink-0 text-muted-foreground" })), isHost && racer.userId !== user.id && phase !== "racing" && (_jsx("button", { type: "button", onClick: () => actions.kick(racer.userId), className: "cursor-pointer text-[10px] font-semibold text-bad opacity-70 transition-opacity hover:opacity-100", children: "kick" }))] }, racer.userId))) })] }), _jsxs("div", { className: "gl-panel flex min-h-0 flex-1 flex-col rounded-lg", children: [_jsx("h2", { className: "border-b border-border px-4 py-3 text-sm font-semibold", children: "Room chat" }), _jsxs("div", { className: "max-h-48 flex-1 space-y-1.5 overflow-y-auto px-4 py-3", children: [messages.length === 0 ? (_jsx("p", { className: "text-[11px] text-muted-foreground", children: "Say hello while you wait for the host" })) : (messages.map((msg, i) => (_jsxs("p", { className: "text-xs leading-relaxed", children: [_jsx("span", { className: cn("font-semibold", msg.userId === user.id ? "text-gl-pink" : "text-gl-purple"), children: msg.displayName }), _jsxs("span", { className: "text-muted-foreground", children: [" ", msg.text] })] }, `${msg.at}-${i}`)))), _jsx("div", { ref: chatEndRef })] }), _jsxs("form", { className: "flex gap-2 border-t border-border p-3", onSubmit: (e) => {
                                            e.preventDefault();
                                            const text = chatDraft.trim();
                                            if (!text)
                                                return;
                                            actions.sendChat(text);
                                            setChatDraft("");
                                        }, children: [_jsx(Input, { value: chatDraft, onChange: (e) => setChatDraft(e.target.value), placeholder: "Message the room", maxLength: 240, className: "h-8 text-xs", "aria-label": "Chat message" }), _jsx(Button, { type: "submit", size: "icon-sm", variant: "outline", "aria-label": "Send message", children: _jsx(Send, { className: "size-3.5" }) })] })] }), !isHost && phase === "lobby" && (_jsxs("p", { className: "flex items-start gap-2 rounded-md border border-border bg-surface/60 p-3 text-[11px] leading-relaxed text-muted-foreground", children: [_jsx(Settings2, { className: "mt-px size-3.5 shrink-0" }), "The host controls the settings and starts the race, so sit tight"] }))] })] })] }));
}
