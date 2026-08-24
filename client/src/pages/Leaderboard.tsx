import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Loader2, Medal, Trophy, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { laneHue } from "@/components/game/RaceTrack";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import type { Difficulty, LeaderboardEntry } from "@/lib/types";

type Scope = Difficulty | "all";
type Window = "all" | "7d" | "24h";

const SCOPES: Array<{ id: Scope; label: string }> = [
  { id: "all", label: "All" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

const WINDOWS: Array<{ id: Window; label: string }> = [
  { id: "all", label: "All time" },
  { id: "7d", label: "7 days" },
  { id: "24h", label: "24 hours" },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>("all");
  const [window, setWindow] = useState<Window>("all");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .leaderboard({ difficulty: scope, window, limit: 100 })
      .then((data) => {
        if (!cancelled) setEntries(data.entries);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, window]);

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <div className="mb-7">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
          <Trophy className="size-6 text-warn" />
          The <span className="gl-gradient-text">leaderboard</span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ranked by each player's fastest clean run, and flagged runs never reach this list
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <TabsList>
            {SCOPES.map((s) => (
              <TabsTrigger key={s.id} value={s.id}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Tabs value={window} onValueChange={(v) => setWindow(v as Window)}>
          <TabsList>
            {WINDOWS.map((w) => (
              <TabsTrigger key={w.id} value={w.id}>
                {w.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Reading the ledger…
        </div>
      ) : entries.length === 0 ? (
        <div className="gl-panel rounded-lg px-6 py-16 text-center">
          <UserRound className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-semibold">Nothing recorded yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Be the first name on this board.{" "}
            <Link to="/play" className="font-semibold text-gl-purple underline underline-offset-2">
              Run a practice lap
            </Link>{" "}
            and your best time lands here
          </p>
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            {podium.map((entry, i) => (
              <div
                key={entry.userId}
                className={cn(
                  "gl-panel relative overflow-hidden rounded-lg p-4",
                  i === 0 && "gl-panel-glow sm:order-2",
                  i === 1 && "sm:order-1",
                  i === 2 && "sm:order-3",
                  entry.userId === user?.id && "ring-1 ring-gl-purple/40",
                )}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${laneHue(i)}, transparent)`,
                  }}
                />
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full",
                      i === 0 ? "bg-warn/18 text-warn" : "bg-gl-purple/15 text-gl-purple",
                    )}
                  >
                    {i === 0 ? <Crown className="size-4" /> : <Medal className="size-4" />}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-muted-foreground">
                    #{entry.rank}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-9">
                    {entry.avatarUrl && <AvatarImage src={entry.avatarUrl} alt="" />}
                    <AvatarFallback style={{ color: laneHue(i) }}>
                      {entry.displayName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <Link
                      to={`/profile/${entry.userId}`}
                      className="block truncate text-sm font-semibold hover:text-gl-purple"
                    >
                      {entry.displayName}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">
                      {formatNumber(entry.races)} races · {entry.wins} wins
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold tabular-nums gl-gradient-text">
                  {Math.round(entry.wpm)}
                  <span className="ml-1 text-sm">wpm</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {entry.accuracy.toFixed(1)}% accuracy
                </p>
              </div>
            ))}
          </div>

          {/* The rest */}
          {rest.length > 0 && (
            <div className="gl-panel overflow-hidden rounded-lg">
              <table className="w-full text-sm">
                <caption className="sr-only">Leaderboard ranks 4 and below</caption>
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">
                      #
                    </th>
                    <th scope="col" className="px-2 py-2.5 text-left font-semibold">
                      Player
                    </th>
                    <th scope="col" className="px-2 py-2.5 text-right font-semibold">
                      WPM
                    </th>
                    <th scope="col" className="hidden px-2 py-2.5 text-right font-semibold sm:table-cell">
                      Accuracy
                    </th>
                    <th scope="col" className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">
                      Races
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rest.map((entry) => (
                    <tr
                      key={entry.userId}
                      className={cn(
                        "transition-colors hover:bg-surface-2/60",
                        entry.userId === user?.id && "bg-gl-purple/8",
                      )}
                    >
                      <td className="px-4 py-2.5 text-xs font-bold tabular-nums text-muted-foreground">
                        {entry.rank}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6">
                            {entry.avatarUrl && <AvatarImage src={entry.avatarUrl} alt="" />}
                            <AvatarFallback>{entry.displayName.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <Link
                            to={`/profile/${entry.userId}`}
                            className="truncate font-medium hover:text-gl-purple"
                          >
                            {entry.displayName}
                          </Link>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right font-bold tabular-nums">
                        {Math.round(entry.wpm)}
                      </td>
                      <td className="hidden px-2 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                        {entry.accuracy.toFixed(0)}%
                      </td>
                      <td className="hidden px-4 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                        {formatNumber(entry.races)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
