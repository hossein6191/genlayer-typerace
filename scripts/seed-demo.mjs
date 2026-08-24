#!/usr/bin/env node
/**
 * Fills an empty database with a handful of plausible players and records so a
 * fresh install has something to look at on the leaderboard.
 *
 * Never point this at a real deployment: the accounts it creates are guests
 * with invented scores.
 *
 *   node scripts/seed-demo.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? "http://localhost:8787";

const PLAYERS = [
  { name: "cheshire", runs: [["hard", 118, 97.8], ["medium", 124, 98.4], ["easy", 131, 99.1]] },
  { name: "0xNimbus", runs: [["medium", 109, 96.2], ["easy", 114, 97.5]] },
  { name: "validator_7", runs: [["easy", 96, 95.1], ["medium", 91, 93.8]] },
  { name: "quorum", runs: [["hard", 88, 96.9], ["medium", 97, 97.2]] },
  { name: "leafnode", runs: [["easy", 84, 94.4]] },
  { name: "prompt_clause", runs: [["medium", 79, 92.6], ["hard", 71, 94.0]] },
  { name: "finality", runs: [["easy", 73, 96.8]] },
];

function jarFrom(response) {
  return (response.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}

async function passagesFor(difficulty) {
  const res = await fetch(`${BASE}/api/passages?difficulty=${difficulty}`);
  const data = await res.json();
  return data.passages;
}

async function main() {
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  if (!health.ok) throw new Error("server is not responding");

  const pools = {
    easy: await passagesFor("easy"),
    medium: await passagesFor("medium"),
    hard: await passagesFor("hard"),
  };

  for (const player of PLAYERS) {
    const signIn = await fetch(`${BASE}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: player.name }),
    });
    if (!signIn.ok) {
      console.warn(`  skipped ${player.name}: ${signIn.status}`);
      continue;
    }
    const cookie = jarFrom(signIn);

    for (const [difficulty, wpm, accuracy] of player.runs) {
      const pool = pools[difficulty];
      const passage = pool[Math.floor(Math.random() * pool.length)];

      // Work backwards from the target speed so the server computes the score
      // we intended without any of its integrity checks firing.
      const correctChars = passage.chars;
      const durationMs = Math.round((correctChars / 5 / wpm) * 60_000);
      const keystrokes = Math.round(correctChars / (accuracy / 100));
      const errors = keystrokes - correctChars;

      const res = await fetch(`${BASE}/api/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          passageId: passage.id,
          difficulty,
          mode: "practice",
          correctChars,
          typedChars: correctChars,
          keystrokes,
          errors,
          durationMs,
          finished: true,
          pasteAttempts: 0,
          wpmSamples: Array.from({ length: Math.max(4, Math.round(durationMs / 1000)) }, () =>
            wpm + (Math.random() - 0.5) * 10,
          ),
        }),
      });

      const body = await res.json();
      const status = body.integrity?.suspicious ? "FLAGGED" : "ok";
      console.log(
        `  ${player.name.padEnd(14)} ${difficulty.padEnd(7)} ${Math.round(body.score?.wpm ?? 0)
          .toString()
          .padStart(3)} wpm  ${status}`,
      );
    }
  }

  const board = await fetch(`${BASE}/api/leaderboard?difficulty=all&limit=20`).then((r) => r.json());
  console.log(`\nLeaderboard now holds ${board.entries.length} players\n`);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
