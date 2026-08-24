import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Flame, Gauge, Loader2, Target, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn, formatNumber, ordinal } from "@/lib/utils";
const DIFFICULTY_ACCENT = {
    easy: "#43E08B",
    medium: "#9B6AF6",
    hard: "#FF4D6D",
};
function StatCard({ icon, label, value, sub, }) {
    return (_jsxs("div", { className: "gl-panel rounded-lg p-4", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-muted-foreground", children: [icon, _jsx("span", { className: "text-[10px] font-semibold uppercase tracking-[0.16em]", children: label })] }), _jsx("p", { className: "text-2xl font-bold tabular-nums", children: value }), sub && _jsx("p", { className: "mt-0.5 text-[11px] text-muted-foreground", children: sub })] }));
}
export default function Profile() {
    const { userId } = useParams();
    const { user, profile: ownProfile, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const targetId = userId ?? user?.id;
    useEffect(() => {
        if (!targetId) {
            setLoading(authLoading);
            return;
        }
        if (!userId && ownProfile) {
            setProfile(ownProfile);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        api
            .profile(targetId)
            .then((p) => !cancelled && setProfile(p))
            .catch(() => !cancelled && setProfile(null))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [targetId, userId, ownProfile, authLoading]);
    if (loading) {
        return (_jsxs("div", { className: "flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground", children: [_jsx(Loader2, { className: "size-4 animate-spin" }), " Loading profile\u2026"] }));
    }
    if (!profile) {
        return (_jsxs("div", { className: "mx-auto max-w-lg px-4 py-24 text-center", children: [_jsx("h1", { className: "text-xl font-bold tracking-tight", children: "No profile to show" }), _jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: targetId ? "That player has not raced yet" : "Sign in to build a record of your own" }), _jsx(Link, { to: "/play", children: _jsx(Button, { variant: "gradient", className: "mt-6", children: "Run a lap" }) })] }));
    }
    const isMe = profile.user.id === user?.id;
    return (_jsxs("div", { className: "mx-auto w-full max-w-4xl px-4 py-8 sm:py-12", children: [_jsxs("header", { className: "mb-8 flex flex-wrap items-center gap-4", children: [_jsxs(Avatar, { className: "size-16 ring-2 ring-gl-purple/40", children: [profile.user.avatarUrl && _jsx(AvatarImage, { src: profile.user.avatarUrl, alt: "" }), _jsx(AvatarFallback, { className: "text-lg", children: profile.user.displayName.slice(0, 2) })] }), _jsxs("div", { className: "min-w-0", children: [_jsxs("h1", { className: "flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight", children: [profile.user.displayName, isMe && _jsx(Badge, { variant: "default", children: "you" })] }), _jsxs("p", { className: "mt-0.5 text-sm text-muted-foreground", children: [formatNumber(profile.stats.races), " races \u00B7", " ", formatNumber(profile.stats.wins), " wins \u00B7", " ", formatNumber(profile.stats.podiums), " podiums"] })] }), _jsx(Link, { to: "/play", className: "ml-auto", children: _jsx(Button, { variant: "gradient", children: isMe ? "Race again" : "Beat this score" }) })] }), _jsxs("div", { className: "mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: [_jsx(StatCard, { icon: _jsx(Gauge, { className: "size-3.5" }), label: "Best speed", value: `${Math.round(profile.stats.bestWpm)} wpm` }), _jsx(StatCard, { icon: _jsx(Flame, { className: "size-3.5" }), label: "Average speed", value: `${Math.round(profile.stats.avgWpm)} wpm`, sub: "across every recorded run" }), _jsx(StatCard, { icon: _jsx(Target, { className: "size-3.5" }), label: "Average accuracy", value: `${profile.stats.avgAccuracy.toFixed(1)}%` }), _jsx(StatCard, { icon: _jsx(Trophy, { className: "size-3.5" }), label: "Wins", value: formatNumber(profile.stats.wins), sub: profile.stats.races ? `${((profile.stats.wins / profile.stats.races) * 100).toFixed(0)}% win rate` : undefined })] }), profile.bests.length > 0 && (_jsxs("section", { className: "mb-6", children: [_jsx("h2", { className: "mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground", children: "Records by tier" }), _jsx("div", { className: "grid gap-3 sm:grid-cols-3", children: ["easy", "medium", "hard"].map((difficulty) => {
                            const best = profile.bests.find((b) => b.difficulty === difficulty);
                            const accent = DIFFICULTY_ACCENT[difficulty];
                            return (_jsxs("div", { className: cn("gl-panel rounded-lg p-4", !best && "opacity-45"), style: best ? { boxShadow: `inset 0 0 0 1px ${accent}33` } : undefined, children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-[0.2em]", style: { color: accent }, children: difficulty }), _jsxs("p", { className: "mt-1 text-2xl font-bold tabular-nums", children: [best ? Math.round(best.wpm) : "n/a", best && _jsx("span", { className: "ml-1 text-sm font-medium", children: "wpm" })] }), _jsx("p", { className: "text-[11px] text-muted-foreground", children: best ? `${best.accuracy.toFixed(1)}% accuracy` : "no record yet" })] }, difficulty));
                        }) })] })), profile.recent.length > 0 && (_jsxs("section", { children: [_jsx("h2", { className: "mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground", children: "Recent runs" }), _jsx("div", { className: "gl-panel overflow-hidden rounded-lg", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border text-[10px] uppercase tracking-[0.14em] text-muted-foreground", children: [_jsx("th", { scope: "col", className: "px-4 py-2.5 text-left font-semibold", children: "Mode" }), _jsx("th", { scope: "col", className: "px-2 py-2.5 text-left font-semibold", children: "Tier" }), _jsx("th", { scope: "col", className: "px-2 py-2.5 text-right font-semibold", children: "WPM" }), _jsx("th", { scope: "col", className: "px-2 py-2.5 text-right font-semibold", children: "Accuracy" }), _jsx("th", { scope: "col", className: "px-4 py-2.5 text-right font-semibold", children: "Place" })] }) }), _jsx("tbody", { className: "divide-y divide-border", children: profile.recent.map((run) => (_jsxs("tr", { className: "transition-colors hover:bg-surface-2/60", children: [_jsx("td", { className: "px-4 py-2.5 text-xs capitalize text-muted-foreground", children: run.mode.replace("-", " ") }), _jsx("td", { className: "px-2 py-2.5", children: _jsx("span", { className: "text-xs font-semibold capitalize", style: { color: DIFFICULTY_ACCENT[run.difficulty] }, children: run.difficulty }) }), _jsx("td", { className: "px-2 py-2.5 text-right font-bold tabular-nums", children: Math.round(run.wpm) }), _jsxs("td", { className: "px-2 py-2.5 text-right tabular-nums text-muted-foreground", children: [run.accuracy.toFixed(0), "%"] }), _jsx("td", { className: "px-4 py-2.5 text-right text-xs tabular-nums text-muted-foreground", children: run.position ? ordinal(run.position) : "solo" })] }, run.id))) })] }) })] }))] }));
}
