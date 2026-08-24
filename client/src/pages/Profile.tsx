import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Flame, Gauge, Loader2, Target, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn, formatNumber, ordinal } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

const DIFFICULTY_ACCENT: Record<string, string> = {
  easy: "#43E08B",
  medium: "#9B6AF6",
  hard: "#FF4D6D",
};

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="gl-panel rounded-lg p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function Profile() {
  const { userId } = useParams<{ userId?: string }>();
  const { user, profile: ownProfile, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-bold tracking-tight">No profile to show</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {targetId ? "That player has not raced yet" : "Sign in to build a record of your own"}
        </p>
        <Link to="/play">
          <Button variant="gradient" className="mt-6">
            Run a lap
          </Button>
        </Link>
      </div>
    );
  }

  const isMe = profile.user.id === user?.id;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center gap-4">
        <Avatar className="size-16 ring-2 ring-gl-purple/40">
          {profile.user.avatarUrl && <AvatarImage src={profile.user.avatarUrl} alt="" />}
          <AvatarFallback className="text-lg">
            {profile.user.displayName.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
            {profile.user.displayName}
            {isMe && <Badge variant="default">you</Badge>}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatNumber(profile.stats.races)} races ·{" "}
            {formatNumber(profile.stats.wins)} wins ·{" "}
            {formatNumber(profile.stats.podiums)} podiums
          </p>
        </div>
        <Link to="/play" className="ml-auto">
          <Button variant="gradient">{isMe ? "Race again" : "Beat this score"}</Button>
        </Link>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Gauge className="size-3.5" />}
          label="Best speed"
          value={`${Math.round(profile.stats.bestWpm)} wpm`}
        />
        <StatCard
          icon={<Flame className="size-3.5" />}
          label="Average speed"
          value={`${Math.round(profile.stats.avgWpm)} wpm`}
          sub="across every recorded run"
        />
        <StatCard
          icon={<Target className="size-3.5" />}
          label="Average accuracy"
          value={`${profile.stats.avgAccuracy.toFixed(1)}%`}
        />
        <StatCard
          icon={<Trophy className="size-3.5" />}
          label="Wins"
          value={formatNumber(profile.stats.wins)}
          sub={profile.stats.races ? `${((profile.stats.wins / profile.stats.races) * 100).toFixed(0)}% win rate` : undefined}
        />
      </div>

      {profile.bests.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Records by tier
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["easy", "medium", "hard"] as const).map((difficulty) => {
              const best = profile.bests.find((b) => b.difficulty === difficulty);
              const accent = DIFFICULTY_ACCENT[difficulty];
              return (
                <div
                  key={difficulty}
                  className={cn(
                    "gl-panel rounded-lg p-4",
                    !best && "opacity-45",
                  )}
                  style={best ? { boxShadow: `inset 0 0 0 1px ${accent}33` } : undefined}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: accent }}
                  >
                    {difficulty}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {best ? Math.round(best.wpm) : "n/a"}
                    {best && <span className="ml-1 text-sm font-medium">wpm</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {best ? `${best.accuracy.toFixed(1)}% accuracy` : "no record yet"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {profile.recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Recent runs
          </h2>
          <div className="gl-panel overflow-hidden rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Mode</th>
                  <th scope="col" className="px-2 py-2.5 text-left font-semibold">Tier</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-semibold">WPM</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-semibold">Accuracy</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Place</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profile.recent.map((run) => (
                  <tr key={run.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-2.5 text-xs capitalize text-muted-foreground">
                      {run.mode.replace("-", " ")}
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className="text-xs font-semibold capitalize"
                        style={{ color: DIFFICULTY_ACCENT[run.difficulty] }}
                      >
                        {run.difficulty}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right font-bold tabular-nums">
                      {Math.round(run.wpm)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                      {run.accuracy.toFixed(0)}%
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted-foreground">
                      {run.position ? ordinal(run.position) : "solo"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
