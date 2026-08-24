#!/usr/bin/env node
/**
 * Measures what a full room actually costs.
 *
 * The server broadcasts the whole room state to every player ten times a
 * second, so the traffic grows with the square of the head count. This
 * connects N players to a real room and reports the measured payload, so the
 * cap can be set from a number rather than a guess.
 *
 *   node scripts/room-load-probe.mjs [players] [baseUrl] [adminPassword]
 */

import { io } from "socket.io-client";

const PLAYERS = Number(process.argv[2] ?? 24);
const BASE = process.argv[3] ?? "http://localhost:8787";
const ADMIN_PASSWORD = process.argv[4] ?? process.env.ADMIN_PASSWORD ?? "genlayer";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function jarFrom(res) {
  return (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}

async function signIn(username) {
  const res = await fetch(`${BASE}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error(`sign-in failed for ${username}: ${res.status}`);
  return jarFrom(res);
}

function connect(cookie) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, {
      transports: ["websocket"],
      extraHeaders: { Cookie: cookie },
      reconnection: false,
    });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

function join(socket, code) {
  return new Promise((resolve, reject) => {
    socket.emit("room:join", { code }, (res) =>
      res?.ok ? resolve(res.state) : reject(new Error(res?.error ?? "join failed")),
    );
  });
}

async function main() {
  console.log(`\nRoom load probe: ${PLAYERS} players against ${BASE}\n`);

  const adminRes = await fetch(`${BASE}/api/auth/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  if (!adminRes.ok) throw new Error(`admin login failed: ${adminRes.status}`);
  const adminCookie = jarFrom(adminRes);

  const room = await fetch(`${BASE}/api/admin/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      mode: "race",
      difficulty: "medium",
      countdownSec: 3,
      timeLimitSec: 300,
      maxPlayers: Math.max(2, Math.min(64, PLAYERS)),
    }),
  }).then((r) => r.json());

  const stamp = Date.now() % 100000;
  const sockets = [];
  let refused = 0;

  for (let i = 0; i < PLAYERS; i++) {
    const cookie = await signIn(`Load${stamp}_${i}`);
    const socket = await connect(cookie);
    try {
      await join(socket, room.code);
      sockets.push(socket);
    } catch (err) {
      refused += 1;
      socket.close();
      if (refused === 1) console.log(`  first refusal at player ${i + 1}: ${err.message}`);
    }
  }

  console.log(`  seated ${sockets.length}, refused ${refused}`);

  // Measure the broadcast on one client while the race is live.
  let bytes = 0;
  let messages = 0;
  const watcher = sockets[0];
  watcher.on("room:state", (state) => {
    bytes += Buffer.byteLength(JSON.stringify(state));
    messages += 1;
  });
  watcher.on("room:tick", (tick) => {
    bytes += Buffer.byteLength(JSON.stringify(tick));
    messages += 1;
  });

  watcher.emit("room:start");
  await sleep(4_000);

  const sampleSeconds = 3;
  bytes = 0;
  messages = 0;
  const startedAt = Date.now();

  // Everyone types, which is the worst case for update volume.
  const tick = setInterval(() => {
    const elapsed = Date.now() - startedAt;
    for (const [i, s] of sockets.entries()) {
      const chars = Math.floor((elapsed / 1000) * (4 + (i % 7)));
      s.emit("race:progress", {
        correctChars: chars,
        typedChars: chars,
        keystrokes: chars,
        errors: 0,
        elapsedMs: elapsed,
        done: false,
      });
    }
  }, 100);

  await sleep(sampleSeconds * 1000);
  clearInterval(tick);

  const perMessage = messages ? bytes / messages : 0;
  const perClientPerSecond = bytes / sampleSeconds;
  const serverTotal = perClientPerSecond * sockets.length;

  console.log(`
  measured over ${sampleSeconds}s with everyone typing

  state messages received   ${messages} (${(messages / sampleSeconds).toFixed(1)}/s)
  size of one state message ${(perMessage / 1024).toFixed(1)} KB
  received by one client    ${(perClientPerSecond / 1024).toFixed(0)} KB/s
  sent by the server        ${(serverTotal / 1024 / 1024).toFixed(2)} MB/s to ${sockets.length} clients
`);

  for (const s of sockets) s.close();
  await fetch(`${BASE}/api/admin/rooms/${room.code}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
}

main().catch((err) => {
  console.error("probe failed:", err);
  process.exit(1);
});
