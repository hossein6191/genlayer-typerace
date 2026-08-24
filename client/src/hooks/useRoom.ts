import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ChatMessage,
  RaceSummary,
  RoomSettings,
  RoomState,
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
      setSocket(null);
      setStatus("closed");
    };
  }, [code, asSpectator]);

  const toLocalTime = useClockOffset(socket);

  const actions = {
    setReady: useCallback((ready: boolean) => socket?.emit("room:ready", ready), [socket]),
    updateSettings: useCallback(
      (patch: Partial<RoomSettings>) => socket?.emit("room:settings", patch),
      [socket],
    ),
    start: useCallback(() => socket?.emit("room:start"), [socket]),
    abort: useCallback(() => socket?.emit("room:abort"), [socket]),
    nextRound: useCallback(() => socket?.emit("room:next"), [socket]),
    kick: useCallback((userId: string) => socket?.emit("room:kick", userId), [socket]),
    sendChat: useCallback((text: string) => socket?.emit("room:chat", text), [socket]),
    sendProgress: useCallback(
      (payload: ProgressPayload) => socket?.emit("race:progress", payload),
      [socket],
    ),
    sendFinish: useCallback(
      (payload: FinishPayload) => socket?.emit("race:finish", payload),
      [socket],
    ),
    leave: useCallback(() => socket?.emit("room:leave"), [socket]),
  };

  return { socket, status, state, summary, messages, error, boosts, actions, toLocalTime };
}
