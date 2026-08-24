import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import cookie from "cookie";
import { env } from "../lib/env.js";
import { SESSION_COOKIE, userIdFromToken, verifyAdminCookie, ADMIN_COOKIE } from "../lib/auth.js";
import { db, getUser, type UserRow } from "../lib/db.js";
import { roomManager, type Room } from "./rooms.js";
import type {
  ClientToServerEvents,
  FinishPayload,
  ProgressPayload,
  ServerToClientEvents,
} from "./types.js";

interface SocketData {
  user: UserRow;
  isAdmin: boolean;
  roomCode: string | null;
  lastChatAt: number;
  lastProgressAt: number;
}

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, never, SocketData>;

/** Broadcast cadence during a race. 10Hz is smooth enough for the track and cheap. */
const TICK_MS = 100;
/** Idle cadence in the lobby / results screen. */
const IDLE_TICK_MS = 1_000;

const pbStmt = db.prepare(
  "SELECT wpm FROM personal_bests WHERE user_id = ? AND difficulty = ?",
);

function personalBestFor(userId: string, difficulty: string): number | null {
  const row = pbStmt.get(userId, difficulty) as { wpm: number } | undefined;
  return row?.wpm ?? null;
}

export function attachSocketServer(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>(httpServer, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
    // The track only needs small, frequent messages.
    perMessageDeflate: false,
    pingInterval: 20_000,
    pingTimeout: 25_000,
  });

  io.use((socket, next) => {
    const raw = socket.handshake.headers.cookie;
    const jar = raw ? cookie.parse(raw) : {};
    const userId = userIdFromToken(jar[SESSION_COOKIE]);
    const user = userId ? getUser(userId) : undefined;

    if (!user) {
      next(new Error("sign_in_required"));
      return;
    }

    socket.data.user = user;
    socket.data.isAdmin = verifyAdminCookie(jar[ADMIN_COOKIE]);
    socket.data.roomCode = null;
    socket.data.lastChatAt = 0;
    socket.data.lastProgressAt = 0;
    next();
  });

  const tickers = new Map<string, NodeJS.Timeout>();

  /** Everything, including names and the passage. Sent when structure changes. */
  function pushState(room: Room) {
    io.to(roomChannel(room.code)).emit("room:state", room.toState());
  }

  /** Just the moving numbers, which is what a race frame actually needs. */
  function pushTick(room: Room) {
    io.to(roomChannel(room.code)).emit("room:tick", room.toTick());
  }

  function ensureTicker(room: Room) {
    const existing = tickers.get(room.code);
    const desired = room.phase === "racing" ? TICK_MS : IDLE_TICK_MS;
    const current = (existing as (NodeJS.Timeout & { _glInterval?: number }) | undefined)
      ?._glInterval;

    if (existing && current === desired) return;
    if (existing) clearInterval(existing);

    const handle = setInterval(() => {
      const live = roomManager.get(room.code);
      if (!live) {
        clearInterval(handle);
        tickers.delete(room.code);
        return;
      }
      if (live.isEmpty && live.phase !== "racing") {
        clearInterval(handle);
        tickers.delete(live.code);
        return;
      }
      // A live race only needs the numbers; anything else needs the lot.
      if (live.phase === "racing") pushTick(live);
      else pushState(live);
    }, desired) as NodeJS.Timeout & { _glInterval?: number };

    handle._glInterval = desired;
    handle.unref?.();
    tickers.set(room.code, handle);
  }

  function stopTicker(code: string) {
    const t = tickers.get(code);
    if (t) clearInterval(t);
    tickers.delete(code);
  }

  function finishRace(room: Room) {
    if (room.phase !== "racing" && room.phase !== "countdown") return;
    const summary = room.finalize();
    io.to(roomChannel(room.code)).emit("room:finished", summary);
    pushState(room);
    ensureTicker(room);
  }

  io.on("connection", (socket: GameSocket) => {
    const { user } = socket.data;

    socket.on("ping2", (clientSent) => {
      socket.emit("pong2", { clientSent, serverTime: Date.now() });
    });

    socket.on("room:join", (payload, ack) => {
      const room = roomManager.get(String(payload?.code ?? ""));
      if (!room) {
        ack?.({ ok: false, error: "room_not_found" });
        return;
      }
      const seated = room.racers.has(user.id);
      if (!seated && room.racers.size >= room.settings.maxPlayers) {
        ack?.({ ok: false, error: "room_full" });
        return;
      }

      leaveCurrentRoom(socket);
      room.addMember(user, socket.id, {
        asSpectator: payload?.asSpectator,
        personalBest: personalBestFor(user.id, room.settings.difficulty),
      });
      socket.data.roomCode = room.code;
      socket.join(roomChannel(room.code));

      ack?.({ ok: true, state: room.toState() });
      pushState(room);
      ensureTicker(room);
    });

    socket.on("room:leave", () => leaveCurrentRoom(socket, true));

    socket.on("room:ready", (ready) => {
      const room = currentRoom(socket);
      if (!room) return;
      const racer = room.racers.get(user.id);
      if (racer) racer.ready = Boolean(ready);
      pushState(room);
    });

    socket.on("room:settings", (patch) => {
      const room = currentRoom(socket);
      if (!room || !canControl(socket, room)) return;
      if (room.updateSettings(patch ?? {})) {
        // A difficulty change moves the goalposts; refresh everyone's PB badge.
        for (const racer of room.racers.values()) {
          racer.personalBest = personalBestFor(racer.userId, room.settings.difficulty);
        }
        pushState(room);
      }
    });

    socket.on("room:start", () => {
      const room = currentRoom(socket);
      if (!room || !canControl(socket, room)) return;

      const error = room.begin(
        () => {
          io.to(roomChannel(room.code)).emit("room:started", {
            startsAt: room.startsAt!,
            endsAt: room.endsAt!,
            serverTime: Date.now(),
          });
          pushState(room);
          ensureTicker(room);
        },
        () => finishRace(room),
      );

      if (error) {
        socket.emit("room:error", { code: error, message: describe(error) });
        return;
      }

      io.to(roomChannel(room.code)).emit("room:countdown", {
        startsAt: room.startsAt!,
        serverTime: Date.now(),
      });
      pushState(room);
      ensureTicker(room);
    });

    socket.on("room:abort", () => {
      const room = currentRoom(socket);
      if (!room || !canControl(socket, room)) return;
      room.abort();
      pushState(room);
      ensureTicker(room);
    });

    socket.on("room:next", () => {
      const room = currentRoom(socket);
      if (!room || !canControl(socket, room)) return;
      room.resetToLobby();
      pushState(room);
      ensureTicker(room);
    });

    socket.on("room:kick", (targetId) => {
      const room = currentRoom(socket);
      if (!room || !canControl(socket, room) || targetId === user.id) return;
      const target = room.racers.get(targetId);
      if (!target) return;
      for (const sid of target.sockets) {
        io.sockets.sockets.get(sid)?.leave(roomChannel(room.code));
        const s = io.sockets.sockets.get(sid) as GameSocket | undefined;
        if (s) s.data.roomCode = null;
        io.sockets.sockets.get(sid)?.emit("room:error", {
          code: "kicked",
          message: "The host removed you from this race",
        });
      }
      room.kick(targetId);
      pushState(room);
    });

    socket.on("race:progress", (payload: ProgressPayload) => {
      const room = currentRoom(socket);
      if (!room) return;

      // Rate limit: a well-behaved client sends ~10/s. Anything far above that
      // is either a bug or someone trying to spam the track.
      const now = Date.now();
      if (now - socket.data.lastProgressAt < 40) return;
      socket.data.lastProgressAt = now;

      const { boosted } = room.applyProgress(user.id, sanitizeProgress(payload));
      if (boosted) {
        const racer = room.racers.get(user.id);
        io.to(roomChannel(room.code)).emit("racer:boost", {
          userId: user.id,
          until: racer?.boostUntil ?? now,
        });
      }
      if (room.settings.mode === "race" && room.allDone()) finishRace(room);
    });

    socket.on("race:finish", (payload: FinishPayload) => {
      const room = currentRoom(socket);
      if (!room) return;
      room.recordFinish(user.id, {
        ...sanitizeProgress(payload),
        pasteAttempts: clampNum(payload?.pasteAttempts ?? 0, 0, 10_000),
        wpmSamples: Array.isArray(payload?.wpmSamples)
          ? payload.wpmSamples.slice(0, 600).map((n) => clampNum(n, 0, 1000))
          : [],
      });
      pushState(room);
      if (room.allDone()) finishRace(room);
    });

    socket.on("room:chat", (text) => {
      const room = currentRoom(socket);
      if (!room) return;
      const now = Date.now();
      if (now - socket.data.lastChatAt < 700) return;
      socket.data.lastChatAt = now;

      const clean = String(text ?? "").trim().slice(0, 240);
      if (!clean) return;

      io.to(roomChannel(room.code)).emit("room:chat", {
        userId: user.id,
        displayName: room.racers.get(user.id)?.displayName ?? user.username,
        text: clean,
        at: now,
      });
    });

    socket.on("disconnect", () => leaveCurrentRoom(socket));

    /* ---- helpers bound to this socket ---- */

    function currentRoom(s: GameSocket): Room | undefined {
      return s.data.roomCode ? roomManager.get(s.data.roomCode) : undefined;
    }

    function canControl(s: GameSocket, room: Room) {
      return s.data.isAdmin || room.hostUserId === s.data.user.id;
    }

    function leaveCurrentRoom(s: GameSocket, explicit = false) {
      const room = currentRoom(s);
      if (!room) return;
      room.removeSocket(s.data.user.id, s.id);
      s.leave(roomChannel(room.code));
      s.data.roomCode = null;
      if (explicit) room.kick(s.data.user.id);
      pushState(room);
      if (room.isEmpty && room.phase !== "racing") stopTicker(room.code);
      ensureTicker(room);
    }
  });

  return io;
}

function roomChannel(code: string) {
  return `room:${code}`;
}

function sanitizeProgress(payload: ProgressPayload): ProgressPayload {
  return {
    correctChars: clampNum(payload?.correctChars ?? 0, 0, 100_000),
    typedChars: clampNum(payload?.typedChars ?? 0, 0, 100_000),
    keystrokes: clampNum(payload?.keystrokes ?? 0, 0, 200_000),
    errors: clampNum(payload?.errors ?? 0, 0, 100_000),
    elapsedMs: clampNum(payload?.elapsedMs ?? 0, 0, 3_600_000),
    done: Boolean(payload?.done),
  };
}

function clampNum(value: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function describe(code: string) {
  switch (code) {
    case "already_running":
      return "That race is already under way";
    case "no_players":
      return "Nobody is seated yet, wait for at least one racer";
    default:
      return "The race could not be started";
  }
}
