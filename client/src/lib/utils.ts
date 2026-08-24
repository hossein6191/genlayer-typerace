import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 0 -> "0", 1234 -> "1,234" */
export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

/** 83_500 -> "1:23.5" */
export function formatClock(ms: number, withTenths = true) {
  const total = Math.max(0, ms) / 1000;
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const t = Math.floor((total * 10) % 10);
  const base = `${m}:${String(s).padStart(2, "0")}`;
  return withTenths ? `${base}.${t}` : base;
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
