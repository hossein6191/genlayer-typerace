import { useState } from "react";
import { LogIn, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}

/**
 * The whole sign-in: type a name, press play.
 *
 * Nothing is connected and no third party is involved. The name is the account,
 * so typing the same name again picks up the same records.
 */
export function SignInDialog({ open, onOpenChange, reason }: SignInDialogProps) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(username.trim());
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign you in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pick your name</DialogTitle>
          <DialogDescription>
            {reason ??
              "Your races and records are saved under this name, so type the same one next time and the leaderboard picks up where you left off"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <Label htmlFor="signin-username">Name</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="signin-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your Discord username"
                maxLength={24}
                autoComplete="nickname"
                className="pl-9"
                required
                autoFocus
              />
            </div>
            <Button type="submit" disabled={busy || username.trim().length < 2}>
              <LogIn className="size-4" />
              {busy ? "…" : "Play"}
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            No password, no wallet, nothing to connect
          </p>
          {error && (
            <p role="alert" className="text-xs font-medium text-bad">
              {error}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
