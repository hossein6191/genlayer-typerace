import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Flag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RaceEntry() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl border border-gl-purple/40 bg-gl-purple/10">
          <Flag className="size-5 text-gl-purple" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Join a <span className="gl-gradient-text">race</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the six-character room code your host shared, or open their invite link directly
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Room code</CardTitle>
          <CardDescription>Codes are not case-sensitive</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (clean.length === 6) navigate(`/race/${clean}`);
            }}
          >
            <Label htmlFor="code" className="sr-only">
              Room code
            </Label>
            <Input
              id="code"
              value={clean}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ABC123"
              autoComplete="off"
              autoFocus
              className="h-14 text-center font-mono text-2xl font-bold tracking-[0.42em]"
              maxLength={6}
            />
            <Button type="submit" variant="gradient" size="lg" disabled={clean.length !== 6}>
              Take a lane <ArrowRight className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Users className="size-3.5" />
        Hosting one yourself? Rooms are created from the admin panel
      </p>
    </div>
  );
}
