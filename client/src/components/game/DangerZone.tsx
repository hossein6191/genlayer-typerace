import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface DangerZoneProps {
  onDone: () => void;
}

const CONFIRM_WORD = "RESET";

/**
 * Wiping the records has no undo, so the button cannot be reached by a stray
 * click: the word has to be typed first, and the two scopes are separate so
 * clearing a leaderboard never deletes people by accident.
 */
export function DangerZone({ onDone }: DangerZoneProps) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"scores" | "everything" | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const armed = confirm.trim().toUpperCase() === CONFIRM_WORD;

  const run = async (scope: "scores" | "everything") => {
    setBusy(scope);
    setError(null);
    setResult(null);
    try {
      await api.resetData(scope);
      setResult(
        scope === "scores"
          ? "Every score is gone. Players keep their names"
          : "Everything is gone, players included",
      );
      setConfirm("");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The reset did not run");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border border-bad/40 bg-bad/6 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-bad">
        <AlertTriangle className="size-4" />
        Reset the data
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        There is no undo and no backup. Use this to clear the test runs before you open the game to
        real players
      </p>

      <div className="mt-4 max-w-xs">
        <Label htmlFor="reset-confirm" className="mb-1.5 block">
          Type {CONFIRM_WORD} to unlock
        </Label>
        <Input
          id="reset-confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={CONFIRM_WORD}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!armed || busy !== null}
          onClick={() => void run("scores")}
        >
          {busy === "scores" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          Clear every score
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={!armed || busy !== null}
          onClick={() => void run("everything")}
        >
          {busy === "everything" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          Delete everything
        </Button>
      </div>

      <ul className="mt-3 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
        <li>
          <span className="font-semibold text-foreground">Clear every score</span> removes results,
          records, race history and stats, and keeps the players so a returning name still finds
          itself
        </li>
        <li>
          <span className="font-semibold text-foreground">Delete everything</span> also removes the
          players
        </li>
        <li>Either one closes any race that is currently open</li>
      </ul>

      {result && (
        <p role="status" className="mt-3 text-xs font-medium text-ok">
          {result}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
