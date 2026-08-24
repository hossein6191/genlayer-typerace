import { useMemo } from "react";
import { Crown, Flag, Ghost, Wifi, WifiOff, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RacerToken } from "./RacerToken";
import { cn, ordinal } from "@/lib/utils";
import type { RacerState } from "@/lib/types";

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

export function laneHue(index: number) {
  return LANE_HUES[index % LANE_HUES.length];
}

interface RaceTrackProps {
  racers: RacerState[];
  meId: string | null;
  boosts: Record<string, number>;
  /** Peak WPM in the room, used to normalise the speed visuals. */
  maxWpm?: number;
  /**
   * Racers that are not people. A pace car showing your own record is useful
   * to chase, but only once it is obviously not another player.
   */
  ghostIds?: string[];
  compact?: boolean;
  className?: string;
}

export function RaceTrack({
  racers,
  meId,
  boosts,
  maxWpm = 120,
  compact = false,
  ghostIds,
  className,
}: RaceTrackProps) {
  const ghosts = new Set(ghostIds ?? []);
  const now = Date.now();

  const lanes = useMemo(() => {
    return racers
      .filter((r) => !r.isSpectator)
      .slice()
      // Leader on top: finished racers first, then by distance covered.
      .sort((a, b) => {
        if (a.position && b.position) return a.position - b.position;
        if (a.position) return -1;
        if (b.position) return 1;
        return b.progress - a.progress;
      });
  }, [racers]);

  if (lanes.length === 0) {
    return (
      <div
        className={cn(
          "gl-panel flex items-center justify-center rounded-lg py-10 text-sm text-muted-foreground",
          className,
        )}
      >
        Waiting for racers to take their lanes…
      </div>
    );
  }

  return (
    <div
      className={cn("gl-panel relative overflow-hidden rounded-lg", className)}
      role="list"
      aria-label="Race track"
    >
      {/* Finish line — the point of finality. */}
      <div className="pointer-events-none absolute bottom-0 right-[4.5rem] top-0 z-0 w-px bg-gradient-to-b from-transparent via-gl-pink/70 to-transparent" />
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gl-pink">
        <Flag className="size-3" />
        <span className="hidden sm:inline">Finality</span>
      </div>

      <div className={cn("relative z-[1] flex flex-col", compact ? "gap-1 p-2" : "gap-1.5 p-3")}>
        {lanes.map((racer, index) => {
          const hue = laneHue(index);
          const isMe = racer.userId === meId;
          const isGhost = ghosts.has(racer.userId);
          const boosting = (boosts[racer.userId] ?? racer.boostUntil ?? 0) > now;
          const speed = Math.min(1, racer.wpm / Math.max(40, maxWpm));

          return (
            <div
              key={racer.userId}
              role="listitem"
              className={cn(
                "relative flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors",
                isMe ? "bg-gl-purple/8 ring-1 ring-gl-purple/25" : "hover:bg-surface-2/60",
                !racer.connected && "opacity-45",
                isGhost && "opacity-55",
              )}
            >
              {/* Identity */}
              <div className="flex w-[9.5rem] min-w-0 shrink-0 items-center gap-2">
                <Avatar className="size-6">
                  {racer.avatarUrl && <AvatarImage src={racer.avatarUrl} alt="" />}
                  <AvatarFallback style={{ color: hue }}>
                    {racer.displayName.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-xs font-semibold">
                    <span className="truncate" style={{ color: isMe ? hue : undefined }}>
                      {racer.displayName}
                    </span>
                    {isGhost && (
                      <Ghost className="size-3 shrink-0 text-muted-foreground" aria-label="Pace car" />
                    )}
                    {racer.isHost && !isGhost && (
                      <Crown className="size-3 shrink-0 text-warn" aria-label="Host" />
                    )}
                    {!racer.connected && (
                      <WifiOff className="size-3 shrink-0 text-muted-foreground" aria-label="Disconnected" />
                    )}
                    {racer.connected && boosting && (
                      <Zap className="size-3 shrink-0 animate-pulse text-gl-pink" aria-label="Boosting" />
                    )}
                  </p>
                  <p className="truncate text-[10px] tabular-nums text-muted-foreground">
                    {isGhost
                      ? `pace ${Math.round(racer.wpm)} wpm`
                      : `${Math.round(racer.wpm)} wpm · ${racer.accuracy.toFixed(0)}%`}
                  </p>
                </div>
              </div>

              {/* Lane */}
              <div className="relative h-9 flex-1">
                <div
                  className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${hue}22, ${hue}0c 60%, transparent)`,
                  }}
                />
                {/* Covered distance */}
                <div
                  className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full transition-[width] duration-150 ease-linear"
                  style={{
                    width: `${racer.progress * 100}%`,
                    background: `linear-gradient(90deg, transparent, ${hue})`,
                    boxShadow: boosting ? `0 0 12px ${hue}` : undefined,
                  }}
                />
                {/* Dashed lane markings */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 opacity-25"
                  style={{
                    backgroundImage: `repeating-linear-gradient(90deg, ${hue}55 0 6px, transparent 6px 16px)`,
                  }}
                />

                <div
                  className="absolute top-1/2 -translate-y-1/2 transition-[left] duration-150 ease-linear"
                  style={{
                    left: `calc(${racer.progress * 100}% - ${racer.progress * 3.2}rem)`,
                  }}
                >
                  <RacerToken
                    speed={speed}
                    boosting={boosting}
                    finished={racer.finishedAt != null}
                    isMe={isMe}
                    ghost={isGhost}
                    hue={hue}
                  />
                </div>
              </div>

              {/* Placement */}
              <div className="w-14 shrink-0 text-right">
                {racer.position ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                      racer.position === 1
                        ? "bg-warn/18 text-warn"
                        : racer.position <= 3
                          ? "bg-gl-purple/18 text-gl-purple"
                          : "bg-surface-3 text-muted-foreground",
                    )}
                  >
                    {ordinal(racer.position)}
                  </span>
                ) : (
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {(racer.progress * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live connection hint for spectators of an empty room. */}
      {lanes.every((l) => !l.connected) && (
        <div className="flex items-center justify-center gap-2 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <Wifi className="size-3" /> Everyone dropped out, waiting for reconnections
        </div>
      )}
    </div>
  );
}
