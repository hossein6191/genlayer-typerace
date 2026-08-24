import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Copy,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Bug,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DangerZone } from "@/components/game/DangerZone";
import { PassagePicker } from "@/components/game/PassagePicker";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import type { AdminRoomRow, Difficulty, RaceMode } from "@/lib/types";

interface Stats {
  counters: { players: number; races: number; results: number; topWpm: number | null };
  flagged: Array<{
    id: string;
    wpm: number;
    accuracy: number;
    difficulty: string;
    mode: string;
    created_at: number;
    username: string;
    user_id: string;
  }>;
  recent: Array<{
    id: string;
    wpm: number;
    accuracy: number;
    difficulty: string;
    mode: string;
    position: number | null;
    created_at: number;
    username: string;
    user_id: string;
  }>;
  activeRooms: AdminRoomRow[];
  errors: {
    counts: { total: number; last24h: number; unseen: number };
    recent: Array<{
      id: string;
      at: number;
      source: string;
      message: string;
      detail: string | null;
      url: string | null;
      user_id: string | null;
      user_agent: string | null;
      seen: number;
    }>;
  };
}

function Gate() {
  const { loginAsAdmin } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-24">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl border border-warn/40 bg-warn/10">
          <LockKeyhole className="size-5 text-warn" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Race control</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create rooms, start races and moderate the ledger
        </p>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await loginAsAdmin(password);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Label htmlFor="admin-password">Admin password</Label>
        <Input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Button type="submit" variant="gradient" disabled={busy || !password}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          Unlock
        </Button>
        {error && (
          <p role="alert" className="text-xs font-medium text-bad">
            {error}
          </p>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          The password is the <code className="font-mono">ADMIN_PASSWORD</code> environment
          variable on the server
        </p>
      </form>
    </div>
  );
}

export default function Admin() {
  const { isAdmin, logoutAdmin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [rooms, setRooms] = useState<AdminRoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ code: string; inviteUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<RaceMode>("race");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [countdownSec, setCountdownSec] = useState(5);
  const [timeLimitSec, setTimeLimitSec] = useState(180);
  const [allowLateJoin, setAllowLateJoin] = useState(true);
  const [passageId, setPassageId] = useState<string | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(24);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [s, r] = await Promise.all([api.adminStats(), api.listRooms()]);
      setStats(s);
      setRooms(r.rooms);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load admin data");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
    if (!isAdmin) return;
    const id = window.setInterval(load, 5_000);
    return () => window.clearInterval(id);
  }, [load, isAdmin]);

  if (!isAdmin) return <Gate />;

  const createRoom = async () => {
    setCreating(true);
    setError(null);
    try {
      const room = await api.createRoom({
        mode,
        difficulty,
        countdownSec,
        timeLimitSec,
        allowLateJoin,
        passageId,
        maxPlayers,
      });
      // The server builds the link from PUBLIC_URL, which may not match the
      // origin the admin is actually browsing from. Prefer what they can see.
      setCreated({
        code: room.code,
        inviteUrl: `${window.location.origin}/race/${room.code}`,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the room");
    } finally {
      setCreating(false);
    }
  };

  const copyInvite = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-7 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <ShieldCheck className="size-6 text-warn" />
            Race <span className="gl-gradient-text">control</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Open a room, send the link, and start when everyone has arrived
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => void logoutAdmin()}>
            Lock
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-md border border-bad/40 bg-bad/8 px-4 py-2.5 text-sm text-bad">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-4">
          {/* Create room */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-gl-purple" /> New race room
              </CardTitle>
              <CardDescription>
                Settings can still be changed from inside the room before you start
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block">Mode</Label>
                  <Tabs value={mode} onValueChange={(v) => setMode(v as RaceMode)}>
                    <TabsList className="w-full">
                      <TabsTrigger value="race" className="flex-1">
                        Finish line
                      </TabsTrigger>
                      <TabsTrigger value="sprint" className="flex-1">
                        60s sprint
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div>
                  <Label className="mb-1.5 block">Difficulty</Label>
                  <Tabs
                    value={difficulty}
                    onValueChange={(v) => {
                      setDifficulty(v as Difficulty);
                      // A pin from the old tier would not survive the change.
                      setPassageId(null);
                    }}
                  >
                    <TabsList className="w-full">
                      {(["easy", "medium", "hard"] as const).map((d) => (
                        <TabsTrigger key={d} value={d} className="flex-1 capitalize">
                          {d}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
                <div>
                  <Label htmlFor="a-cd" className="mb-1.5 block">
                    Countdown (seconds)
                  </Label>
                  <Input
                    id="a-cd"
                    type="number"
                    min={3}
                    max={30}
                    value={countdownSec}
                    onChange={(e) => setCountdownSec(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="a-tl" className="mb-1.5 block">
                    Time cap (seconds)
                  </Label>
                  <Input
                    id="a-tl"
                    type="number"
                    min={30}
                    max={600}
                    step={10}
                    disabled={mode === "sprint"}
                    value={mode === "sprint" ? 60 : timeLimitSec}
                    onChange={(e) => setTimeLimitSec(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="a-max" className="mb-1.5 block">
                    Max racers
                  </Label>
                  <Input
                    id="a-max"
                    type="number"
                    min={2}
                    max={64}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Up to 64. Anyone arriving after that is turned away
                  </p>
                </div>
              </div>

              <PassagePicker difficulty={difficulty} value={passageId} onChange={setPassageId} />

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <Switch checked={allowLateJoin} onCheckedChange={setAllowLateJoin} />
                  <span className="text-muted-foreground">Allow late join</span>
                </label>
              </div>

              <Button variant="gradient" size="lg" onClick={createRoom} disabled={creating}>
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Create room &amp; get invite link
              </Button>

              {created && (
                <div className="rounded-md border border-gl-purple/40 bg-gl-purple/8 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gl-purple">
                    Room {created.code} is open
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Input
                      readOnly
                      value={created.inviteUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="h-9 font-mono text-xs"
                      aria-label="Invite link"
                    />
                    <Button variant="outline" size="icon" onClick={copyInvite} aria-label="Copy link">
                      {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Send this to your players, then{" "}
                    <Link
                      to={`/race/${created.code}`}
                      className="font-semibold text-gl-purple underline underline-offset-2"
                    >
                      open the room
                    </Link>{" "}
                    yourself, and although whoever joins first becomes host, an admin can start
                    any room
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Flagged runs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-warn" /> Flagged runs
              </CardTitle>
              <CardDescription>
                These never reached the leaderboard, so clear the flag to accept one or delete it
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading…
                </p>
              ) : !stats?.flagged.length ? (
                <p className="py-4 text-sm text-muted-foreground">Nothing flagged, the ledger is clean</p>
              ) : (
                <ul className="divide-y divide-border">
                  {stats.flagged.map((row) => (
                    <li key={row.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{row.username}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {Math.round(row.wpm)} wpm · {row.accuracy.toFixed(0)}% · {row.difficulty}{" "}
                          · {new Date(row.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Accept this run"
                        onClick={async () => {
                          await api.clearFlag(row.id);
                          void load();
                        }}
                      >
                        <Check className="size-4 text-ok" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Delete this run"
                        onClick={async () => {
                          await api.deleteResult(row.id);
                          void load();
                        }}
                      >
                        <Trash2 className="size-4 text-bad" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          {/* Errors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="size-4 text-bad" /> Error log
                {stats?.errors.counts.unseen ? (
                  <Badge variant="bad" className="ml-1">
                    {stats.errors.counts.unseen} new
                  </Badge>
                ) : null}
              </CardTitle>
              <CardDescription>
                Faults the game hit, from the browser and from the server, newest first
                {stats?.errors.counts.total
                  ? `. ${stats.errors.counts.last24h} in the last 24 hours`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!stats?.errors.recent.length ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Nothing has gone wrong yet
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-border">
                    {stats.errors.recent.map((row) => (
                      <li key={row.id} className="py-2.5">
                        <div className="flex items-start gap-2">
                          <Badge
                            variant={row.source === "client" ? "warn" : "bad"}
                            className="mt-0.5 shrink-0"
                          >
                            {row.source}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="break-words font-mono text-xs">{row.message}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {new Date(row.at).toLocaleString()}
                              {row.url && ` · ${row.url}`}
                            </p>
                            {row.detail && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-[11px] text-gl-purple">
                                  stack
                                </summary>
                                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-surface/80 p-2 text-[10px] leading-relaxed text-muted-foreground">
                                  {row.detail}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await api.markErrorsSeen();
                        void load();
                      }}
                    >
                      Mark all read
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await api.clearErrors();
                        void load();
                      }}
                    >
                      <Trash2 className="size-4 text-bad" /> Clear log
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <DangerZone onDone={() => void load()} />
        </div>

        {/* Side column */}
        <aside className="space-y-4">
          <div className="gl-panel rounded-lg p-4">
            <h2 className="mb-3 text-sm font-semibold">At a glance</h2>
            <dl className="space-y-2.5 text-sm">
              {[
                ["Players", formatNumber(stats?.counters.players ?? 0)],
                ["Races", formatNumber(stats?.counters.races ?? 0)],
                ["Recorded runs", formatNumber(stats?.counters.results ?? 0)],
                [
                  "Top speed",
                  stats?.counters.topWpm ? `${Math.round(stats.counters.topWpm)} wpm` : "n/a",
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="gl-panel rounded-lg">
            <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
              Open rooms ({rooms.length})
            </h2>
            {rooms.length === 0 ? (
              <p className="px-4 py-5 text-xs text-muted-foreground">
                No rooms yet, create one to get started
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {rooms.map((room) => (
                  <li key={room.code} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/race/${room.code}`}
                        className="font-mono text-sm font-bold tracking-wider hover:text-gl-purple"
                      >
                        {room.code}
                      </Link>
                      <p className="text-[10px] capitalize text-muted-foreground">
                        {room.mode} · {room.difficulty} · {room.connected}/{room.players} online
                      </p>
                    </div>
                    <Badge
                      variant={
                        room.phase === "racing" ? "ok" : room.phase === "countdown" ? "warn" : "muted"
                      }
                      className={cn("shrink-0")}
                    >
                      {room.phase}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Close room"
                      onClick={async () => {
                        await api.closeRoom(room.code);
                        void load();
                      }}
                    >
                      <X className="size-4 text-bad" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
