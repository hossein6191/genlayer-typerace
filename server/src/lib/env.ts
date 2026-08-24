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
      `${name} must be set to a random string of at least 16 characters in production. ` +
        `Generate one with:  openssl rand -hex 32`,
    );
  }
  if (value) {
    console.warn(`[env] ${name} is shorter than 16 chars — using it anyway in ${NODE_ENV}.`);
    return value;
  }
  console.warn(`[env] ${name} is not set — generating an ephemeral one for ${NODE_ENV}.`);
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

  /** Allow the Vite dev server origin to talk to the API during development. */
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  TRUST_PROXY: bool(process.env.TRUST_PROXY, isProd),
} as const;

if (isProd && !env.ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD must be set in production — the admin panel controls every race.");
}
