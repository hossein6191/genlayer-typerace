import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env, SERVER_ROOT } from "./lib/env.js";
import { attachUser } from "./lib/auth.js";
import { authRouter } from "./routes/auth.js";
import { apiRouter } from "./routes/api.js";
import { adminRouter } from "./routes/admin.js";
import { attachSocketServer } from "./game/socket.js";
import { db } from "./lib/db.js";

const app = express();

if (env.TRUST_PROXY) app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(compression());
app.use(express.json({ limit: "128kb" }));
app.use(cookieParser());
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests arrive without an Origin header.
      if (!origin || env.CORS_ORIGINS.includes(origin)) callback(null, true);
      else callback(new Error(`origin ${origin} is not allowed`));
    },
    credentials: true,
  }),
);
app.use(attachUser);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), env: env.NODE_ENV });
});

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api", apiRouter);

/* ------------------------------------------------------------------ */
/* Static client (production)                                          */
/* ------------------------------------------------------------------ */

const clientDist = path.resolve(SERVER_ROOT, "..", "client", "dist");

if (fs.existsSync(clientDist)) {
  app.use(
    express.static(clientDist, {
      maxAge: "1y",
      index: false,
      setHeaders(res, filePath) {
        // The entry document must never be cached, or a deploy leaves people
        // on a stale bundle that points at assets which no longer exist.
        if (filePath.endsWith("index.html")) res.setHeader("Cache-Control", "no-cache");
      },
    }),
  );

  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else if (env.isProd) {
  console.warn(`[server] client build not found at ${clientDist}, run "npm run build" first`);
}

app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[server] unhandled error:", err);
    res.status(500).json({ error: "internal_error" });
  },
);

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

const server = http.createServer(app);
attachSocketServer(server);

server.listen(env.PORT, () => {
  console.log(`\n  GenLayer TypeRace`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  api        http://localhost:${env.PORT}/api`);
  console.log(`  public url ${env.PUBLIC_URL}`);
  console.log(`  database   ${env.DATABASE_FILE}`);
  console.log(`  admin      ${env.ADMIN_PASSWORD ? "password set" : "NOT SET"}`);
  console.log(`  env        ${env.NODE_ENV}\n`);
});

function shutdown(signal: string) {
  console.log(`\n[server] ${signal} received, closing`);
  server.close(() => {
    try {
      db.close();
    } catch {
      /* already closed */
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
