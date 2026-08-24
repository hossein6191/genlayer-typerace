import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Loader2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { laneHue } from "./RaceTrack";
import { cn } from "@/lib/utils";
/**
 * What everyone stares at between joining and the countdown. The one number
 * that matters here is how many people are in the room, so it is the largest
 * thing on the card.
 */
export function LobbyWaiting({ racers, settings, isHost, className }) {
    const present = racers.filter((r) => r.connected && !r.isSpectator);
    const spectators = racers.filter((r) => r.connected && r.isSpectator).length;
    return (_jsxs("div", { className: cn("gl-panel gl-panel-glow rounded-lg px-6 py-7 text-center", className), children: [_jsxs("div", { className: "mb-4 flex items-center justify-center gap-3", children: [_jsx(Users, { className: "size-5 text-gl-purple" }), _jsx("span", { className: "text-5xl font-extrabold tabular-nums leading-none gl-gradient-text", children: present.length })] }), _jsxs("p", { className: "text-sm font-semibold", children: [present.length === 1 ? "1 racer in the room" : `${present.length} racers in the room`, spectators > 0 && (_jsxs("span", { className: "font-normal text-muted-foreground", children: [" ", "and ", spectators, " watching"] }))] }), _jsxs("p", { className: "mx-auto mt-1.5 flex max-w-sm items-center justify-center gap-2 text-xs leading-relaxed text-muted-foreground", children: [_jsx(Loader2, { className: "size-3 shrink-0 animate-spin" }), isHost
                        ? "Everyone is waiting on you, start the race when the room looks full"
                        : "Waiting for the host to start the race"] }), present.length > 0 && (_jsxs("ul", { className: "mt-5 flex flex-wrap items-center justify-center gap-2", children: [present.slice(0, 16).map((racer, index) => (_jsxs("li", { className: "flex items-center gap-1.5 rounded-full border border-border bg-surface/70 py-1 pl-1 pr-3", children: [_jsxs(Avatar, { className: "size-5", children: [racer.avatarUrl && _jsx(AvatarImage, { src: racer.avatarUrl, alt: "" }), _jsx(AvatarFallback, { style: { color: laneHue(index) }, children: racer.displayName.slice(0, 2) })] }), _jsx("span", { className: "max-w-[8rem] truncate text-xs font-medium", children: racer.displayName })] }, racer.userId))), present.length > 16 && (_jsxs("li", { className: "text-xs font-medium text-muted-foreground", children: ["and ", present.length - 16, " more"] }))] })), _jsxs("p", { className: "mt-5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground", children: [settings.mode === "sprint" ? "60 second sprint" : "First past the finish line", " · ", settings.difficulty, settings.mode === "race" && ` · ${Math.round(settings.timeLimitSec / 60)} minute cap`] })] }));
}
