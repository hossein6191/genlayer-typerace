import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { Crown, Flag, Ghost, Wifi, WifiOff, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RacerToken } from "./RacerToken";
import { cn, ordinal } from "@/lib/utils";
/** Lane colours, cycled by index. Brand hues first, then supporting tones. */
const LANE_HUES = [
    "#E37DF7",
    "#9B6AF6",
    "#5B5AFF",
    "#43E08B",
    "#FFB443",
    "#FF4D6D",
    "#4CC9F0",
    "#C77DFF",
];
export function laneHue(index) {
    return LANE_HUES[index % LANE_HUES.length];
}
export function RaceTrack({ racers, meId, boosts, maxWpm = 120, compact = false, ghostIds, className, }) {
    const ghosts = new Set(ghostIds ?? []);
    const now = Date.now();
    const lanes = useMemo(() => {
        return racers
            .filter((r) => !r.isSpectator)
            .slice()
            // Leader on top: finished racers first, then by distance covered.
            .sort((a, b) => {
            if (a.position && b.position)
                return a.position - b.position;
            if (a.position)
                return -1;
            if (b.position)
                return 1;
            return b.progress - a.progress;
        });
    }, [racers]);
    if (lanes.length === 0) {
        return (_jsx("div", { className: cn("gl-panel flex items-center justify-center rounded-lg py-10 text-sm text-muted-foreground", className), children: "Waiting for racers to take their lanes\u2026" }));
    }
    return (_jsxs("div", { className: cn("gl-panel relative overflow-hidden rounded-lg", className), role: "list", "aria-label": "Race track", children: [_jsx("div", { className: "pointer-events-none absolute bottom-0 right-[4.5rem] top-0 z-0 w-px bg-gradient-to-b from-transparent via-gl-pink/70 to-transparent" }), _jsxs("div", { className: "pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gl-pink", children: [_jsx(Flag, { className: "size-3" }), _jsx("span", { className: "hidden sm:inline", children: "Finality" })] }), _jsx("div", { className: cn("relative z-[1] flex flex-col", compact ? "gap-1 p-2" : "gap-1.5 p-3"), children: lanes.map((racer, index) => {
                    const hue = laneHue(index);
                    const isMe = racer.userId === meId;
                    const isGhost = ghosts.has(racer.userId);
                    const boosting = (boosts[racer.userId] ?? racer.boostUntil ?? 0) > now;
                    const speed = Math.min(1, racer.wpm / Math.max(40, maxWpm));
                    return (_jsxs("div", { role: "listitem", className: cn("relative flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors", isMe ? "bg-gl-purple/8 ring-1 ring-gl-purple/25" : "hover:bg-surface-2/60", !racer.connected && "opacity-45", isGhost && "opacity-55"), children: [_jsxs("div", { className: "flex w-[9.5rem] min-w-0 shrink-0 items-center gap-2", children: [_jsxs(Avatar, { className: "size-6", children: [racer.avatarUrl && _jsx(AvatarImage, { src: racer.avatarUrl, alt: "" }), _jsx(AvatarFallback, { style: { color: hue }, children: racer.displayName.slice(0, 2) })] }), _jsxs("div", { className: "min-w-0", children: [_jsxs("p", { className: "flex items-center gap-1 truncate text-xs font-semibold", children: [_jsx("span", { className: "truncate", style: { color: isMe ? hue : undefined }, children: racer.displayName }), isGhost && (_jsx(Ghost, { className: "size-3 shrink-0 text-muted-foreground", "aria-label": "Pace car" })), racer.isHost && !isGhost && (_jsx(Crown, { className: "size-3 shrink-0 text-warn", "aria-label": "Host" })), !racer.connected && (_jsx(WifiOff, { className: "size-3 shrink-0 text-muted-foreground", "aria-label": "Disconnected" })), racer.connected && boosting && (_jsx(Zap, { className: "size-3 shrink-0 animate-pulse text-gl-pink", "aria-label": "Boosting" }))] }), _jsx("p", { className: "truncate text-[10px] tabular-nums text-muted-foreground", children: isGhost
                                                    ? `pace ${Math.round(racer.wpm)} wpm`
                                                    : `${Math.round(racer.wpm)} wpm · ${racer.accuracy.toFixed(0)}%` })] })] }), _jsxs("div", { className: "relative h-9 flex-1", children: [_jsx("div", { className: "absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full", style: {
                                            background: `linear-gradient(90deg, ${hue}22, ${hue}0c 60%, transparent)`,
                                        } }), _jsx("div", { className: "absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full transition-[width] duration-150 ease-linear", style: {
                                            width: `${racer.progress * 100}%`,
                                            background: `linear-gradient(90deg, transparent, ${hue})`,
                                            boxShadow: boosting ? `0 0 12px ${hue}` : undefined,
                                        } }), _jsx("div", { className: "pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 opacity-25", style: {
                                            backgroundImage: `repeating-linear-gradient(90deg, ${hue}55 0 6px, transparent 6px 16px)`,
                                        } }), _jsx("div", { className: "absolute top-1/2 -translate-y-1/2 transition-[left] duration-150 ease-linear", style: {
                                            left: `calc(${racer.progress * 100}% - ${racer.progress * 3.2}rem)`,
                                        }, children: _jsx(RacerToken, { speed: speed, boosting: boosting, finished: racer.finishedAt != null, isMe: isMe, ghost: isGhost, hue: hue }) })] }), _jsx("div", { className: "w-14 shrink-0 text-right", children: racer.position ? (_jsx("span", { className: cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums", racer.position === 1
                                        ? "bg-warn/18 text-warn"
                                        : racer.position <= 3
                                            ? "bg-gl-purple/18 text-gl-purple"
                                            : "bg-surface-3 text-muted-foreground"), children: ordinal(racer.position) })) : (_jsxs("span", { className: "text-[11px] tabular-nums text-muted-foreground", children: [(racer.progress * 100).toFixed(0), "%"] })) })] }, racer.userId));
                }) }), lanes.every((l) => !l.connected) && (_jsxs("div", { className: "flex items-center justify-center gap-2 border-t border-border px-3 py-2 text-[11px] text-muted-foreground", children: [_jsx(Wifi, { className: "size-3" }), " Everyone dropped out, waiting for reconnections"] }))] }));
}
