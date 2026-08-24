import { useEffect, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Flag, Medal, ShieldAlert, Sparkles, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, ordinal } from "@/lib/utils";
import { laneHue } from "./RaceTrack";
import type { FinalStanding } from "@/lib/types";

interface ResultsPanelProps {
  standings: FinalStanding[];
  meId: string | null;
  title?: string;
  subtitle?: string;
  className?: string;
}

const PODIUM_ICONS = [Trophy, Medal, Medal];

export function ResultsPanel({
  standings,
  meId,
  title = "Consensus reached",
  subtitle,
  className,
}: ResultsPanelProps) {
  const firedRef = useRef(false);

  const mine = useMemo(
    () => standings.find((s) => s.userId === meId) ?? null,
    [standings, meId],
  );

  // Celebrate a win or a new personal best — once per result set.
  useEffect(() => {
    if (firedRef.current || !mine) return;
    const worthCelebrating = mine.position === 1 || mine.isPersonalBest;
    if (!worthCelebrating) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    firedRef.current = true;
    const colors = ["#E37DF7", "#9B6AF6", "#5B5AFF", "#FFFFFF"];
    confetti({ particleCount: 90, spread: 72, origin: { y: 0.62 }, colors, disableForReducedMotion: true });
    window.setTimeout(
      () => confetti({ particleCount: 55, spread: 100, origin: { y: 0.55 }, colors, disableForReducedMotion: true }),
      220,
    );
  }, [mine]);

  if (standings.length === 0) {
    return (
      <div className={cn("gl-panel rounded-lg p-8 text-center text-sm text-muted-foreground", className)}>
        Nobody finished this round
      </div>
    );
  }

  return (
    <div className={cn("gl-panel gl-panel-glow overflow-hidden rounded-lg", className)}>
      <header className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Flag className="size-4 text-gl-pink" />
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </header>

      {mine && (
        <div className="border-b border-border bg-gl-purple/6 px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Your placement
              </p>
              <p className="text-2xl font-bold tabular-nums">{ordinal(mine.position)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Speed
              </p>
              <p className="text-2xl font-bold tabular-nums gl-gradient-text">
                {Math.round(mine.wpm)} <span className="text-sm">wpm</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Accuracy
              </p>
              <p className="text-2xl font-bold tabular-nums">{mine.accuracy.toFixed(1)}%</p>
            </div>
            {mine.isPersonalBest && (
              <Badge variant="ok" className="h-6">
                <Sparkles className="size-3" />
                New personal best
                {mine.previousBest != null && ` · was ${Math.round(mine.previousBest)}`}
              </Badge>
            )}
            {mine.suspicious && (
              <Badge variant="warn" className="h-6">
                <ShieldAlert className="size-3" />
                Held back from the leaderboard
              </Badge>
            )}
          </div>
        </div>
      )}

      <ol className="divide-y divide-border">
        {standings.map((standing, index) => {
          const Icon = PODIUM_ICONS[standing.position - 1];
          const hue = laneHue(index);
          const isMe = standing.userId === meId;

          return (
            <motion.li
              key={standing.userId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.32 }}
              className={cn(
                "flex items-center gap-3 px-5 py-3",
                isMe && "bg-gl-purple/6",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums",
                  standing.position === 1
                    ? "bg-warn/18 text-warn"
                    : standing.position <= 3
                      ? "bg-gl-purple/18 text-gl-purple"
                      : "bg-surface-3 text-muted-foreground",
                )}
              >
                {Icon ? <Icon className="size-4" /> : standing.position}
              </span>

              <Avatar className="size-7">
                {standing.avatarUrl && <AvatarImage src={standing.avatarUrl} alt="" />}
                <AvatarFallback style={{ color: hue }}>
                  {standing.displayName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-semibold">
                  <span className="truncate">{standing.displayName}</span>
                  {standing.isPersonalBest && <Sparkles className="size-3 shrink-0 text-ok" />}
                  {standing.suspicious && <ShieldAlert className="size-3 shrink-0 text-warn" />}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {standing.finished
                    ? "Reached finality"
                    : `Stopped at ${(standing.progress * 100).toFixed(0)}%`}
                  {" · "}
                  {standing.errors} error{standing.errors === 1 ? "" : "s"}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-base font-bold tabular-nums">{Math.round(standing.wpm)}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {standing.accuracy.toFixed(0)}% acc
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
