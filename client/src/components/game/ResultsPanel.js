import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Flag, Medal, ShieldAlert, Sparkles, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, ordinal } from "@/lib/utils";
import { laneHue } from "./RaceTrack";
const PODIUM_ICONS = [Trophy, Medal, Medal];
export function ResultsPanel({ standings, meId, title = "Consensus reached", subtitle, className, }) {
    const firedRef = useRef(false);
    const mine = useMemo(() => standings.find((s) => s.userId === meId) ?? null, [standings, meId]);
    // Celebrate a win or a new personal best — once per result set.
    useEffect(() => {
        if (firedRef.current || !mine)
            return;
        const worthCelebrating = mine.position === 1 || mine.isPersonalBest;
        if (!worthCelebrating)
            return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            return;
        firedRef.current = true;
        const colors = ["#E37DF7", "#9B6AF6", "#5B5AFF", "#FFFFFF"];
        confetti({ particleCount: 90, spread: 72, origin: { y: 0.62 }, colors, disableForReducedMotion: true });
        window.setTimeout(() => confetti({ particleCount: 55, spread: 100, origin: { y: 0.55 }, colors, disableForReducedMotion: true }), 220);
    }, [mine]);
    if (standings.length === 0) {
        return (_jsx("div", { className: cn("gl-panel rounded-lg p-8 text-center text-sm text-muted-foreground", className), children: "Nobody finished this round" }));
    }
    return (_jsxs("div", { className: cn("gl-panel gl-panel-glow overflow-hidden rounded-lg", className), children: [_jsxs("header", { className: "border-b border-border px-5 py-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Flag, { className: "size-4 text-gl-pink" }), _jsx("h2", { className: "text-base font-semibold tracking-tight", children: title })] }), subtitle && _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: subtitle })] }), mine && (_jsx("div", { className: "border-b border-border bg-gl-purple/6 px-5 py-4", children: _jsxs("div", { className: "flex flex-wrap items-center gap-x-6 gap-y-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground", children: "Your placement" }), _jsx("p", { className: "text-2xl font-bold tabular-nums", children: ordinal(mine.position) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground", children: "Speed" }), _jsxs("p", { className: "text-2xl font-bold tabular-nums gl-gradient-text", children: [Math.round(mine.wpm), " ", _jsx("span", { className: "text-sm", children: "wpm" })] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground", children: "Accuracy" }), _jsxs("p", { className: "text-2xl font-bold tabular-nums", children: [mine.accuracy.toFixed(1), "%"] })] }), mine.isPersonalBest && (_jsxs(Badge, { variant: "ok", className: "h-6", children: [_jsx(Sparkles, { className: "size-3" }), "New personal best", mine.previousBest != null && ` · was ${Math.round(mine.previousBest)}`] })), mine.suspicious && (_jsxs(Badge, { variant: "warn", className: "h-6", children: [_jsx(ShieldAlert, { className: "size-3" }), "Held back from the leaderboard"] }))] }) })), _jsx("ol", { className: "divide-y divide-border", children: standings.map((standing, index) => {
                    const Icon = PODIUM_ICONS[standing.position - 1];
                    const hue = laneHue(index);
                    const isMe = standing.userId === meId;
                    return (_jsxs(motion.li, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: Math.min(index * 0.05, 0.4), duration: 0.32 }, className: cn("flex items-center gap-3 px-5 py-3", isMe && "bg-gl-purple/6"), children: [_jsx("span", { className: cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums", standing.position === 1
                                    ? "bg-warn/18 text-warn"
                                    : standing.position <= 3
                                        ? "bg-gl-purple/18 text-gl-purple"
                                        : "bg-surface-3 text-muted-foreground"), children: Icon ? _jsx(Icon, { className: "size-4" }) : standing.position }), _jsxs(Avatar, { className: "size-7", children: [standing.avatarUrl && _jsx(AvatarImage, { src: standing.avatarUrl, alt: "" }), _jsx(AvatarFallback, { style: { color: hue }, children: standing.displayName.slice(0, 2) })] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("p", { className: "flex items-center gap-2 truncate text-sm font-semibold", children: [_jsx("span", { className: "truncate", children: standing.displayName }), standing.isPersonalBest && _jsx(Sparkles, { className: "size-3 shrink-0 text-ok" }), standing.suspicious && _jsx(ShieldAlert, { className: "size-3 shrink-0 text-warn" })] }), _jsxs("p", { className: "text-[11px] text-muted-foreground", children: [standing.finished
                                                ? "Reached finality"
                                                : `Stopped at ${(standing.progress * 100).toFixed(0)}%`, " · ", standing.errors, " error", standing.errors === 1 ? "" : "s"] })] }), _jsxs("div", { className: "shrink-0 text-right", children: [_jsx("p", { className: "text-base font-bold tabular-nums", children: Math.round(standing.wpm) }), _jsxs("p", { className: "text-[10px] uppercase tracking-wider text-muted-foreground", children: [standing.accuracy.toFixed(0), "% acc"] })] })] }, standing.userId));
                }) })] }));
}
