import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Loader2, LockKeyhole, Plus, RefreshCw, Bug, ShieldAlert, ShieldCheck, Trash2, X, } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DangerZone } from "@/components/game/DangerZone";
import { PassagePicker } from "@/components/game/PassagePicker";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
function Gate() {
    const { loginAsAdmin } = useAuth();
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    return (_jsxs("div", { className: "mx-auto w-full max-w-sm px-4 py-24", children: [_jsxs("div", { className: "mb-6 text-center", children: [_jsx("span", { className: "mx-auto mb-4 grid size-12 place-items-center rounded-xl border border-warn/40 bg-warn/10", children: _jsx(LockKeyhole, { className: "size-5 text-warn" }) }), _jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Race control" }), _jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Create rooms, start races and moderate the ledger" })] }), _jsxs("form", { className: "flex flex-col gap-3", onSubmit: async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError(null);
                    try {
                        await loginAsAdmin(password);
                    }
                    catch (err) {
                        setError(err instanceof Error ? err.message : "Login failed");
                    }
                    finally {
                        setBusy(false);
                    }
                }, children: [_jsx(Label, { htmlFor: "admin-password", children: "Admin password" }), _jsx(Input, { id: "admin-password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "current-password", required: true }), _jsxs(Button, { type: "submit", variant: "gradient", disabled: busy || !password, children: [busy ? _jsx(Loader2, { className: "size-4 animate-spin" }) : _jsx(ShieldCheck, { className: "size-4" }), "Unlock"] }), error && (_jsx("p", { role: "alert", className: "text-xs font-medium text-bad", children: error })), _jsxs("p", { className: "mt-2 text-[11px] leading-relaxed text-muted-foreground", children: ["The password is the ", _jsx("code", { className: "font-mono", children: "ADMIN_PASSWORD" }), " environment variable on the server"] })] })] }));
}
export default function Admin() {
    const { isAdmin, logoutAdmin } = useAuth();
    const [stats, setStats] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState("race");
    const [difficulty, setDifficulty] = useState("medium");
    const [countdownSec, setCountdownSec] = useState(5);
    const [timeLimitSec, setTimeLimitSec] = useState(180);
    const [allowLateJoin, setAllowLateJoin] = useState(true);
    const [passageId, setPassageId] = useState(null);
    const load = useCallback(async () => {
        if (!isAdmin)
            return;
        try {
            const [s, r] = await Promise.all([api.adminStats(), api.listRooms()]);
            setStats(s);
            setRooms(r.rooms);
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Could not load admin data");
        }
        finally {
            setLoading(false);
        }
    }, [isAdmin]);
    useEffect(() => {
        void load();
        if (!isAdmin)
            return;
        const id = window.setInterval(load, 5_000);
        return () => window.clearInterval(id);
    }, [load, isAdmin]);
    if (!isAdmin)
        return _jsx(Gate, {});
    const createRoom = async () => {
        setCreating(true);
        setError(null);
        try {
            const room = await api.createRoom({
                mode,
                difficulty,
                countdownSec,
                timeLimitSec,
                allowLateJoin,
                passageId,
            });
            // The server builds the link from PUBLIC_URL, which may not match the
            // origin the admin is actually browsing from. Prefer what they can see.
            setCreated({
                code: room.code,
                inviteUrl: `${window.location.origin}/race/${room.code}`,
            });
            await load();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Could not create the room");
        }
        finally {
            setCreating(false);
        }
    };
    const copyInvite = async () => {
        if (!created)
            return;
        try {
            await navigator.clipboard.writeText(created.inviteUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        }
        catch {
            /* clipboard blocked */
        }
    };
    return (_jsxs("div", { className: "mx-auto w-full max-w-5xl px-4 py-8 sm:py-12", children: [_jsxs("div", { className: "mb-7 flex flex-wrap items-center gap-3", children: [_jsxs("div", { children: [_jsxs("h1", { className: "flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl", children: [_jsx(ShieldCheck, { className: "size-6 text-warn" }), "Race ", _jsx("span", { className: "gl-gradient-text", children: "control" })] }), _jsx("p", { className: "mt-1.5 text-sm text-muted-foreground", children: "Open a room, send the link, and start when everyone has arrived" })] }), _jsxs("div", { className: "ml-auto flex gap-2", children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => void load(), children: [_jsx(RefreshCw, { className: "size-4" }), " Refresh"] }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => void logoutAdmin(), children: "Lock" })] })] }), error && (_jsx("p", { role: "alert", className: "mb-4 rounded-md border border-bad/40 bg-bad/8 px-4 py-2.5 text-sm text-bad", children: error })), _jsxs("div", { className: "grid gap-4 lg:grid-cols-[1fr_18rem]", children: [_jsxs("div", { className: "min-w-0 space-y-4", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Plus, { className: "size-4 text-gl-purple" }), " New race room"] }), _jsx(CardDescription, { children: "Settings can still be changed from inside the room before you start" })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { children: [_jsx(Label, { className: "mb-1.5 block", children: "Mode" }), _jsx(Tabs, { value: mode, onValueChange: (v) => setMode(v), children: _jsxs(TabsList, { className: "w-full", children: [_jsx(TabsTrigger, { value: "race", className: "flex-1", children: "Finish line" }), _jsx(TabsTrigger, { value: "sprint", className: "flex-1", children: "60s sprint" })] }) })] }), _jsxs("div", { children: [_jsx(Label, { className: "mb-1.5 block", children: "Difficulty" }), _jsx(Tabs, { value: difficulty, onValueChange: (v) => {
                                                                    setDifficulty(v);
                                                                    // A pin from the old tier would not survive the change.
                                                                    setPassageId(null);
                                                                }, children: _jsx(TabsList, { className: "w-full", children: ["easy", "medium", "hard"].map((d) => (_jsx(TabsTrigger, { value: d, className: "flex-1 capitalize", children: d }, d))) }) })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "a-cd", className: "mb-1.5 block", children: "Countdown (seconds)" }), _jsx(Input, { id: "a-cd", type: "number", min: 3, max: 30, value: countdownSec, onChange: (e) => setCountdownSec(Number(e.target.value)) })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "a-tl", className: "mb-1.5 block", children: "Time cap (seconds)" }), _jsx(Input, { id: "a-tl", type: "number", min: 30, max: 600, step: 10, disabled: mode === "sprint", value: mode === "sprint" ? 60 : timeLimitSec, onChange: (e) => setTimeLimitSec(Number(e.target.value)) })] })] }), _jsx(PassagePicker, { difficulty: difficulty, value: passageId, onChange: setPassageId }), _jsx("div", { className: "flex flex-wrap gap-x-6 gap-y-2", children: _jsxs("label", { className: "flex cursor-pointer items-center gap-2 text-xs", children: [_jsx(Switch, { checked: allowLateJoin, onCheckedChange: setAllowLateJoin }), _jsx("span", { className: "text-muted-foreground", children: "Allow late join" })] }) }), _jsxs(Button, { variant: "gradient", size: "lg", onClick: createRoom, disabled: creating, children: [creating ? _jsx(Loader2, { className: "size-4 animate-spin" }) : _jsx(Plus, { className: "size-4" }), "Create room & get invite link"] }), created && (_jsxs("div", { className: "rounded-md border border-gl-purple/40 bg-gl-purple/8 p-4", children: [_jsxs("p", { className: "text-[10px] font-bold uppercase tracking-[0.2em] text-gl-purple", children: ["Room ", created.code, " is open"] }), _jsxs("div", { className: "mt-2 flex gap-2", children: [_jsx(Input, { readOnly: true, value: created.inviteUrl, onFocus: (e) => e.currentTarget.select(), className: "h-9 font-mono text-xs", "aria-label": "Invite link" }), _jsx(Button, { variant: "outline", size: "icon", onClick: copyInvite, "aria-label": "Copy link", children: copied ? _jsx(Check, { className: "size-4 text-ok" }) : _jsx(Copy, { className: "size-4" }) })] }), _jsxs("p", { className: "mt-2 text-[11px] leading-relaxed text-muted-foreground", children: ["Send this to your players, then", " ", _jsx(Link, { to: `/race/${created.code}`, className: "font-semibold text-gl-purple underline underline-offset-2", children: "open the room" }), " ", "yourself, and although whoever joins first becomes host, an admin can start any room"] })] }))] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(ShieldAlert, { className: "size-4 text-warn" }), " Flagged runs"] }), _jsx(CardDescription, { children: "These never reached the leaderboard, so clear the flag to accept one or delete it" })] }), _jsx(CardContent, { children: loading ? (_jsxs("p", { className: "flex items-center gap-2 py-4 text-sm text-muted-foreground", children: [_jsx(Loader2, { className: "size-4 animate-spin" }), " Loading\u2026"] })) : !stats?.flagged.length ? (_jsx("p", { className: "py-4 text-sm text-muted-foreground", children: "Nothing flagged, the ledger is clean" })) : (_jsx("ul", { className: "divide-y divide-border", children: stats.flagged.map((row) => (_jsxs("li", { className: "flex items-center gap-3 py-2.5", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-semibold", children: row.username }), _jsxs("p", { className: "text-[11px] text-muted-foreground", children: [Math.round(row.wpm), " wpm \u00B7 ", row.accuracy.toFixed(0), "% \u00B7 ", row.difficulty, " ", "\u00B7 ", new Date(row.created_at).toLocaleString()] })] }), _jsx(Button, { variant: "ghost", size: "icon-sm", title: "Accept this run", onClick: async () => {
                                                            await api.clearFlag(row.id);
                                                            void load();
                                                        }, children: _jsx(Check, { className: "size-4 text-ok" }) }), _jsx(Button, { variant: "ghost", size: "icon-sm", title: "Delete this run", onClick: async () => {
                                                            await api.deleteResult(row.id);
                                                            void load();
                                                        }, children: _jsx(Trash2, { className: "size-4 text-bad" }) })] }, row.id))) })) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Bug, { className: "size-4 text-bad" }), " Error log", stats?.errors.counts.unseen ? (_jsxs(Badge, { variant: "bad", className: "ml-1", children: [stats.errors.counts.unseen, " new"] })) : null] }), _jsxs(CardDescription, { children: ["Faults the game hit, from the browser and from the server, newest first", stats?.errors.counts.total
                                                        ? `. ${stats.errors.counts.last24h} in the last 24 hours`
                                                        : ""] })] }), _jsx(CardContent, { children: !stats?.errors.recent.length ? (_jsx("p", { className: "py-4 text-sm text-muted-foreground", children: "Nothing has gone wrong yet" })) : (_jsxs(_Fragment, { children: [_jsx("ul", { className: "divide-y divide-border", children: stats.errors.recent.map((row) => (_jsx("li", { className: "py-2.5", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Badge, { variant: row.source === "client" ? "warn" : "bad", className: "mt-0.5 shrink-0", children: row.source }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "break-words font-mono text-xs", children: row.message }), _jsxs("p", { className: "mt-0.5 text-[11px] text-muted-foreground", children: [new Date(row.at).toLocaleString(), row.url && ` · ${row.url}`] }), row.detail && (_jsxs("details", { className: "mt-1", children: [_jsx("summary", { className: "cursor-pointer text-[11px] text-gl-purple", children: "stack" }), _jsx("pre", { className: "mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-surface/80 p-2 text-[10px] leading-relaxed text-muted-foreground", children: row.detail })] }))] })] }) }, row.id))) }), _jsxs("div", { className: "mt-3 flex gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: async () => {
                                                                await api.markErrorsSeen();
                                                                void load();
                                                            }, children: "Mark all read" }), _jsxs(Button, { variant: "ghost", size: "sm", onClick: async () => {
                                                                await api.clearErrors();
                                                                void load();
                                                            }, children: [_jsx(Trash2, { className: "size-4 text-bad" }), " Clear log"] })] })] })) })] }), _jsx(DangerZone, { onDone: () => void load() })] }), _jsxs("aside", { className: "space-y-4", children: [_jsxs("div", { className: "gl-panel rounded-lg p-4", children: [_jsx("h2", { className: "mb-3 text-sm font-semibold", children: "At a glance" }), _jsx("dl", { className: "space-y-2.5 text-sm", children: [
                                            ["Players", formatNumber(stats?.counters.players ?? 0)],
                                            ["Races", formatNumber(stats?.counters.races ?? 0)],
                                            ["Recorded runs", formatNumber(stats?.counters.results ?? 0)],
                                            [
                                                "Top speed",
                                                stats?.counters.topWpm ? `${Math.round(stats.counters.topWpm)} wpm` : "n/a",
                                            ],
                                        ].map(([label, value]) => (_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("dt", { className: "text-muted-foreground", children: label }), _jsx("dd", { className: "font-bold tabular-nums", children: value })] }, label))) })] }), _jsxs("div", { className: "gl-panel rounded-lg", children: [_jsxs("h2", { className: "border-b border-border px-4 py-3 text-sm font-semibold", children: ["Open rooms (", rooms.length, ")"] }), rooms.length === 0 ? (_jsx("p", { className: "px-4 py-5 text-xs text-muted-foreground", children: "No rooms yet, create one to get started" })) : (_jsx("ul", { className: "divide-y divide-border", children: rooms.map((room) => (_jsxs("li", { className: "flex items-center gap-2 px-4 py-2.5", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx(Link, { to: `/race/${room.code}`, className: "font-mono text-sm font-bold tracking-wider hover:text-gl-purple", children: room.code }), _jsxs("p", { className: "text-[10px] capitalize text-muted-foreground", children: [room.mode, " \u00B7 ", room.difficulty, " \u00B7 ", room.connected, "/", room.players, " online"] })] }), _jsx(Badge, { variant: room.phase === "racing" ? "ok" : room.phase === "countdown" ? "warn" : "muted", className: cn("shrink-0"), children: room.phase }), _jsx(Button, { variant: "ghost", size: "icon-sm", title: "Close room", onClick: async () => {
                                                        await api.closeRoom(room.code);
                                                        void load();
                                                    }, children: _jsx(X, { className: "size-4 text-bad" }) })] }, room.code))) }))] })] })] })] }));
}
