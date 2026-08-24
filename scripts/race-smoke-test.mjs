#!/usr/bin/env node
/**
 * End-to-end smoke test for the race loop.
 *
 * Drives the real HTTP + Socket.IO server with two simulated players typing at
 * different speeds, then checks that the finishing order, the persisted
 * results and the leaderboard all agree.
 *
 *   node scripts/race-smoke-test.mjs [baseUrl] [adminPassword]
 */

import { io } from "socket.io-client";

const BASE = process.argv[2] ?? "http://localhost:8787";
const ADMIN_PASSWORD = process.argv[3] ?? process.env.ADMIN_PASSWORD ?? "genlayer";

let failures = 0;

function check(label, condition, detail = "") {
  const mark = condition ? "  ok  " : " FAIL ";
  if (!condition) failures++;
  console.log(`[${mark}] ${label}${detail ? ` — ${detail}` : ""}`);
}

/** Minimal cookie jar: enough for one session per simulated player. */
function jarFrom(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  return raw.map((c) => c.split(";")[0]).join("; ");
}

async function signIn(username) {
  const res = await fetch(`${BASE}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error(`sign-in failed: ${res.status} ${await res.text()}`);
  const cookie = jarFrom(res);
  const { user } = await res.json();
  return { user, cookie };
}

async function adminLogin() {
  const res = await fetch(`${BASE}/api/auth/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`admin login failed: ${res.status} ${await res.text()}`);
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
    socket.emit("room:join", { code }, (res) => {
      if (res?.ok) resolve(res.state);
      else reject(new Error(`join failed: ${res?.error}`));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Types the passage at roughly `wpm`, reporting progress on the same 10Hz
 * cadence the browser client uses.
 */
async function typePassage(socket, text, wpm, startedAt) {
  const charsPerMs = (wpm * 5) / 60_000;
  let keystrokes = 0;

  for (;;) {
    const elapsedMs = Date.now() - startedAt;
    const target = Math.min(text.length, Math.floor(elapsedMs * charsPerMs));
    keystrokes = target;

    socket.emit("race:progress", {
      correctChars: target,
      typedChars: target,
      keystrokes,
      errors: 0,
      elapsedMs,
      done: target >= text.length,
    });

    if (target >= text.length) {
      socket.emit("race:finish", {
        correctChars: text.length,
        typedChars: text.length,
        keystrokes,
        errors: 0,
        elapsedMs,
        done: true,
        pasteAttempts: 0,
        wpmSamples: Array.from({ length: Math.max(3, Math.floor(elapsedMs / 1000)) }, () =>
          wpm + (Math.random() - 0.5) * 8,
        ),
      });
      return { elapsedMs, keystrokes };
    }
    await sleep(100);
  }
}

async function main() {
  console.log(`\nGenLayer TypeRace — race smoke test against ${BASE}\n`);

  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  check("server is up", health.ok === true);

  const adminCookie = await adminLogin();
  check("admin login", Boolean(adminCookie));

  const created = await fetch(`${BASE}/api/admin/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ mode: "race", difficulty: "easy", countdownSec: 3, timeLimitSec: 120 }),
  }).then((r) => r.json());
  check("room created", typeof created.code === "string", created.code);

  const fast = await signIn(`SmokeFast_${Date.now() % 100000}`);
  const slow = await signIn(`SmokeSlow_${Date.now() % 100000}`);
  check("two players signed in", Boolean(fast.user?.id && slow.user?.id));

  const fastSocket = await connect(fast.cookie);
  const slowSocket = await connect(slow.cookie);
  check("both sockets connected", fastSocket.connected && slowSocket.connected);

  const firstState = await join(fastSocket, created.code);
  await join(slowSocket, created.code);
  check("first joiner is host", firstState.hostUserId === fast.user.id);
  check("passage hidden in lobby", firstState.passage === null);

  const started = new Promise((resolve) => fastSocket.once("room:started", resolve));
  const finished = new Promise((resolve) => fastSocket.once("room:finished", resolve));
  // The server sends the full state when something structural changes and a
  // slim tick for each race frame, so the probe merges them the same way the
  // browser does.
  let liveState = null;
  fastSocket.on("room:state", (s) => {
    liveState = s;
  });
  fastSocket.on("room:tick", (tick) => {
    if (!liveState) return;
    const byId = new Map(tick.r.map((row) => [row[0], row]));
    liveState = {
      ...liveState,
      serverTime: tick.t,
      racers: liveState.racers.map((r) => {
        const row = byId.get(r.userId);
        if (!row) return r;
        return {
          ...r,
          progress: row[1],
          wpm: row[2],
          accuracy: row[3],
          errors: row[4],
          correctChars: row[5],
          boostUntil: row[6],
          finishedAt: row[7],
          position: row[8],
        };
      }),
    };
  });

  fastSocket.emit("room:start");
  const startPayload = await started;
  check("race started", typeof startPayload.startsAt === "number");

  // Give the state broadcast a beat so the passage is available.
  await sleep(200);
  const passage = liveState?.passage;
  check("passage revealed once racing", Boolean(passage?.text?.length), `${passage?.text.length} chars`);

  const startedAt = startPayload.startsAt;
  const [fastRun] = await Promise.all([
    typePassage(fastSocket, passage.text, 110, startedAt),
    typePassage(slowSocket, passage.text, 55, startedAt),
  ]);

  const summary = await finished;
  check("race produced a summary", Array.isArray(summary.standings));
  check("both racers ranked", summary.standings.length === 2, `${summary.standings.length} standings`);

  const [first, second] = summary.standings;
  check("faster typist placed first", first.userId === fast.user.id, `${first.displayName} @ ${Math.round(first.wpm)} wpm`);
  check("slower typist placed second", second.userId === slow.user.id, `${second.displayName} @ ${Math.round(second.wpm)} wpm`);
  check("first place is faster than second", first.wpm > second.wpm);
  check("both reached finality", first.finished && second.finished);
  check("first run is a personal best", first.isPersonalBest === true);
  check(
    "wpm is in a believable range",
    first.wpm > 60 && first.wpm < 200,
    `${first.wpm.toFixed(1)} wpm over ${(fastRun.elapsedMs / 1000).toFixed(1)}s`,
  );
  check("clean run not flagged", first.suspicious === false && second.suspicious === false);

  /* ---- a second round on the same room, which is where it broke ---- */

  const secondStarted = new Promise((resolve) => fastSocket.once("room:started", resolve));
  const secondFinished = new Promise((resolve) => fastSocket.once("room:finished", resolve));

  fastSocket.emit("room:start");
  const secondStart = await secondStarted;
  await sleep(300);

  const secondPassage = liveState?.passage;
  check("round two revealed a passage", Boolean(secondPassage?.text?.length));
  check(
    "round two drew a different passage",
    secondPassage?.id !== passage.id,
    `${passage.id} -> ${secondPassage?.id}`,
  );
  check(
    "round two reset everyone to zero",
    (liveState?.racers ?? []).every((r) => r.progress === 0 && r.correctChars === 0),
    (liveState?.racers ?? []).map((r) => `${r.displayName}:${r.correctChars}`).join(" "),
  );

  // Type a little and confirm the server is actually receiving it this time.
  const half = Math.floor(secondPassage.text.length / 2);
  const startedTwo = secondStart.startsAt;
  for (let i = 0; i < 12; i++) {
    const target = Math.min(half, Math.floor(((i + 1) / 12) * half));
    fastSocket.emit("race:progress", {
      correctChars: target,
      typedChars: target,
      keystrokes: target,
      errors: 0,
      elapsedMs: Date.now() - startedTwo,
      done: false,
    });
    await sleep(120);
  }
  await sleep(300);

  const me = (liveState?.racers ?? []).find((r) => r.userId === fast.user.id);
  check(
    "round two progress reaches the server",
    (me?.correctChars ?? 0) > 0,
    `server sees ${me?.correctChars ?? 0} of ${secondPassage.text.length} chars`,
  );
  check("round two progress is on the track", (me?.progress ?? 0) > 0, `${((me?.progress ?? 0) * 100).toFixed(0)}%`);

  await Promise.all([
    typePassage(fastSocket, secondPassage.text, 120, startedTwo),
    typePassage(slowSocket, secondPassage.text, 60, startedTwo),
  ]);
  const summaryTwo = await secondFinished;
  check("round two produced standings", (summaryTwo.standings ?? []).length === 2);
  check("round two counted as round 2", summaryTwo.round === 2, `round ${summaryTwo.round}`);

  // Persistence
  const profile = await fetch(`${BASE}/api/profile/${fast.user.id}`).then((r) => r.json());
  check("both rounds persisted", profile.stats.races >= 2, `${profile.stats.races} races`);
  check("win counted", profile.stats.wins >= 1);
  check("personal best stored", profile.bests.some((b) => b.difficulty === "easy"));

  const board = await fetch(`${BASE}/api/leaderboard?difficulty=easy&limit=100`).then((r) => r.json());
  check("winner appears on the leaderboard", board.entries.some((e) => e.userId === fast.user.id));

  // A second race must not lose the first race's history.
  const rejoin = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: fast.cookie } }).then((r) =>
    r.json(),
  );
  check("returning player keeps their identity", rejoin.user?.id === fast.user.id);
  check(
    "returning player keeps their record",
    (rejoin.profile?.bests ?? []).some((b) => b.difficulty === "easy"),
  );

  // Cheat detection.
  const cheatPassage = await fetch(`${BASE}/api/passages/easy-01`)
    .then((r) => r.json())
    .then((r) => r.passage);

  // 1. Claiming more progress than the passage contains is rejected outright.
  const overRun = await fetch(`${BASE}/api/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: slow.cookie },
    body: JSON.stringify({
      passageId: cheatPassage.id,
      difficulty: "easy",
      mode: "practice",
      correctChars: cheatPassage.text.length + 40,
      typedChars: cheatPassage.text.length + 40,
      keystrokes: cheatPassage.text.length + 40,
      errors: 0,
      durationMs: 30_000,
      finished: true,
      pasteAttempts: 0,
      wpmSamples: [],
    }),
  });
  check("impossible progress is rejected", overRun.status === 400, `HTTP ${overRun.status}`);

  // 2. A paste-and-submit run is accepted but flagged, so it never ranks.
  const cheatRes = await fetch(`${BASE}/api/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: slow.cookie },
    body: JSON.stringify({
      passageId: cheatPassage.id,
      difficulty: "easy",
      mode: "practice",
      correctChars: cheatPassage.text.length,
      typedChars: cheatPassage.text.length,
      keystrokes: 3,
      errors: 0,
      durationMs: 1_200,
      finished: true,
      pasteAttempts: 1,
      wpmSamples: [],
    }),
  }).then((r) => r.json());
  check("pasted run is flagged", cheatRes.integrity?.suspicious === true, cheatRes.integrity?.reasons?.join("; "));
  check("flagged run is not a personal best", cheatRes.isPersonalBest === false);
  check("flagged run reports no rank", cheatRes.rank === null);

  const boardAfter = await fetch(`${BASE}/api/leaderboard?difficulty=easy&limit=100`).then((r) =>
    r.json(),
  );
  const slowEntry = boardAfter.entries.find((e) => e.userId === slow.user.id);
  check(
    "flagged run never reaches the leaderboard",
    !slowEntry || slowEntry.wpm < 260,
    slowEntry ? `${slowEntry.wpm.toFixed(1)} wpm on the board` : "not listed",
  );

  fastSocket.close();
  slowSocket.close();

  await fetch(`${BASE}/api/admin/rooms/${created.code}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });

  console.log(
    failures === 0
      ? "\nAll checks passed\n"
      : `\n${failures} check(s) failed\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nSmoke test crashed:", err);
  process.exit(1);
});
