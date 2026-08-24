import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ChatMessage,
  RaceSummary,
  RoomSettings,
  RoomState,
  RoomTick,
} from "@/lib/types";

interface ProgressPayload {
  correctChars: number;
  typedChars: number;
  keystrokes: number;
  errors: number;
  elapsedMs: number;
  done?: boolean;
}

interface FinishPayload extends ProgressPayload {
  pasteAttempts: number;
  wpmSamples: number[];
}

export type ConnectionStatus = "connecting" | "connected" | "error" | "closed";

/**
 * The server clock is the only clock that matters — everyone's countdown and
 * time limit are expressed in server epoch ms. This tracks the offset so the
 * UI can convert without every player's system clock skewing the race.
 */
function useClockOffset(socket: Socket | null) {
  const offsetRef = useRef(0);

  useEffect(() => {
    if (!socket) return;

    const sample = () => {
      const sentAt = Date.now();
      socket.emit("ping2", sentAt);
    };

    const onPong = ({ clientSent, serverTime }: { clientSent: number; serverTime: number }) => {
      const now = Date.now();
      const roundTrip = now - clientSent;
      // Assume symmetric latency; half the round trip is the one-way delay.
      offsetRef.current = serverTime + roundTrip / 2 - now;
    };

    socket.on("pong2", onPong);
    sample();
    const id = window.setInterval(sample, 15_000);
    return () => {
      socket.off("pong2", onPong);
      window.clearInterval(id);
    };
  }, [socket]);

  /** Converts a server timestamp into this browser's clock. */
  return useCallback((serverTs: number) => serverTs - offsetRef.current, []);
}

export function useRoom(code: string | undefined, options: { asSpectator?: boolean } = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  /**
   * Emits go through a ref, not through the state.
   *
   * The state is null for the render between creating the socket and storing
   * it, and every emit in that window used to vanish without a trace. For
   * progress that means the track freezes at zero while the player's own
   * screen keeps counting, which looks like the server ignoring them.
   */
  const socketRef = useRef<Socket | null>(null);
  const droppedRef = useRef(0);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [state, setState] = useState<RoomState | null>(null);
  const [summary, setSummary] = useState<RaceSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [boosts, setBoosts] = useState<Record<string, number>>({});

  const asSpectator = options.asSpectator;

  useEffect(() => {
    if (!code) return;

    const s: Socket = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 12,
      reconnectionDelay: 700,
    });

    socketRef.current = s;
    setSocket(s);
    setStatus("connecting");

    const join = () => {
      s.emit("room:join", { code, asSpectator }, (res: { ok: boolean; state?: RoomState; error?: string }) => {
        if (res.ok && res.state) {
          setState(res.state);
          setStatus("connected");
          setError(null);
        } else {
          setStatus("error");
          setError(res.error ?? "join_failed");
        }
      });
    };

    s.on("connect", join);

    s.on("connect_error", (err: Error) => {
      setStatus("error");
      setError(err.message === "sign_in_required" ? "sign_in_required" : "connection_failed");
    });

    s.on("disconnect", () => setStatus("connecting"));

    s.on("room:state", (next: RoomState) => {
      setState(next);
      // A fresh round clears the previous podium.
      if (next.phase === "countdown" || next.phase === "lobby") setSummary(null);
    });

    // A race frame carries only the moving numbers, so it is folded into the
    // last full state rather than replacing it. Names, avatars and the passage
    // arrive with room:state and stay put.
    s.on("room:tick", (tick: RoomTick) => {
      setState((prev) => {
        if (!prev) return prev;
        const byId = new Map(tick.r.map((row) => [row[0], row]));
        let changed = false;

        const racers = prev.racers.map((racer) => {
          const row = byId.get(racer.userId);
          if (!row) return racer;
          changed = true;
          return {
            ...racer,
            progress: row[1],
            wpm: row[2],
            accuracy: row[3],
            errors: row[4],
            correctChars: row[5],
            boostUntil: row[6],
            finishedAt: row[7],
            position: row[8],
          };
        });

        return changed ? { ...prev, racers, serverTime: tick.t } : prev;
      });
    });

    s.on("room:finished", (result: RaceSummary) => setSummary(result));

    s.on("room:chat", (msg: ChatMessage) =>
      setMessages((prev) => [...prev.slice(-60), msg]),
    );

    s.on("room:error", (payload: { code: string; message: string }) => setError(payload.message));

    s.on("racer:boost", ({ userId, until }: { userId: string; until: number }) => {
      setBoosts((prev) => ({ ...prev, [userId]: until }));
    });

    return () => {
      s.removeAllListeners();
      s.close();
      socketRef.current = null;
      setSocket(null);
      setStatus("closed");
    };
  }, [code, asSpectator]);

  const emit = useCallback((event: string, ...args: unknown[]) => {
    const live = socketRef.current;
    if (!live) {
      droppedRef.current += 1;
      if (droppedRef.current === 1) {
        console.warn("[room] emitted before the socket existed:", event);
      }
      return;
    }
    (live.emit as (e: string, ...a: unknown[]) => void)(event, ...args);
  }, []);

  const toLocalTime = useClockOffset(socket);

  const actions = {
    setReady: useCallback((ready: boolean) => emit("room:ready", ready), [emit]),
    updateSettings: useCallback(
      (patch: Partial<RoomSettings>) => emit("room:settings", patch),
      [emit],
    ),
    start: useCallback(() => emit("room:start"), [emit]),
    abort: useCallback(() => emit("room:abort"), [emit]),
    nextRound: useCallback(() => emit("room:next"), [emit]),
    kick: useCallback((userId: string) => emit("room:kick", userId), [emit]),
    sendChat: useCallback((text: string) => emit("room:chat", text), [emit]),
    sendProgress: useCallback(
      (payload: ProgressPayload) => emit("race:progress", payload),
      [emit],
    ),
    sendFinish: useCallback(
      (payload: FinishPayload) => emit("race:finish", payload),
      [emit],
    ),
    leave: useCallback(() => emit("room:leave"), [emit]),
  };

  return { socket, status, state, summary, messages, error, boosts, actions, toLocalTime };
}
