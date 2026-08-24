import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
/**
 * The GenLayer Strong Mark, inlined so it can be tinted and animated.
 * Geometry is taken verbatim from Logo/SVG/GenLayer_Mark_White.svg in the
 * brand kit — do not redraw it by hand (Brand Guidelines, section 02).
 */
export function StrongMark({ className, glow }) {
    return (_jsxs("svg", { viewBox: "0 0 97.76 91.93", className: cn("size-6", className), role: "img", "aria-label": "GenLayer", style: glow ? { filter: "drop-shadow(0 0 10px var(--color-gl-purple))" } : undefined, children: [_jsx("polygon", { points: "44.26 32.35 27.72 67.12 43.29 74.9 0 91.93 44.26 0 44.26 32.35", fill: "currentColor" }), _jsx("polygon", { points: "53.5 32.35 70.04 67.12 54.47 74.9 97.76 91.93 53.5 0 53.5 32.35", fill: "currentColor" }), _jsx("polygon", { points: "48.64 43.78 58.33 62.94 48.64 67.69 39.47 62.92 48.64 43.78", fill: "var(--color-gl-pink)" })] }));
}
export function BrandLockup({ className }) {
    // GenLayer_Logo_White_Cropped.svg is the full logotype: the Strong Mark and
    // the wordmark together, spaced to the grid in the brand guidelines. Placing
    // a separate mark next to it would show the triangle twice.
    return (_jsxs("span", { className: cn("flex flex-col leading-none", className), children: [_jsx("img", { src: "/brand/svg/GenLayer_Logo_White_Cropped.svg", alt: "GenLayer", className: "h-[17px] w-auto", width: 385, height: 92 }), _jsx("span", { className: "mt-1.5 pl-[2.4rem] text-[9px] font-bold uppercase tracking-[0.34em] text-gl-purple", children: "TypeRace" })] }));
}
