import { Loader2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { laneHue } from "./RaceTrack";
import { cn } from "@/lib/utils";
import type { RacerState, RoomSettings } from "@/lib/types";

interface LobbyWaitingProps {
  racers: RacerState[];
  settings: RoomSettings;
  /** The host sees a different line: they are the one everybody waits for. */
  isHost: boolean;
  className?: string;
}

/**
 * What everyone stares at between joining and the countdown. The one number
 * that matters here is how many people are in the room, so it is the largest
 * thing on the card.
 */
export function LobbyWaiting({ racers, settings, isHost, className }: LobbyWaitingProps) {
  const present = racers.filter((r) => r.connected && !r.isSpectator);
  const spectators = racers.filter((r) => r.connected && r.isSpectator).length;

  return (
    <div className={cn("gl-panel gl-panel-glow rounded-lg px-6 py-7 text-center", className)}>
      <div className="mb-4 flex items-center justify-center gap-3">
        <Users className="size-5 text-gl-purple" />
        <span className="text-5xl font-extrabold tabular-nums leading-none gl-gradient-text">
          {present.length}
        </span>
      </div>

      <p className="text-sm font-semibold">
        {present.length === 1 ? "1 racer in the room" : `${present.length} racers in the room`}
        {spectators > 0 && (
          <span className="font-normal text-muted-foreground">
            {" "}
            and {spectators} watching
          </span>
        )}
      </p>

      <p className="mx-auto mt-1.5 flex max-w-sm items-center justify-center gap-2 text-xs leading-relaxed text-muted-foreground">
        <Loader2 className="size-3 shrink-0 animate-spin" />
        {isHost
          ? "Everyone is waiting on you, start the race when the room looks full"
          : "Waiting for the host to start the race"}
      </p>

      {/* Faces, so a player can see their friends arrive without opening the roster */}
      {present.length > 0 && (
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {present.slice(0, 16).map((racer, index) => (
            <li
              key={racer.userId}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface/70 py-1 pl-1 pr-3"
            >
              <Avatar className="size-5">
                {racer.avatarUrl && <AvatarImage src={racer.avatarUrl} alt="" />}
                <AvatarFallback style={{ color: laneHue(index) }}>
                  {racer.displayName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[8rem] truncate text-xs font-medium">
                {racer.displayName}
              </span>
            </li>
          ))}
          {present.length > 16 && (
            <li className="text-xs font-medium text-muted-foreground">
              and {present.length - 16} more
            </li>
          )}
        </ul>
      )}

      <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {settings.mode === "sprint" ? "60 second sprint" : "First past the finish line"}
        {" · "}
        {settings.difficulty}
        {settings.mode === "race" && ` · ${Math.round(settings.timeLimitSec / 60)} minute cap`}
      </p>
    </div>
  );
}
