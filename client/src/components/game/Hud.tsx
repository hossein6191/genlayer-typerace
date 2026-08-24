import { AlertTriangle, Gauge, Target, Timer, TrendingUp } from "lucide-react";
import { cn, formatClock } from "@/lib/utils";

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "bad" | "brand";
  large?: boolean;
}

function Stat({ icon, label, value, hint, tone = "default", large }: StatProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3 rounded-md border border-border bg-surface/70 px-3 py-2.5",
        tone === "ok" && "border-ok/35 bg-ok/6",
        tone === "warn" && "border-warn/35 bg-warn/6",
        tone === "bad" && "border-bad/35 bg-bad/6",
        tone === "brand" && "border-gl-purple/35 bg-gl-purple/8",
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md bg-surface-3 text-muted-foreground",
          tone === "ok" && "bg-ok/12 text-ok",
          tone === "warn" && "bg-warn/12 text-warn",
          tone === "bad" && "bg-bad/12 text-bad",
          tone === "brand" && "bg-gl-purple/14 text-gl-purple",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "font-bold tabular-nums leading-tight",
            large ? "text-2xl sm:text-3xl" : "text-lg",
          )}
        >
          {value}
          {hint && (
            <span className="ml-1 text-[11px] font-medium text-muted-foreground">{hint}</span>
          )}
        </p>
      </div>
    </div>
  );
}

interface HudProps {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
  /** Remaining time in ms; pass null to show elapsed instead. */
  remainingMs: number | null;
  elapsedMs: number;
  progress: number;
  personalBest?: number | null;
  className?: string;
}

export function Hud({
  wpm,
  rawWpm,
  accuracy,
  errors,
  remainingMs,
  elapsedMs,
  progress,
  personalBest,
  className,
}: HudProps) {
  const timeTone =
    remainingMs != null && remainingMs < 10_000
      ? "bad"
      : remainingMs != null && remainingMs < 30_000
        ? "warn"
        : "default";

  const accuracyTone = accuracy >= 97 ? "ok" : accuracy >= 90 ? "default" : "bad";

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Stat
        large
        icon={<Gauge className="size-4" />}
        label="WPM"
        value={Math.round(wpm).toString()}
        hint={personalBest ? `pb ${Math.round(personalBest)}` : undefined}
        tone="brand"
      />
      <Stat
        icon={<Target className="size-4" />}
        label="Accuracy"
        value={`${accuracy.toFixed(0)}%`}
        tone={accuracyTone}
      />
      <Stat
        icon={<Timer className="size-4" />}
        label={remainingMs != null ? "Left" : "Elapsed"}
        value={formatClock(remainingMs ?? elapsedMs, false)}
        tone={timeTone}
      />
      <Stat
        icon={<TrendingUp className="size-4" />}
        label="Raw"
        value={Math.round(rawWpm).toString()}
      />
      <Stat
        icon={<AlertTriangle className="size-4" />}
        label="Errors"
        value={errors.toString()}
        tone={errors > 0 ? "warn" : "default"}
      />
      <div className="flex w-full items-center gap-3 px-1">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gl-pink),var(--color-gl-purple),var(--color-gl-blue-400))] transition-[width] duration-150 ease-linear"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
        <span className="w-10 text-right text-[11px] font-semibold tabular-nums text-muted-foreground">
          {(progress * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
