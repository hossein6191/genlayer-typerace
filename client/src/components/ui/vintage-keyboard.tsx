"use client";

/**
 * Vintage keyboard.
 *
 * The original component renders a photoreal wooden-case board that reacts to
 * real key presses. For GenLayer TypeRace it grew four things:
 *
 *   1. `variant` — a "genlayer" skin (dark case, brand gradient) alongside the
 *      original "vintage" wood.
 *   2. `embedded` — drops the full-viewport wrapper so the board can sit under
 *      the typing surface instead of owning the page.
 *   3. `highlightChar` — lights the key the player has to press next, which is
 *      what makes it a teaching aid rather than decoration.
 *   4. `listenWhileTyping` — the original deliberately ignores key events while
 *      an input is focused. The game types into an input, so that guard is now
 *      opt-out; without it the board would sit frozen during a race.
 */

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

interface KeyConfig {
  id: string;
  label: string;
  shiftLabel?: string;
  width?: number;
  muted?: boolean;
  align?: "left" | "center";
  small?: boolean;
}

type KeyRow = KeyConfig[];
type SoundCategory = "normal" | "spacebar" | "modifier";
type KeyTrigger = { press: () => void; release: () => void };
export type KeyboardVariant = "vintage" | "genlayer";

const ROWS: KeyRow[] = [
  [
    { id: "esc", label: "Esc", small: true, align: "left" },
    { id: "1", label: "1", shiftLabel: "!" },
    { id: "2", label: "2", shiftLabel: "@" },
    { id: "3", label: "3", shiftLabel: "#" },
    { id: "4", label: "4", shiftLabel: "$" },
    { id: "5", label: "5", shiftLabel: "%" },
    { id: "6", label: "6", shiftLabel: "^" },
    { id: "7", label: "7", shiftLabel: "&" },
    { id: "8", label: "8", shiftLabel: "*" },
    { id: "9", label: "9", shiftLabel: "(" },
    { id: "0", label: "0", shiftLabel: ")" },
    { id: "minus", label: "-", shiftLabel: "_" },
    { id: "equal", label: "=", shiftLabel: "+" },
    {
      id: "backspace",
      label: "Backspace",
      width: 2,
      small: true,
      align: "left",
    },
  ],
  [
    { id: "tab", label: "Tab", width: 1.5, align: "left", small: true },
    { id: "q", label: "Q" },
    { id: "w", label: "W" },
    { id: "e", label: "E" },
    { id: "r", label: "R" },
    { id: "t", label: "T" },
    { id: "y", label: "Y" },
    { id: "u", label: "U" },
    { id: "i", label: "I" },
    { id: "o", label: "O" },
    { id: "p", label: "P" },
    { id: "lbracket", label: "[", shiftLabel: "{" },
    { id: "rbracket", label: "]", shiftLabel: "}" },
    { id: "backslash", label: "\\", shiftLabel: "|", width: 1.5 },
  ],
  [
    { id: "caps", label: "CapsLock", width: 1.75, align: "left", small: true },
    { id: "a", label: "A" },
    { id: "s", label: "S" },
    { id: "d", label: "D" },
    { id: "f", label: "F" },
    { id: "g", label: "G" },
    { id: "h", label: "H" },
    { id: "j", label: "J" },
    { id: "k", label: "K" },
    { id: "l", label: "L" },
    { id: "semicolon", label: ";", shiftLabel: ":" },
    { id: "quote", label: "'", shiftLabel: '"' },
    { id: "enter", label: "Enter", width: 2.25, align: "left", small: true },
  ],
  [
    { id: "lshift", label: "Shift", width: 2.25, align: "left", small: true },
    { id: "z", label: "Z" },
    { id: "x", label: "X" },
    { id: "c", label: "C" },
    { id: "v", label: "V" },
    { id: "b", label: "B" },
    { id: "n", label: "N" },
    { id: "m", label: "M" },
    { id: "comma", label: ",", shiftLabel: "<" },
    { id: "period", label: ".", shiftLabel: ">" },
    { id: "slash", label: "/", shiftLabel: "?" },
    { id: "rshift", label: "Shift", width: 2.75, align: "left", small: true },
  ],
  [
    {
      id: "lctrl",
      label: "Ctrl",
      width: 1.25,
      small: true,
      muted: true,
      align: "left",
    },
    {
      id: "lwin",
      label: "Win",
      width: 1.25,
      small: true,
      muted: true,
      align: "left",
    },
    {
      id: "lalt",
      label: "Alt",
      width: 1.25,
      small: true,
      muted: true,
      align: "left",
    },
    { id: "space", label: "", width: 6.25 },
    {
      id: "ralt",
      label: "Alt",
      width: 1.25,
      small: true,
      muted: true,
      align: "left",
    },
    {
      id: "rwin",
      label: "Win",
      width: 1.25,
      small: true,
      muted: true,
      align: "left",
    },
    {
      id: "fn",
      label: "Fn",
      width: 1.25,
      small: true,
      muted: true,
      align: "left",
    },
  ],
];

const PAN_STRENGTH = 0.3;
const ROW_UNITS = 15;

const KEY_PAN: Record<string, number> = (() => {
  const pans: Record<string, number> = {};
  for (const row of ROWS) {
    let cursor = 0;
    for (const key of row) {
      const width = key.width ?? 1;
      const center = cursor + width / 2;
      pans[key.id] = ((center / ROW_UNITS) * 2 - 1) * PAN_STRENGTH;
      cursor += width;
    }
  }
  return pans;
})();

const ALL_KEYS_BY_ID: Record<string, KeyConfig> = (() => {
  const map: Record<string, KeyConfig> = {};
  for (const row of ROWS) {
    for (const key of row) {
      map[key.id] = key;
    }
  }
  return map;
})();

const MODIFIER_KEY_IDS = new Set([
  "esc",
  "tab",
  "caps",
  "enter",
  "backspace",
  "lshift",
  "rshift",
  "lctrl",
  "lwin",
  "lalt",
  "ralt",
  "rwin",
  "fn",
]);

function getSoundCategory(id: string): SoundCategory {
  if (id === "space") return "spacebar";
  if (MODIFIER_KEY_IDS.has(id)) return "modifier";
  return "normal";
}

const MODIFIER_DISPLAY_ORDER = ["Ctrl", "Shift", "Alt", "Win", "Fn"];

function getKeyDisplayLabel(id: string): string {
  if (id === "space") return "Space";
  return ALL_KEYS_BY_ID[id]?.label || id;
}

function getActiveKeyParts(ids: string[]): string[] | null {
  if (ids.length === 0) return null;
  const labels = Array.from(new Set(ids.map(getKeyDisplayLabel)));
  const modifiers = MODIFIER_DISPLAY_ORDER.filter((m) => labels.includes(m));
  const others = labels.filter((l) => !MODIFIER_DISPLAY_ORDER.includes(l));
  return [...modifiers, ...others];
}

/**
 * Maps a character from the passage back to the physical key (and whether Shift
 * is involved) so the board can point at the next key to press.
 */
const CHAR_TO_KEY: Record<string, { id: string; shift: boolean }> = (() => {
  const map: Record<string, { id: string; shift: boolean }> = {};
  for (const row of ROWS) {
    for (const key of row) {
      if (key.id === "space") continue;
      if (key.label && key.label.length === 1) {
        const lower = key.label.toLowerCase();
        map[lower] = { id: key.id, shift: false };
        if (lower !== key.label.toUpperCase()) {
          map[key.label.toUpperCase()] = { id: key.id, shift: true };
        }
      }
      if (key.shiftLabel && key.shiftLabel.length === 1) {
        map[key.shiftLabel] = { id: key.id, shift: true };
      }
    }
  }
  map[" "] = { id: "space", shift: false };
  map["\n"] = { id: "enter", shift: false };
  map["\t"] = { id: "tab", shift: false };
  // Sentinel used when the caller wants Backspace pointed at instead of a
  // letter, which is the case whenever there are mistakes to clear.
  map["\b"] = { id: "backspace", shift: false };
  return map;
})();

/** The character a key produces, or null for keys that produce none. */
const KEY_ID_TO_CHAR: Record<string, { lower: string; upper: string }> = (() => {
  const map: Record<string, { lower: string; upper: string }> = {};
  for (const row of ROWS) {
    for (const key of row) {
      if (key.id === "space") {
        map[key.id] = { lower: " ", upper: " " };
        continue;
      }
      if (key.label && key.label.length === 1) {
        map[key.id] = {
          lower: key.label.toLowerCase(),
          upper: key.shiftLabel && key.shiftLabel.length === 1
            ? key.shiftLabel
            : key.label.toUpperCase(),
        };
      }
    }
  }
  return map;
})();

export function keyIdForChar(char: string): { id: string; shift: boolean } | null {
  return CHAR_TO_KEY[char] ?? null;
}

/**
 * Rotates a hex colour's hue by a few degrees and returns hex.
 *
 * The per-key tint used to be `filter: hue-rotate(…)` on two spans of every
 * key. A CSS filter forces its element to rasterise on its own surface, so
 * that was two extra surfaces per key, for a shift of at most 1.5°. Baking the
 * shift into the colours themselves is the same tint at no cost.
 */
function shiftHue(hex: string, degrees: number): string {
  if (!degrees) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return hex;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (((h * 60 + degrees) % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${to(channel(h + 1 / 3))}${to(channel(h))}${to(channel(h - 1 / 3))}`;
}

function shiftLightness(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const adj = amount * 2.2;
  const rr = clamp(r + adj);
  const gg = clamp(g + adj);
  const bb = clamp(b + adj);
  return `rgb(${rr}, ${gg}, ${bb})`;
}

function hashKeyId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

interface KeyVariance {
  hueShift: number;
  lightnessShift: number;
  specularShiftX: number;
  specularShiftY: number;
  wearAngle: number;
  wearAmount: number;
  dust: boolean;
  dustX: number;
  dustY: number;
  microTilt: number;
  rimBias: number;
}

function getKeyVariance(id: string, small?: boolean): KeyVariance {
  const a = hashKeyId(id);
  const b = hashKeyId(id + "_b");
  const c = hashKeyId(id + "_c");
  const d = hashKeyId(id + "_d");
  const e = hashKeyId(id + "_e");
  return {
    hueShift: (a - 0.5) * 3,
    lightnessShift: (b - 0.5) * 4,
    specularShiftX: (c - 0.5) * 16,
    specularShiftY: (a * c - 0.5) * 12,
    wearAngle: b * 360,
    wearAmount: small ? 0.08 + c * 0.06 : 0.1 + d * 0.1,
    dust: false,
    dustX: 15 + c * 70,
    dustY: 15 + a * 70,
    microTilt: (e - 0.5) * 0.32,
    rimBias: 0.85 + e * 0.25,
  };
}

const CODE_TO_KEY_ID: Record<string, string> = {
  Escape: "esc",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Digit0: "0",
  Minus: "minus",
  Equal: "equal",
  Backspace: "backspace",
  Tab: "tab",
  KeyQ: "q",
  KeyW: "w",
  KeyE: "e",
  KeyR: "r",
  KeyT: "t",
  KeyY: "y",
  KeyU: "u",
  KeyI: "i",
  KeyO: "o",
  KeyP: "p",
  BracketLeft: "lbracket",
  BracketRight: "rbracket",
  Backslash: "backslash",
  CapsLock: "caps",
  KeyA: "a",
  KeyS: "s",
  KeyD: "d",
  KeyF: "f",
  KeyG: "g",
  KeyH: "h",
  KeyJ: "j",
  KeyK: "k",
  KeyL: "l",
  Semicolon: "semicolon",
  Quote: "quote",
  Enter: "enter",
  ShiftLeft: "lshift",
  KeyZ: "z",
  KeyX: "x",
  KeyC: "c",
  KeyV: "v",
  KeyB: "b",
  KeyN: "n",
  KeyM: "m",
  Comma: "comma",
  Period: "period",
  Slash: "slash",
  ShiftRight: "rshift",
  ControlLeft: "lctrl",
  MetaLeft: "lwin",
  AltLeft: "lalt",
  Space: "space",
  AltRight: "ralt",
  MetaRight: "rwin",
};

const svgDataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const WOOD_GRAIN_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='460' height='460'>
  <filter id='g'>
    <feTurbulence type='fractalNoise' baseFrequency='0.14 0.0032' numOctaves='6' seed='23' stitchTiles='stitch' result='n'/>
    <feColorMatrix in='n' type='matrix' values='0 0 0 0 0.27  0 0 0 0 0.15  0 0 0 0 0.065  0 0 0 1.0 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#g)'/>
</svg>`);

const WOOD_GRAIN_FINE_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>
  <filter id='gf'>
    <feTurbulence type='fractalNoise' baseFrequency='0.28 0.01' numOctaves='4' seed='71' stitchTiles='stitch' result='n'/>
    <feColorMatrix in='n' type='matrix' values='0 0 0 0 0.35  0 0 0 0 0.21  0 0 0 0 0.1  0 0 0 0.55 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#gf)'/>
</svg>`);

const WOOD_TONE_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='520' height='520'>
  <filter id='t'>
    <feTurbulence type='fractalNoise' baseFrequency='0.0045' numOctaves='2' seed='11' result='n'/>
    <feColorMatrix in='n' type='matrix' values='0 0 0 0 0.22  0 0 0 0 0.115  0 0 0 0 0.045  0 0 0 0.5 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#t)'/>
</svg>`);

const PBT_NOISE_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
  <filter id='n'>
    <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='4' result='t'/>
    <feColorMatrix in='t' type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#n)'/>
</svg>`);

const END_GRAIN_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>
  <filter id='e'>
    <feTurbulence type='turbulence' baseFrequency='0.24' numOctaves='3' seed='2' result='t'/>
    <feColorMatrix in='t' type='matrix' values='0 0 0 0 0.12  0 0 0 0 0.07  0 0 0 0 0.026  0 0 0 0.55 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#e)'/>
</svg>`);

const WOOD_PORE_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'>
  <filter id='p'>
    <feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' seed='31' result='t'/>
    <feColorMatrix in='t' type='matrix' values='0 0 0 0 0.05  0 0 0 0 0.025  0 0 0 0 0.008  0 0 0 0.075 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#p)'/>
</svg>`);

const WOOD_MICROSCRATCH_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='620' height='420'>
  <defs>
    <filter id='s'>
      <feTurbulence type='fractalNoise' baseFrequency='0.012 0.09' numOctaves='2' seed='58' result='n'/>
      <feColorMatrix in='n' type='matrix' values='0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.9  0 0 0 0.035 0'/>
    </filter>
  </defs>
  <rect width='100%' height='100%' filter='url(#s)'/>
</svg>`);

const WOOD_DENT_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='700' height='500'>
  <defs>
    <radialGradient id='d1' cx='50%' cy='40%' r='60%'>
      <stop offset='0%' stop-color='#000' stop-opacity='0.13'/>
      <stop offset='55%' stop-color='#000' stop-opacity='0.04'/>
      <stop offset='100%' stop-color='#000' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='d2' cx='50%' cy='40%' r='60%'>
      <stop offset='0%' stop-color='#fff' stop-opacity='0.18'/>
      <stop offset='100%' stop-color='#fff' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <ellipse cx='118' cy='72' rx='4.5' ry='2.1' fill='url(#d1)'/>
  <ellipse cx='120' cy='70' rx='1.6' ry='0.7' fill='url(#d2)'/>
  <ellipse cx='562' cy='410' rx='5.5' ry='2.5' fill='url(#d1)' transform='rotate(18 562 410)'/>
  <ellipse cx='564' cy='407' rx='1.9' ry='0.8' fill='url(#d2)' transform='rotate(18 564 407)'/>
  <ellipse cx='612' cy='58' rx='3.2' ry='1.4' fill='url(#d1)'/>
  <ellipse cx='34' cy='330' rx='2.7' ry='1.2' fill='url(#d1)'/>
</svg>`);

interface ThockEngine {
  ctx: AudioContext;
  dry: GainNode;
  wet: GainNode;
  supportsPanning: boolean;
  /** Pre-rolled white noise, reused for the impact of every keypress. */
  noise: AudioBuffer;
}

let thockEngine: ThockEngine | null = null;
let thockEnginePromise: Promise<ThockEngine | null> | null = null;

function buildCaseImpulse(ctx: AudioContext): AudioBuffer {
  const duration = 0.2;
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const decay = Math.pow(1 - t, 2.8);
      const raw = (Math.random() * 2 - 1) * decay;
      lp += (raw - lp) * 0.3;
      data[i] = lp;
    }
  }
  return buffer;
}

/**
 * A second of white noise, generated once and reused. The impact half of a
 * keypress is a very short slice of this through a bandpass filter.
 */
function buildNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function getThockEngine(): Promise<ThockEngine | null> {
  if (thockEngine) return Promise.resolve(thockEngine);
  if (thockEnginePromise) return thockEnginePromise;

  thockEnginePromise = (async () => {
    if (typeof window === "undefined") return null;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 12;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.08;

    const master = ctx.createGain();
    master.gain.value = 0.9;
    compressor.connect(master);
    master.connect(ctx.destination);

    const dry = ctx.createGain();
    dry.gain.value = 0.85;
    dry.connect(compressor);

    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    const convolver = ctx.createConvolver();
    convolver.normalize = true;
    convolver.buffer = buildCaseImpulse(ctx);
    wet.connect(convolver);
    convolver.connect(compressor);

    const engine: ThockEngine = {
      ctx,
      dry,
      wet,
      supportsPanning: typeof ctx.createStereoPanner === "function",
      noise: buildNoiseBuffer(ctx),
    };
    thockEngine = engine;
    return engine;
  })();

  return thockEnginePromise;
}

/**
 * A keypress is two layers played together:
 *
 *   impact  a few milliseconds of bandpassed noise, the plastic-on-plastic click
 *   body    a fast decaying low tone, the hollow thock of the case
 *
 * These are synthesised rather than sampled. Nothing to decode, nothing to
 * fetch, it works in every browser, and each press is detuned slightly so a
 * fast typist does not hear the same click on repeat.
 */
const CATEGORY_PROFILE: Record<
  SoundCategory,
  {
    clickHz: number;
    clickQ: number;
    clickMs: number;
    bodyHz: number;
    bodyMs: number;
    gain: number;
  }
> = {
  normal: { clickHz: 2600, clickQ: 1.1, clickMs: 26, bodyHz: 148, bodyMs: 70, gain: 0.5 },
  spacebar: { clickHz: 1500, clickQ: 0.9, clickMs: 34, bodyHz: 92, bodyMs: 110, gain: 0.62 },
  modifier: { clickHz: 3300, clickQ: 1.4, clickMs: 20, bodyHz: 190, bodyMs: 55, gain: 0.38 },
};

let soundEnabled = true;

/** Lets the game mute the board without unmounting it. */
export function setKeyboardSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

/**
 * Browsers only let an AudioContext start inside a user gesture, and only if
 * the call happens in that same task. Creating the context from a promise
 * callback leaves it suspended forever, which is silence with no error. Call
 * this synchronously from the event handler.
 */
export function unlockKeyboardAudio() {
  if (typeof window === "undefined" || !soundEnabled) return;
  if (thockEngine) {
    if (thockEngine.ctx.state === "suspended") void thockEngine.ctx.resume();
    return;
  }
  // getThockEngine constructs the AudioContext before its first await, so
  // starting it here keeps it inside the gesture.
  void getThockEngine();
}

function playKeySound(category: SoundCategory, muted: boolean, panHint = 0) {
  if (typeof window === "undefined" || !soundEnabled) return;

  void getThockEngine().then((engine) => {
    if (!engine) return;
    const { ctx, dry, wet, supportsPanning, noise } = engine;
    if (ctx.state === "suspended") void ctx.resume();

    const profile = CATEGORY_PROFILE[category];
    const now = ctx.currentTime;
    const detune = 0.94 + Math.random() * 0.12;
    const level = profile.gain * (muted ? 0.7 : 1) * (0.9 + Math.random() * 0.2);

    const out = ctx.createGain();
    out.gain.value = 1;

    let tail: AudioNode = out;
    if (supportsPanning) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, panHint + (Math.random() - 0.5) * 0.08));
      out.connect(panner);
      tail = panner;
    }
    tail.connect(dry);
    tail.connect(wet);

    /* impact: a short slice of noise through a bandpass */
    const clickSeconds = (profile.clickMs / 1000) * detune;
    const click = ctx.createBufferSource();
    click.buffer = noise;
    // Start somewhere random in the noise so repeats do not phase together.
    const offset = Math.random() * Math.max(0, noise.duration - clickSeconds - 0.02);

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = profile.clickHz * detune;
    band.Q.value = profile.clickQ;

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.exponentialRampToValueAtTime(level, now + 0.001);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + clickSeconds);

    click.connect(band);
    band.connect(clickGain);
    clickGain.connect(out);

    /* body: a low tone that dies away fast */
    const bodySeconds = (profile.bodyMs / 1000) * detune;
    const body = ctx.createOscillator();
    body.type = "triangle";
    body.frequency.setValueAtTime(profile.bodyHz * detune, now);
    // The downward bend is what makes it read as a thock rather than a beep.
    body.frequency.exponentialRampToValueAtTime(
      profile.bodyHz * detune * 0.72,
      now + bodySeconds,
    );

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.exponentialRampToValueAtTime(level * 0.75, now + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + bodySeconds);

    body.connect(bodyGain);
    bodyGain.connect(out);

    const stopAt = now + Math.max(clickSeconds, bodySeconds) + 0.02;
    click.start(now, offset, clickSeconds + 0.01);
    body.start(now);
    click.stop(stopAt);
    body.stop(stopAt);

    body.onended = () => {
      out.disconnect();
      if (tail !== out) tail.disconnect();
    };
  });
}

/* ------------------------------------------------------------------ */
/* Themes                                                              */
/* ------------------------------------------------------------------ */

interface KeyboardTheme {
  /** Base keycap colour before per-key variance is applied. */
  keycap: string;
  legendInk: string;
  legendInkSoft: string;
  /** Five stops down the moulded side wall of a keycap. */
  wall: [string, string, string, string, string];
  wallShadow: string;
  topRingShadow: string;
  topRingShadowPressed: string;
  specularTint: string;
  caseBackground: string;
  caseShadow: string;
  bezelBackground: string;
  bezelShadow: string;
  bezelSheen: string;
  caseEdge: string;
  /** Wood grain / dent overlays only make sense on the vintage board. */
  woodTextures: boolean;
  pageBackground: string;
  indicatorText: string;
  indicatorKeyBg: string;
  indicatorKeyBorder: string;
  indicatorKeyInk: string;
  highlight: string;
}

const THEMES: Record<KeyboardVariant, KeyboardTheme> = {
  vintage: {
    keycap: "#DFD2C3",
    legendInk: "#413e38",
    legendInkSoft: "#726d64",
    wall: ["#f0e4d1", "#e0cead", "#c8b394", "#a68e70", "#8c7458"],
    wallShadow:
      "inset 0 1px 0 rgba(255,255,255,0.4), inset 0.6px 0.4px 0 rgba(255,255,255,0.14), inset 0 -1.5px 2px rgba(15,9,4,0.16), inset 0 0 0 0.5px rgba(15,9,4,0.06)",
    topRingShadow:
      "inset 0 0 0 0.75px rgba(96,70,42,0.28), inset 0 0.6px 0 rgba(255,250,238,0.4), inset 0 -0.8px 1.2px rgba(15,9,4,0.04)",
    topRingShadowPressed:
      "inset 0 0 0 0.75px rgba(96,70,42,0.34), inset 0 0.5px 0 rgba(255,250,238,0.22), inset 0 1px 2px rgba(15,10,5,0.1)",
    specularTint: "rgba(255,252,244,0.28)",
    caseBackground: `
      linear-gradient(180deg, rgba(255,255,255,0.045) 0%, transparent 9%),
      repeating-linear-gradient(180deg, rgba(70,42,16,0.08) 0px, transparent 2px, transparent 6px, rgba(70,42,16,0.055) 8px, transparent 13px),
      linear-gradient(178deg, #ad7440 0%, #9d6636 26%, #895128 55%, #764a24 78%, #63391a 100%)
    `,
    caseShadow:
      "0 0.5px 0 rgba(255,222,185,0.18) inset, 0 -2px 4.5px rgba(35,19,6,0.32) inset, 0.4px 0.4px 0.8px rgba(255,232,200,0.14) inset, 0 3px 6px rgba(15,8,3,0.22), 0 1px 2px rgba(15,8,3,0.2)",
    bezelBackground: "linear-gradient(155deg, #15120e 0%, #0e0c08 50%, #0a0805 100%)",
    bezelShadow:
      "inset 0 2.5px 6px rgba(0,0,0,0.55), inset 0 4px 8px rgba(0,0,0,0.28), inset 0 -1px 0 rgba(255,255,255,0.04), inset 0 0.5px 0 rgba(255,255,255,0.05), inset 0 0 0 1px rgba(0,0,0,0.32), 0 1px 0 rgba(255,236,204,0.1)",
    bezelSheen: "radial-gradient(140% 60% at 44% 0%, rgba(180,120,70,0.1), transparent 45%)",
    caseEdge:
      "inset 0 1px 0 rgba(255,246,224,0.6), inset 0 -1px 0 rgba(10,6,2,0.55), inset 1px 0 0 rgba(255,246,224,0.26), inset -1px 0 0 rgba(10,6,2,0.36)",
    woodTextures: true,
    pageBackground: "#FAFAFA",
    indicatorText: "#8a8a8e",
    indicatorKeyBg: "#ffffff",
    indicatorKeyBorder: "#e4e4e7",
    indicatorKeyInk: "#3f3f46",
    highlight: "#9B6AF6",
  },
  genlayer: {
    keycap: "#20243F",
    legendInk: "#EDEFFF",
    legendInkSoft: "#9AA0C8",
    wall: ["#3A4068", "#2E3455", "#242945", "#1B1F36", "#12162A"],
    wallShadow:
      "inset 0 1px 0 rgba(180,190,255,0.22), inset 0.6px 0.4px 0 rgba(180,190,255,0.08), inset 0 -1.5px 2px rgba(0,0,0,0.45), inset 0 0 0 0.5px rgba(0,0,0,0.35)",
    topRingShadow:
      "inset 0 0 0 0.75px rgba(120,130,220,0.28), inset 0 0.6px 0 rgba(200,205,255,0.18), inset 0 -0.8px 1.2px rgba(0,0,0,0.35)",
    topRingShadowPressed:
      "inset 0 0 0 0.75px rgba(155,106,246,0.55), inset 0 0.5px 0 rgba(200,205,255,0.1), inset 0 1px 2px rgba(0,0,0,0.5)",
    specularTint: "rgba(190,200,255,0.16)",
    caseBackground: `
      linear-gradient(180deg, rgba(190,200,255,0.06) 0%, transparent 12%),
      radial-gradient(120% 90% at 12% -20%, rgba(227,125,247,0.22), transparent 55%),
      radial-gradient(120% 90% at 90% 120%, rgba(17,15,255,0.28), transparent 58%),
      linear-gradient(178deg, #2C3160 0%, #232855 30%, #1A1E43 62%, #12152E 100%)
    `,
    caseShadow:
      "0 0.5px 0 rgba(200,205,255,0.16) inset, 0 -2px 4.5px rgba(0,0,0,0.5) inset, 0 10px 34px -14px rgba(155,106,246,0.5), 0 3px 6px rgba(0,0,0,0.5)",
    bezelBackground: "linear-gradient(155deg, #0B0D1C 0%, #070914 50%, #04050D 100%)",
    bezelShadow:
      "inset 0 2.5px 6px rgba(0,0,0,0.7), inset 0 4px 8px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(200,205,255,0.05), inset 0 0 0 1px rgba(0,0,0,0.5), 0 1px 0 rgba(155,106,246,0.18)",
    bezelSheen: "radial-gradient(140% 60% at 44% 0%, rgba(155,106,246,0.16), transparent 48%)",
    caseEdge:
      "inset 0 1px 0 rgba(205,210,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.65), inset 1px 0 0 rgba(205,210,255,0.12), inset -1px 0 0 rgba(0,0,0,0.5)",
    woodTextures: false,
    pageBackground: "transparent",
    indicatorText: "#99a0c4",
    indicatorKeyBg: "#12152B",
    indicatorKeyBorder: "#343A66",
    indicatorKeyInk: "#EDEFFF",
    highlight: "#E37DF7",
  },
};

type DeviceTier = "mobile" | "tablet" | "desktop";

const MOBILE_BREAKPOINT = "(max-width: 639px)";
const TABLET_BREAKPOINT = "(max-width: 1023px)";

function resolveTier(): DeviceTier {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia(MOBILE_BREAKPOINT).matches) return "mobile";
  if (window.matchMedia(TABLET_BREAKPOINT).matches) return "tablet";
  return "desktop";
}

function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>(resolveTier);

  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_BREAKPOINT);
    const tabletQuery = window.matchMedia(TABLET_BREAKPOINT);
    const update = () => setTier(resolveTier());
    update();
    mobileQuery.addEventListener("change", update);
    tabletQuery.addEventListener("change", update);
    return () => {
      mobileQuery.removeEventListener("change", update);
      tabletQuery.removeEventListener("change", update);
    };
  }, []);

  return tier;
}

const RADIUS_TIERS: Record<DeviceTier, { wall: number; top: number }> = {
  desktop: { wall: 8, top: 6.5 },
  tablet: { wall: 7, top: 5.5 },
  mobile: { wall: 5.5, top: 4 },
};

const NOISE_OPACITY_TIERS: Record<DeviceTier, { wall: number; top: number }> = {
  desktop: { wall: 0.05, top: 0.06 },
  tablet: { wall: 0.05, top: 0.06 },
  mobile: { wall: 0.045, top: 0.05 },
};

const NOISE_SIZE_TIERS: Record<DeviceTier, { wall: number; top: number }> = {
  desktop: { wall: 90, top: 40 },
  tablet: { wall: 68, top: 30 },
  mobile: { wall: 48, top: 22 },
};

interface RowSculpt {
  insetTop: number;
  insetSide: number;
  insetBottom: number;
}

const ROW_SCULPT_TIERS: Record<DeviceTier, RowSculpt[]> = {
  desktop: [
    { insetTop: 4, insetSide: 4.5, insetBottom: 11 },
    { insetTop: 4, insetSide: 4.5, insetBottom: 9.5 },
    { insetTop: 4, insetSide: 4.5, insetBottom: 8.5 },
    { insetTop: 4, insetSide: 4.5, insetBottom: 9 },
    { insetTop: 3.5, insetSide: 4, insetBottom: 7 },
  ],
  tablet: [
    { insetTop: 3.2, insetSide: 3.6, insetBottom: 8.8 },
    { insetTop: 3.2, insetSide: 3.6, insetBottom: 7.6 },
    { insetTop: 3.2, insetSide: 3.6, insetBottom: 6.8 },
    { insetTop: 3.2, insetSide: 3.6, insetBottom: 7.2 },
    { insetTop: 2.8, insetSide: 3.2, insetBottom: 5.6 },
  ],
  mobile: [
    { insetTop: 2.2, insetSide: 2.4, insetBottom: 5.8 },
    { insetTop: 2.2, insetSide: 2.4, insetBottom: 5 },
    { insetTop: 2.2, insetSide: 2.4, insetBottom: 4.4 },
    { insetTop: 2.2, insetSide: 2.4, insetBottom: 4.7 },
    { insetTop: 2, insetSide: 2.2, insetBottom: 3.6 },
  ],
};

const LEGEND_SHARED = {
  shiftTopOffset: "13%",
  shiftLeftOffset: "18%",
  primaryBottomOffset: "14.5%",
  primaryLeftOffset: "0.85em",

  opticalCenterShift: "1.4%",
  shiftOpacity: 0.66,
  primaryOpacity: 0.96,
} as const;

const LEGEND_FONT_TIERS: Record<
  DeviceTier,
  { shift: string; normal: string; small: string }
> = {
  desktop: {
    shift: "clamp(0.46rem, 0.74vw, 0.58rem)",
    normal: "clamp(0.74rem, 1.38vw, 0.95rem)",
    small: "clamp(0.56rem, 1.02vw, 0.7rem)",
  },
  tablet: {
    shift: "clamp(0.48rem, 1.12vw, 0.58rem)",
    normal: "clamp(0.7rem, 2.05vw, 0.86rem)",
    small: "clamp(0.55rem, 1.58vw, 0.68rem)",
  },
  mobile: {
    shift: "clamp(0.43rem, 2.05vw, 0.51rem)",
    normal: "clamp(0.62rem, 3.65vw, 0.78rem)",
    small: "clamp(0.51rem, 2.85vw, 0.63rem)",
  },
};

const CONTACT_SHADOW_TIERS: Record<DeviceTier, string> = {
  desktop:
    "0 0.5px 0.5px rgba(12,8,4,0.14), 0 2px 3px rgba(12,8,4,0.1), 0 5px 9px rgba(12,8,4,0.07), 0 10px 16px rgba(12,8,4,0.045)",

  tablet:
    "0 0.4px 0.4px rgba(12,8,4,0.14), 0 1.5px 2.2px rgba(12,8,4,0.1), 0 3.5px 6px rgba(12,8,4,0.07), 0 6.5px 10px rgba(12,8,4,0.04)",
  mobile:
    "0 0.3px 0.3px rgba(12,8,4,0.13), 0 1px 1.6px rgba(12,8,4,0.1), 0 2.2px 4px rgba(12,8,4,0.06)",
};

const KEY_HEIGHT_TIERS: Record<DeviceTier, string> = {
  desktop: "clamp(2.15rem, min(4.15vw, 7.5vh), 2.95rem)",
  tablet: "clamp(1.95rem, min(5.4vw, 7vh), 2.6rem)",
  mobile: "clamp(1.75rem, min(8vw, 6vh), 2.2rem)",
};

/** Compact mode shrinks the board so it can sit under the typing surface. */
const KEY_HEIGHT_COMPACT: Record<DeviceTier, string> = {
  desktop: "clamp(1.6rem, min(2.9vw, 5vh), 2.1rem)",
  tablet: "clamp(1.45rem, min(4vw, 4.6vh), 1.9rem)",
  mobile: "clamp(1.3rem, min(6.4vw, 4.2vh), 1.65rem)",
};

const KEY_GAP_TIERS: Record<DeviceTier, string> = {
  desktop: "3px",
  tablet: "2.5px",
  mobile: "2px",
};

const CONTAINER_TIERS: Record<
  DeviceTier,
  { padding: string; maxWidth: string }
> = {
  desktop: { padding: "clamp(1.5rem, 6.25vw, 2.5rem)", maxWidth: "48rem" },
  tablet: { padding: "clamp(1.1rem, 3.6vw, 1.75rem)", maxWidth: "38rem" },
  mobile: { padding: "clamp(0.6rem, 3vw, 0.9rem)", maxWidth: "26rem" },
};

const CASE_TIERS: Record<
  DeviceTier,
  {
    caseRadius: string;
    bezelRadius: string;
    casePadding: string;
    bezelPadding: string;
  }
> = {
  desktop: {
    caseRadius: "0.32rem",
    bezelRadius: "0.24rem",
    casePadding: "1.15% 1.3%",
    bezelPadding: "0.28%",
  },
  tablet: {
    caseRadius: "0.3rem",
    bezelRadius: "0.22rem",
    casePadding: "1.3% 1.5%",
    bezelPadding: "0.32%",
  },
  mobile: {
    caseRadius: "0.26rem",
    bezelRadius: "0.2rem",
    casePadding: "1.6% 1.9%",
    bezelPadding: "0.4%",
  },
};

const MOBILE_LABEL_OVERRIDES: Record<string, string> = {
  backspace: "⌫",
  caps: "Caps",
};

const KEY_STYLE_TAG = `
.kb-key {
  --tilt: 0deg;
  contain: layout style paint;
  backface-visibility: hidden;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  transform: translateY(0) scale(1) rotate(var(--tilt));
  transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
/* A layer is promoted for the press only. will-change on every key at rest
   kept sixty-odd bitmaps of seven-layer keycaps alive in GPU memory the whole
   time the board was on screen; that was the RAM. */
.kb-key[data-pressed="true"] {
  will-change: transform;
  transform: translateY(4.5px) scale(0.975) rotate(calc(var(--tilt) * 0.3));
  transition: transform 15ms linear;
}

.kb-viewport {
  min-height: 100vh;
  min-height: 100dvh;
}

@keyframes kb-next-pulse {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}
.kb-next-ring {
  animation: kb-next-pulse 1.3s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .kb-next-ring { animation: none; opacity: 0.9; }
  .kb-key { transition-duration: 1ms; }
}
`;

const MIN_VISIBLE_PRESS_MS = 55;

function usePressState(): [boolean, () => void, () => void] {
  const [pressed, setPressed] = useState(false);
  const pressedAtRef = useRef(0);
  const releaseTimeoutRef = useRef<number | null>(null);

  const clearPendingRelease = useCallback(() => {
    if (releaseTimeoutRef.current !== null) {
      window.clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }
  }, []);

  const press = useCallback(() => {
    clearPendingRelease();
    pressedAtRef.current = performance.now();
    setPressed(true);
  }, [clearPendingRelease]);

  const release = useCallback(() => {
    const elapsed = performance.now() - pressedAtRef.current;
    const remaining = MIN_VISIBLE_PRESS_MS - elapsed;
    if (remaining > 0) {
      clearPendingRelease();
      releaseTimeoutRef.current = window.setTimeout(() => {
        releaseTimeoutRef.current = null;
        setPressed(false);
      }, remaining);
    } else {
      setPressed(false);
    }
  }, [clearPendingRelease]);

  useEffect(() => clearPendingRelease, [clearPendingRelease]);

  return [pressed, press, release];
}

const Key = memo(function Key({
  config,
  rowIndex,
  tier,
  theme,
  compact,
  isNext,
  registerTrigger,
  onActivate,
  onDeactivate,
  onTap,
}: {
  config: KeyConfig;
  rowIndex: number;
  tier: DeviceTier;
  theme: KeyboardTheme;
  compact: boolean;
  isNext: boolean;
  registerTrigger: (id: string, trigger: KeyTrigger) => () => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onTap?: (id: string) => void;
}) {
  const {
    id,
    label,
    shiftLabel,
    width = 1,
    align = "center",
    small,
    muted,
  } = config;
  const [pointerPressed, pressPointer, releasePointer] = usePressState();
  const [physicallyPressed, pressPhysical, releasePhysical] = usePressState();
  const sculptRows = ROW_SCULPT_TIERS[tier];
  const sculpt = sculptRows[rowIndex] ?? sculptRows[1];
  const radius = RADIUS_TIERS[tier];
  const noiseOpacity = NOISE_OPACITY_TIERS[tier];
  const noiseSize = NOISE_SIZE_TIERS[tier];
  const legendFont = LEGEND_FONT_TIERS[tier];
  const contactShadow = CONTACT_SHADOW_TIERS[tier];
  const keyHeight = (compact ? KEY_HEIGHT_COMPACT : KEY_HEIGHT_TIERS)[tier];
  const displayLabel =
    tier === "mobile" ? (MOBILE_LABEL_OVERRIDES[id] ?? label) : label;
  const pressed = pointerPressed || physicallyPressed;
  const variance = useMemo(() => getKeyVariance(id, small), [id, small]);

  const primaryAlign: "left" | "center" = align;

  useEffect(() => {
    return registerTrigger(id, {
      press: pressPhysical,
      release: releasePhysical,
    });
  }, [id, registerTrigger, pressPhysical, releasePhysical]);

  const layers = useMemo(() => {
    const insetTRBL = `${sculpt.insetTop}px ${sculpt.insetSide}px ${sculpt.insetBottom}px ${sculpt.insetSide}px`;
    const [w0, w1, w2, w3, w4] = theme.wall.map((c) => shiftHue(c, variance.hueShift)) as [
      string, string, string, string, string,
    ];
    const keycap = shiftHue(theme.keycap, variance.hueShift * 0.4);
    return {
      insetTRBL,

      wallGradient: `linear-gradient(180deg, ${shiftLightness(
        w0,
        variance.lightnessShift,
      )} 0%, ${shiftLightness(w1, variance.lightnessShift)} 18%, ${shiftLightness(
        w2,
        variance.lightnessShift,
      )} 46%, ${shiftLightness(w3, variance.lightnessShift * 0.7)} 78%, ${shiftLightness(
        w4,
        variance.lightnessShift * 0.5,
      )} 100%)`,
      wallNoisePosition: `${variance.specularShiftX}px ${variance.specularShiftY}px`,

      wallShadow: theme.wallShadow,

      topGradient: `radial-gradient(115% 125% at ${23 + variance.specularShiftX * 0.4}% 9%, rgba(255,255,255,${
        0.4 - variance.wearAmount * 0.06
      }), rgba(255,255,255,0) 44%), radial-gradient(150% 120% at 50% 118%, rgba(15,9,4,${
        0.07 + variance.wearAmount * 0.02
      }), transparent 60%), ${shiftLightness(keycap, variance.lightnessShift * 0.6)}`,
      topNoisePosition: `${variance.specularShiftY}px ${variance.specularShiftX}px`,
      topShadow: theme.topRingShadow,
      topShadowPressed: theme.topRingShadowPressed,
      rimOpacityUp: 0.55 * variance.rimBias,
      rimOpacityDown: 0.22 * variance.rimBias,
    };
  }, [sculpt, variance, theme]);

  const handlePress = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Some pointer sources refuse capture. The press still counts.
      }
      // Unlock inside the gesture, before anything async runs.
      unlockKeyboardAudio();
      pressPointer();
      onActivate(id);
      onTap?.(id);
      playKeySound(getSoundCategory(id), !!muted, KEY_PAN[id] ?? 0);
    },
    [id, muted, pressPointer, onActivate, onTap],
  );

  const handleRelease = useCallback(() => {
    releasePointer();
    onDeactivate(id);
  }, [releasePointer, onDeactivate, id]);

  return (
    <button
      type="button"
      aria-label={label || "Space"}
      tabIndex={-1}
      data-pressed={pressed}
      data-next={isNext || undefined}
      onPointerDown={handlePress}
      onPointerUp={handleRelease}
      onPointerCancel={handleRelease}
      onPointerLeave={handleRelease}
      style={
        {
          flexGrow: width,
          flexBasis: 0,

          minWidth: 0,
          height: keyHeight,
          "--tilt": `${variance.microTilt}deg`,
        } as CSSProperties
      }
      className="kb-key relative select-none outline-none"
    >
      {}
      <span
        className="pointer-events-none absolute"
        style={{
          inset: 0,
          borderRadius: radius.wall,
          boxShadow: pressed
            ? "0 0.5px 1px rgba(15,9,4,0.2), 0 2px 4px rgba(15,9,4,0.12)"
            : contactShadow,
          transition: "box-shadow 140ms ease-out",
          zIndex: 0,
        }}
      />
      {}
      <span
        className="absolute inset-0"
        style={{
          borderRadius: radius.wall,
          background: layers.wallGradient,
          boxShadow: layers.wallShadow,
          zIndex: 1,
        }}
      />
      <span
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{
          borderRadius: radius.wall,
          backgroundImage: `url("${PBT_NOISE_URI}")`,
          backgroundSize: `${noiseSize.wall}px ${noiseSize.wall}px`,
          backgroundPosition: layers.wallNoisePosition,
          opacity: noiseOpacity.wall,
          zIndex: 1,
        }}
      />
      {}
      <span
        className="absolute"
        style={{
          borderRadius: radius.top,
          inset: layers.insetTRBL,
          background: layers.topGradient,
          boxShadow: pressed ? layers.topShadowPressed : layers.topShadow,
          transition: "box-shadow 140ms ease-out, background 140ms ease-out",
          zIndex: 3,
        }}
      />
      <span
        className="pointer-events-none absolute mix-blend-overlay"
        style={{
          borderRadius: radius.top,
          inset: layers.insetTRBL,
          backgroundImage: `url("${PBT_NOISE_URI}")`,
          backgroundSize: `${noiseSize.top}px ${noiseSize.top}px`,
          backgroundPosition: layers.topNoisePosition,
          opacity: noiseOpacity.top,
          zIndex: 3,
        }}
      />
      {}
      <span
        className="pointer-events-none absolute"
        style={{
          borderRadius: radius.top,
          inset: layers.insetTRBL,
          background: `radial-gradient(55% 50% at 26% 18%, ${theme.specularTint}, transparent 70%)`,
          opacity: pressed ? 0.4 : 1,
          transition: "opacity 140ms ease-out",
          zIndex: 4,
        }}
      />
      {}
      <span
        className="pointer-events-none absolute"
        style={{
          borderRadius: radius.top,
          inset: layers.insetTRBL,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, transparent 14%), linear-gradient(100deg, rgba(255,255,255,0.09) 0%, transparent 9%)",
          opacity: pressed ? layers.rimOpacityDown : layers.rimOpacityUp,
          transition: "opacity 140ms ease-out",
          zIndex: 4,
        }}
      />
      {/* Next-key guide: a soft ring around the key the passage is asking for. */}
      {isNext && (
        <span
          className="kb-next-ring pointer-events-none absolute"
          style={{
            borderRadius: radius.top,
            inset: layers.insetTRBL,
            boxShadow: `inset 0 0 0 1.5px ${theme.highlight}, 0 0 14px -2px ${theme.highlight}`,
            background: `radial-gradient(80% 80% at 50% 50%, ${theme.highlight}22, transparent 70%)`,
            zIndex: 4,
          }}
        />
      )}
      <span
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 5 }}
      >
        {shiftLabel && (
          <span
            className="absolute font-medium leading-none"
            style={{
              top: `calc(${sculpt.insetTop}px + ${LEGEND_SHARED.shiftTopOffset})`,
              left: LEGEND_SHARED.shiftLeftOffset,
              fontSize: legendFont.shift,
              color: theme.legendInkSoft,
              opacity: LEGEND_SHARED.shiftOpacity,
              letterSpacing: "0.01em",

              textShadow:
                "0 0.4px 0 rgba(255,255,255,0.32), 0 0 0.3px rgba(35,28,18,0.3)",
            }}
          >
            {shiftLabel}
          </span>
        )}
        {label && (
          <span
            className={`absolute leading-none ${
              small ? "font-semibold" : "font-bold"
            } ${primaryAlign === "left" ? "text-left" : "text-center"}`}
            style={{
              bottom: `calc(${sculpt.insetBottom}px + ${LEGEND_SHARED.primaryBottomOffset})`,
              left:
                primaryAlign === "left"
                  ? LEGEND_SHARED.primaryLeftOffset
                  : shiftLabel
                    ? `calc(50% - ${LEGEND_SHARED.opticalCenterShift})`
                    : "50%",
              transform:
                primaryAlign === "left" ? undefined : "translateX(-50%)",
              fontSize: small ? legendFont.small : legendFont.normal,
              color: theme.legendInk,
              opacity: LEGEND_SHARED.primaryOpacity,
              letterSpacing: small ? "0.015em" : "-0.01em",
              textShadow:
                "0 0.4px 0 rgba(255,255,255,0.28), 0 0 0.35px rgba(30,24,16,0.35)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "clip",
              maxWidth: "100%",
            }}
          >
            {displayLabel}
          </span>
        )}
      </span>
    </button>
  );
});

const MODIFIER_FAMILIES: Array<{ modifier: string; ids: string[] }> = [
  { modifier: "Alt", ids: ["lalt", "ralt"] },
  { modifier: "Control", ids: ["lctrl"] },
  { modifier: "Shift", ids: ["lshift", "rshift"] },
  { modifier: "Meta", ids: ["lwin", "rwin"] },
];

export interface VintageKeyboardProps {
  variant?: KeyboardVariant;
  /** Drop the full-viewport wrapper and the page background. */
  embedded?: boolean;
  /** Shrink key height so the board fits under a typing surface. */
  compact?: boolean;
  /** Show the "Press any key…" chip above the board. */
  showIndicator?: boolean;
  /** Mute the thock without unmounting. */
  sound?: boolean;
  /** The character the player has to type next — its key lights up. */
  highlightChar?: string | null;
  /**
   * The original board ignores key events while an input has focus. The game
   * types into an input, so it opts out of that guard.
   */
  listenWhileTyping?: boolean;
  /** Tapping a letter key types it. Tapping Backspace deletes. */
  onType?: (char: string) => void;
  onBackspace?: () => void;
  className?: string;
  maxWidth?: string;
}

export const VintageKeyboard = ({
  variant = "vintage",
  embedded = false,
  compact = false,
  showIndicator,
  sound = true,
  highlightChar = null,
  listenWhileTyping = false,
  onType,
  onBackspace,
  className,
  maxWidth,
}: VintageKeyboardProps) => {
  const rows = useMemo(() => ROWS, []);
  const keyTriggersRef = useRef<Record<string, KeyTrigger>>({});
  const tier = useDeviceTier();
  const theme = THEMES[variant];
  const container = CONTAINER_TIERS[tier];
  const caseTier = CASE_TIERS[tier];
  const gap = KEY_GAP_TIERS[tier];
  const withIndicator = showIndicator ?? !embedded;

  useEffect(() => {
    setKeyboardSoundEnabled(sound);
  }, [sound]);

  const nextKeys = useMemo(() => {
    if (!highlightChar) return new Set<string>();
    const target = keyIdForChar(highlightChar);
    if (!target) return new Set<string>();
    const ids = new Set<string>([target.id]);
    if (target.shift) {
      // Point at the Shift on the opposite hand, which is the correct finger.
      ids.add(isLeftHalf(target.id) ? "rshift" : "lshift");
    }
    return ids;
  }, [highlightChar]);

  // Shift state for taps, so someone using the board with a mouse or a
  // touchscreen can still reach capitals and the symbol row. Held in a ref as
  // well: a Shift tap and the letter tap after it can land in the same tick,
  // and the letter would otherwise read the pre-Shift value.
  const [shiftLatched, setShiftLatched] = useState(false);
  const shiftLatchedRef = useRef(false);

  const setShift = useCallback((next: boolean) => {
    shiftLatchedRef.current = next;
    setShiftLatched(next);
  }, []);

  const handleTap = useCallback(
    (id: string) => {
      if (id === "backspace") {
        onBackspace?.();
        return;
      }
      if (id === "lshift" || id === "rshift") {
        setShift(!shiftLatchedRef.current);
        return;
      }
      if (!onType) return;

      const pair = KEY_ID_TO_CHAR[id];
      if (!pair) return;
      onType(shiftLatchedRef.current ? pair.upper : pair.lower);
      if (shiftLatchedRef.current) setShift(false);
    },
    [onType, onBackspace, setShift],
  );

  const registerTrigger = useCallback((id: string, trigger: KeyTrigger) => {
    keyTriggersRef.current[id] = trigger;
    return () => {
      if (keyTriggersRef.current[id] === trigger)
        delete keyTriggersRef.current[id];
    };
  }, []);

  const [activeKeyIds, setActiveKeyIds] = useState<string[]>([]);
  const [indicatorParts, setIndicatorParts] = useState<string[] | null>(null);
  const [indicatorVisible, setIndicatorVisible] = useState(true);
  const indicatorPartsRef = useRef<string[] | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    indicatorPartsRef.current = indicatorParts;
  }, [indicatorParts]);

  const activateKey = useCallback((id: string) => {
    setActiveKeyIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const deactivateKey = useCallback((id: string) => {
    setActiveKeyIds((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : prev,
    );
  }, []);

  useEffect(() => {
    if (!withIndicator) return;

    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (fadeTimeoutRef.current !== null) {
      window.clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    if (activeKeyIds.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIndicatorParts(getActiveKeyParts(activeKeyIds));
      setIndicatorVisible(true);
      return;
    }

    if (indicatorPartsRef.current !== null) {
      holdTimeoutRef.current = window.setTimeout(() => {
        setIndicatorVisible(false);
        fadeTimeoutRef.current = window.setTimeout(() => {
          setIndicatorParts(null);
          setIndicatorVisible(true);
        }, 220);
      }, 550);
    }
  }, [activeKeyIds, withIndicator]);

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current !== null)
        window.clearTimeout(holdTimeoutRef.current);
      if (fadeTimeoutRef.current !== null)
        window.clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const held = new Set<string>();

    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable;
    };

    const releaseKey = (id: string) => {
      if (!held.has(id)) return;
      held.delete(id);
      keyTriggersRef.current[id]?.release();
      deactivateKey(id);
    };

    const releaseAllHeld = () => {
      held.forEach((id) => {
        keyTriggersRef.current[id]?.release();
        deactivateKey(id);
      });
      held.clear();
    };

    const reconcileModifiers = (event: KeyboardEvent) => {
      if (typeof event.getModifierState !== "function") return;
      for (const { modifier, ids } of MODIFIER_FAMILIES) {
        if (!event.getModifierState(modifier)) {
          for (const id of ids) releaseKey(id);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      reconcileModifiers(event);

      // In embedded mode the page owns Alt; hijacking it would break the app.
      if (!embedded && (event.code === "AltLeft" || event.code === "AltRight")) {
        event.preventDefault();
      }

      if (event.repeat) return;
      if (!listenWhileTyping && isTypingTarget(event.target)) return;

      const id = CODE_TO_KEY_ID[event.code];
      if (!id || held.has(id)) return;

      // Inside the gesture, before any promise runs.
      unlockKeyboardAudio();

      held.add(id);
      keyTriggersRef.current[id]?.press();
      activateKey(id);

      const config = ALL_KEYS_BY_ID[id];
      playKeySound(getSoundCategory(id), !!config?.muted, KEY_PAN[id] ?? 0);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      reconcileModifiers(event);

      const id = CODE_TO_KEY_ID[event.code];
      if (!id) return;
      releaseKey(id);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) releaseAllHeld();
    };

    const handleFocus = () => releaseAllHeld();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", releaseAllHeld);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releaseAllHeld);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activateKey, deactivateKey, embedded, listenWhileTyping]);

  return (
    <div
      className={[
        embedded ? "" : "kb-viewport",
        "flex w-full items-center justify-center overflow-x-hidden",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        padding: embedded ? 0 : container.padding,
        background: embedded ? "transparent" : theme.pageBackground,
      }}
      // The board is a visual aid next to the real text field, so it stays out
      // of the screen reader's way. It is not marked inert: taps have to keep
      // working, which is the whole point of an on screen keyboard.
      aria-hidden={embedded || undefined}
    >
      <style>{KEY_STYLE_TAG}</style>
      <div
        className="flex flex-col items-center"
        style={{ width: "100%", maxWidth: maxWidth ?? container.maxWidth }}
      >
        {withIndicator && (
          <div
            className="flex items-center justify-center"
            style={{
              marginBottom: "clamp(0.65rem, 2.2vw, 1.15rem)",
              minHeight: "clamp(1.6rem, 3vw, 1.9rem)",
              fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
            }}
          >
            <div
              style={{
                opacity: indicatorVisible ? 1 : 0,
                transition: "opacity 220ms ease-out",
              }}
            >
              {indicatorParts && indicatorParts.length > 0 ? (
                <div
                  className="flex items-center justify-center"
                  style={{ gap: "5px" }}
                >
                  {indicatorParts.map((part, i) => (
                    <Fragment key={`${part}-${i}`}>
                      {i > 0 && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 500,
                            color: theme.indicatorText,
                            lineHeight: 1,
                          }}
                        >
                          +
                        </span>
                      )}
                      <kbd
                        style={{
                          fontFamily: "inherit",
                          fontSize: "clamp(0.72rem, 1.3vw, 0.82rem)",
                          fontWeight: 600,
                          lineHeight: 1,
                          color: theme.indicatorKeyInk,
                          background: theme.indicatorKeyBg,
                          border: `1px solid ${theme.indicatorKeyBorder}`,
                          borderRadius: "6px",
                          padding: "5px 8px",
                          boxShadow:
                            "0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03)",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {part}
                      </kbd>
                    </Fragment>
                  ))}
                </div>
              ) : (
                <span
                  style={{
                    fontSize: "clamp(0.8rem, 1.5vw, 0.9rem)",
                    fontWeight: 500,
                    letterSpacing: "0.01em",
                    color: theme.indicatorText,
                  }}
                >
                  Press any key...
                </span>
              )}
            </div>
          </div>
        )}
        <div
          style={{
            perspective: "1800px",
            width: "100%",
          }}
        >
          <div
            className="relative w-full"
            style={{ transform: "rotateX(7deg)", transformOrigin: "50% 100%" }}
          >
            <div
              className="absolute inset-x-[16%] top-[99%] -z-10 h-1 rounded-full blur-[1.5px]"
              style={{ background: "rgba(15,10,6,0.2)" }}
            />
            <div
              className="absolute -inset-x-2 top-14 bottom-0 -z-10 rounded-[1.5rem] blur-lg"
              style={{
                background:
                  "radial-gradient(55% 70% at 50% 82%, rgba(15,10,6,0.06), transparent 72%)",
              }}
            />
            <div
              className="relative rounded-[var(--kb-case-radius)]"
              style={
                {
                  padding: caseTier.casePadding,
                  background: theme.caseBackground,
                  boxShadow: theme.caseShadow,
                  "--kb-case-radius": caseTier.caseRadius,
                  "--kb-bezel-radius": caseTier.bezelRadius,
                } as CSSProperties
              }
            >
              {theme.woodTextures && (
                <>
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[var(--kb-case-radius)] mix-blend-multiply"
                    style={{
                      backgroundImage: `url("${WOOD_TONE_URI}")`,
                      backgroundSize: "520px 520px",
                      opacity: 0.46,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[var(--kb-case-radius)] mix-blend-multiply"
                    style={{
                      backgroundImage: `url("${WOOD_GRAIN_URI}")`,
                      backgroundSize: "460px 460px",
                      opacity: 0.5,
                    }}
                  />

                  <div
                    className="pointer-events-none absolute inset-0 rounded-[var(--kb-case-radius)] mix-blend-multiply"
                    style={{
                      backgroundImage: `url("${WOOD_GRAIN_FINE_URI}")`,
                      backgroundSize: "300px 300px",
                      backgroundPosition: "23px 11px",
                      opacity: 0.24,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0 rounded-(--kb-case-radius) mix-blend-overlay"
                    style={{
                      background:
                        "repeating-linear-gradient(179deg, rgba(255,228,192,0.065) 0px, transparent 3px, transparent 17px, rgba(45,23,7,0.1) 20px, transparent 29px), repeating-linear-gradient(183deg, rgba(255,228,192,0.032) 0px, transparent 7px, transparent 41px, rgba(45,23,7,0.055) 44px, transparent 59px)",
                      opacity: 0.58,
                    }}
                  />

                  <div
                    className="pointer-events-none absolute inset-0 rounded-(--kb-case-radius) mix-blend-multiply"
                    style={{
                      backgroundImage: `url("${WOOD_PORE_URI}")`,
                      backgroundSize: "130px 130px",
                      opacity: 0.34,
                    }}
                  />

                  <div
                    className="pointer-events-none absolute inset-0 rounded-(--kb-case-radius) mix-blend-screen"
                    style={{
                      backgroundImage: `url("${WOOD_MICROSCRATCH_URI}")`,
                      backgroundSize: "620px 420px",
                      opacity: 0.5,
                    }}
                  />

                  <div
                    className="pointer-events-none absolute inset-0 rounded-(--kb-case-radius)"
                    style={{
                      backgroundImage: `url("${WOOD_DENT_URI}")`,
                      backgroundSize: "100% 100%",
                      opacity: 0.28,
                    }}
                  />

                  <div
                    className="pointer-events-none absolute rounded-tl-(--kb-case-radius) mix-blend-multiply"
                    style={{
                      left: 0,
                      top: 0,
                      width: "9%",
                      height: "18%",
                      backgroundImage: `url("${END_GRAIN_URI}")`,
                      backgroundSize: "80px 80px",
                      opacity: 0.56,
                      maskImage:
                        "radial-gradient(ellipse at top left, black, transparent 75%)",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute rounded-br-(--kb-case-radius) mix-blend-multiply"
                    style={{
                      right: 0,
                      bottom: 0,
                      width: "10%",
                      height: "20%",
                      backgroundImage: `url("${END_GRAIN_URI}")`,
                      backgroundSize: "80px 80px",
                      opacity: 0.5,
                      maskImage:
                        "radial-gradient(ellipse at bottom right, black, transparent 75%)",
                    }}
                  />
                </>
              )}

              <div
                className="pointer-events-none absolute inset-0 rounded-(--kb-case-radius)"
                style={{
                  background:
                    "linear-gradient(112deg, transparent 30%, rgba(255,244,222,0.06) 44%, rgba(255,244,222,0.1) 49%, rgba(255,244,222,0.05) 54%, transparent 68%)",
                  mixBlendMode: "screen",
                }}
              />

              <div
                className="pointer-events-none absolute inset-0 rounded-(--kb-case-radius)"
                style={{
                  background:
                    "radial-gradient(85% 50% at 38% -8%, rgba(255,240,210,0.15), transparent 42%)",
                }}
              />

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[var(--kb-case-radius)]"
                style={{
                  height: "14%",
                  background:
                    "linear-gradient(180deg, transparent 0%, rgba(250,248,244,0.05) 100%)",
                  mixBlendMode: "screen",
                }}
              />

              <div
                className="pointer-events-none absolute inset-0 rounded-[var(--kb-case-radius)]"
                style={{ boxShadow: theme.caseEdge }}
              />
              <div
                className="relative rounded-[var(--kb-bezel-radius)]"
                style={{
                  padding: caseTier.bezelPadding,
                  background: theme.bezelBackground,
                  boxShadow: theme.bezelShadow,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 rounded-[var(--kb-bezel-radius)]"
                  style={{ background: theme.bezelSheen, zIndex: 0 }}
                />
                <div className="relative z-10 flex flex-col" style={{ gap }}>
                  {rows.map((row, i) => (
                    <div key={i} className="flex" style={{ gap }}>
                      {row.map((key) => (
                        <Key
                          key={key.id}
                          config={key}
                          rowIndex={i}
                          tier={tier}
                          theme={theme}
                          compact={compact}
                          isNext={
                            nextKeys.has(key.id) ||
                            (shiftLatched && (key.id === "lshift" || key.id === "rshift"))
                          }
                          registerTrigger={registerTrigger}
                          onActivate={activateKey}
                          onDeactivate={deactivateKey}
                          onTap={handleTap}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LEFT_HALF = new Set([
  "1", "2", "3", "4", "5",
  "q", "w", "e", "r", "t",
  "a", "s", "d", "f", "g",
  "z", "x", "c", "v", "b",
  "esc", "tab", "caps", "lshift", "lctrl", "lwin", "lalt",
]);

function isLeftHalf(id: string) {
  return LEFT_HALF.has(id);
}

/** Kept for parity with the original demo, which imports `Component`. */
export const Component = VintageKeyboard;

export default VintageKeyboard;
