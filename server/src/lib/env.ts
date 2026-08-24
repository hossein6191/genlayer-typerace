import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
/** src/lib -> src -> server */
export const SERVER_ROOT = path.resolve(here, "..", "..");

function bool(value: string | undefined, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

const NODE_ENV = process.env.NODE_ENV ?? "development";
const isProd = NODE_ENV === "production";

function requiredSecret(name: string, devFallback: string) {
  const value = process.env[name];
  if (value && value.length >= 16) return value;
  if (isProd) {
    throw new Error(
      `${name} is not set. It must be a random string of at least 16 characters in ` +
        `production, so generate one with "openssl rand -hex 32", set it as an ` +
        `environment variable on your host, and redeploy`,
    );
  }
  if (value) {
    console.warn(`[env] ${name} is shorter than 16 chars, using it anyway in ${NODE_ENV}`);
    return value;
  }
  console.warn(`[env] ${name} is not set, generating an ephemeral one for ${NODE_ENV}`);
  return devFallback;
}

// SERVER_PORT wins over PORT so a dev harness that injects PORT for the web
// server (Vite uses 5173) cannot drag the API onto the same socket. Hosting
// platforms only set PORT, so production still binds where they expect.
const PORT = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 8787);
const PUBLIC_URL = (process.env.PUBLIC_URL ?? `http://localhost:${isProd ? PORT : 5173}`).replace(
  /\/+$/,
  "",
);

/**
 * Origins allowed to call the API.
 *
 * The server serves its own client, so its public origin must always be in
 * here: a module script is fetched with CORS semantics even same-origin, so
 * leaving the deployed origin out makes the browser refuse the app's own
 * JavaScript and the page renders blank.
 */
function allowedOrigins(): string[] {
  const origins = new Set(
    (process.env.CORS_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  try {
    origins.add(new URL(PUBLIC_URL).origin);
  } catch {
    // PUBLIC_URL is not a URL; the same-origin case still works without it.
  }

  if (!isProd) {
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
  }

  return [...origins];
}

export const env = {
  NODE_ENV,
  isProd,
  PORT,
  PUBLIC_URL,

  SESSION_SECRET: requiredSecret("SESSION_SECRET", crypto.randomBytes(32).toString("hex")),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? (isProd ? "" : "genlayer"),

  DATABASE_FILE: path.resolve(
    SERVER_ROOT,
    process.env.DATABASE_FILE ?? "./data/genlayer-typerace.db",
  ),

  CORS_ORIGINS: allowedOrigins(),

  TRUST_PROXY: bool(process.env.TRUST_PROXY, isProd),
} as const;

if (isProd && !env.ADMIN_PASSWORD) {
  throw new Error(
    "ADMIN_PASSWORD is not set. It guards the panel that creates and starts races, " +
      "so the server refuses to boot without it. Set it as an environment variable " +
      "on your host and redeploy",
  );
}
