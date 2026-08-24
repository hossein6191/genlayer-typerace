import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Loader2, Medal, Trophy, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { laneHue } from "@/components/game/RaceTrack";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
const SCOPES = [
    { id: "all", label: "All" },
    { id: "easy", label: "Easy" },
    { id: "medium", label: "Medium" },
    { id: "hard", label: "Hard" },
];
const WINDOWS = [
    { id: "all", label: "All time" },
    { id: "7d", label: "7 days" },
    { id: "24h", label: "24 hours" },
];
export default function Leaderboard() {
    const { user } = useAuth();
    const [scope, setScope] = useState("all");
    const [window, setWindow] = useState("all");
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        api
            .leaderboard({ difficulty: scope, window, limit: 100 })
            .then((data) => {
            if (!cancelled)
                setEntries(data.entries);
        })
            .catch(() => {
            if (!cancelled)
                setEntries([]);
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [scope, window]);
    const podium = entries.slice(0, 3);
    const rest = entries.slice(3);
    return (_jsxs("div", { className: "mx-auto w-full max-w-4xl px-4 py-8 sm:py-12", children: [_jsxs("div", { className: "mb-7", children: [_jsxs("h1", { className: "flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl", children: [_jsx(Trophy, { className: "size-6 text-warn" }), "The ", _jsx("span", { className: "gl-gradient-text", children: "leaderboard" })] }), _jsx("p", { className: "mt-1.5 text-sm text-muted-foreground", children: "Ranked by each player's fastest clean run, and flagged runs never reach this list" })] }), _jsxs("div", { className: "mb-6 flex flex-wrap gap-3", children: [_jsx(Tabs, { value: scope, onValueChange: (v) => setScope(v), children: _jsx(TabsList, { children: SCOPES.map((s) => (_jsx(TabsTrigger, { value: s.id, children: s.label }, s.id))) }) }), _jsx(Tabs, { value: window, onValueChange: (v) => setWindow(v), children: _jsx(TabsList, { children: WINDOWS.map((w) => (_jsx(TabsTrigger, { value: w.id, children: w.label }, w.id))) }) })] }), loading ? (_jsxs("div", { className: "flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground", children: [_jsx(Loader2, { className: "size-4 animate-spin" }), " Reading the ledger\u2026"] })) : entries.length === 0 ? (_jsxs("div", { className: "gl-panel rounded-lg px-6 py-16 text-center", children: [_jsx(UserRound, { className: "mx-auto mb-3 size-8 text-muted-foreground" }), _jsx("p", { className: "font-semibold", children: "Nothing recorded yet" }), _jsxs("p", { className: "mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground", children: ["Be the first name on this board.", " ", _jsx(Link, { to: "/play", className: "font-semibold text-gl-purple underline underline-offset-2", children: "Run a practice lap" }), " ", "and your best time lands here"] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-4 grid gap-3 sm:grid-cols-3", children: podium.map((entry, i) => (_jsxs("div", { className: cn("gl-panel relative overflow-hidden rounded-lg p-4", i === 0 && "gl-panel-glow sm:order-2", i === 1 && "sm:order-1", i === 2 && "sm:order-3", entry.userId === user?.id && "ring-1 ring-gl-purple/40"), children: [_jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute inset-x-0 top-0 h-px", style: {
                                        background: `linear-gradient(90deg, transparent, ${laneHue(i)}, transparent)`,
                                    } }), _jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("span", { className: cn("grid size-8 place-items-center rounded-full", i === 0 ? "bg-warn/18 text-warn" : "bg-gl-purple/15 text-gl-purple"), children: i === 0 ? _jsx(Crown, { className: "size-4" }) : _jsx(Medal, { className: "size-4" }) }), _jsxs("span", { className: "text-xs font-bold tabular-nums text-muted-foreground", children: ["#", entry.rank] })] }), _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsxs(Avatar, { className: "size-9", children: [entry.avatarUrl && _jsx(AvatarImage, { src: entry.avatarUrl, alt: "" }), _jsx(AvatarFallback, { style: { color: laneHue(i) }, children: entry.displayName.slice(0, 2) })] }), _jsxs("div", { className: "min-w-0", children: [_jsx(Link, { to: `/profile/${entry.userId}`, className: "block truncate text-sm font-semibold hover:text-gl-purple", children: entry.displayName }), _jsxs("p", { className: "text-[11px] text-muted-foreground", children: [formatNumber(entry.races), " races \u00B7 ", entry.wins, " wins"] })] })] }), _jsxs("p", { className: "mt-3 text-2xl font-bold tabular-nums gl-gradient-text", children: [Math.round(entry.wpm), _jsx("span", { className: "ml-1 text-sm", children: "wpm" })] }), _jsxs("p", { className: "text-[11px] text-muted-foreground", children: [entry.accuracy.toFixed(1), "% accuracy"] })] }, entry.userId))) }), rest.length > 0 && (_jsx("div", { className: "gl-panel overflow-hidden rounded-lg", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("caption", { className: "sr-only", children: "Leaderboard ranks 4 and below" }), _jsx("thead", { children: _jsxs("tr", { className: "border-b border-border text-[10px] uppercase tracking-[0.14em] text-muted-foreground", children: [_jsx("th", { scope: "col", className: "px-4 py-2.5 text-left font-semibold", children: "#" }), _jsx("th", { scope: "col", className: "px-2 py-2.5 text-left font-semibold", children: "Player" }), _jsx("th", { scope: "col", className: "px-2 py-2.5 text-right font-semibold", children: "WPM" }), _jsx("th", { scope: "col", className: "hidden px-2 py-2.5 text-right font-semibold sm:table-cell", children: "Accuracy" }), _jsx("th", { scope: "col", className: "hidden px-4 py-2.5 text-right font-semibold sm:table-cell", children: "Races" })] }) }), _jsx("tbody", { className: "divide-y divide-border", children: rest.map((entry) => (_jsxs("tr", { className: cn("transition-colors hover:bg-surface-2/60", entry.userId === user?.id && "bg-gl-purple/8"), children: [_jsx("td", { className: "px-4 py-2.5 text-xs font-bold tabular-nums text-muted-foreground", children: entry.rank }), _jsx("td", { className: "px-2 py-2.5", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Avatar, { className: "size-6", children: [entry.avatarUrl && _jsx(AvatarImage, { src: entry.avatarUrl, alt: "" }), _jsx(AvatarFallback, { children: entry.displayName.slice(0, 2) })] }), _jsx(Link, { to: `/profile/${entry.userId}`, className: "truncate font-medium hover:text-gl-purple", children: entry.displayName })] }) }), _jsx("td", { className: "px-2 py-2.5 text-right font-bold tabular-nums", children: Math.round(entry.wpm) }), _jsxs("td", { className: "hidden px-2 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell", children: [entry.accuracy.toFixed(0), "%"] }), _jsx("td", { className: "hidden px-4 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell", children: formatNumber(entry.races) })] }, entry.userId))) })] }) }))] }))] }));
}
