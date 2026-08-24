import { useEffect, useState } from "react";
import { Loader2, Shuffle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/types";

interface PassageSummary {
  id: string;
  title: string;
  chars: number;
}

interface PassagePickerProps {
  difficulty: Difficulty;
  /** Null means draw a fresh passage every round. */
  value: string | null;
  onChange: (passageId: string | null) => void;
  className?: string;
}

/**
 * Choose the exact text a race will run on, or leave it on random so a group
 * racing several rounds gets something new each time.
 */
export function PassagePicker({ difficulty, value, onChange, className }: PassagePickerProps) {
  const [passages, setPassages] = useState<PassageSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .passages(difficulty)
      .then((list) => !cancelled && setPassages(list))
      .catch(() => !cancelled && setPassages([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [difficulty]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor="passage-picker">
        Passage
        <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground">
          {loading ? "loading" : `${passages.length} in this tier`}
        </span>
      </Label>

      <div className="relative">
        {loading && (
          <Loader2 className="pointer-events-none absolute right-8 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        <select
          id="passage-picker"
          value={value ?? ""}
          disabled={loading}
          onChange={(e) => onChange(e.target.value || null)}
          className={cn(
            "h-9 w-full cursor-pointer appearance-none rounded-md border border-border bg-surface/80 px-3 pr-8 text-xs text-foreground",
            "focus-visible:border-gl-purple/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gl-purple/25",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <option value="">Random each round</option>
          {passages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.chars} chars)
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
        >
          <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>

      {!value && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Shuffle className="size-3" />
          Every round draws a different text
        </p>
      )}
    </div>
  );
}
