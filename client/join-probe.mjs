import { io } from "socket.io-client";
const BASE = "http://localhost:8787";
const res = await fetch(`${BASE}/api/auth/signin`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "BroadcastTest" + (Date.now() % 1000) }),
});
const cookie = (res.headers.getSetCookie?.() ?? []).map(c => c.split(";")[0]).join("; ");
const s = io(BASE, { transports: ["websocket"], extraHeaders: { Cookie: cookie }, reconnection: false });
await new Promise(r => s.once("connect", r));
await new Promise((ok, no) => s.emit("room:join", { code: process.argv[2] }, r => r?.ok ? ok() : no(new Error(r?.error))));
console.log("joined; the browser should now show one more racer");
await new Promise(r => setTimeout(r, 6000));
s.close();
