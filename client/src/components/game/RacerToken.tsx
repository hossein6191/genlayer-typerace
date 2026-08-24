import { cn } from "@/lib/utils";

interface RacerTokenProps {
  /** 0..1 — drives exhaust length and wheel spin. */
  speed: number;
  boosting?: boolean;
  finished?: boolean;
  isMe?: boolean;
  /** A pace car rather than a person: outline only, so it cannot be mistaken. */
  ghost?: boolean;
  hue: string;
  className?: string;
}

/**
 * The racer.
 *
 * It reads as a side-view car, and the cockpit is the GenLayer Strong Mark —
 * the triangle from the brand guidelines, which is described there as "hands
 * holding and giving". Speed lengthens the exhaust and spins the wheels; a
 * Consensus Boost lights the whole shell.
 */
export function RacerToken({
  speed,
  boosting = false,
  finished = false,
  isMe = false,
  ghost = false,
  hue,
  className,
}: RacerTokenProps) {
  const trail = Math.min(1, Math.max(0, speed));
  const spinDuration = 1.1 - trail * 0.85;

  return (
    <div className={cn("relative flex items-center", className)} aria-hidden>
      {/* Exhaust — three tapering streaks that grow with speed. */}
      <div
        className="pointer-events-none absolute right-full top-1/2 flex -translate-y-1/2 flex-col gap-[3px] pr-1"
        style={{ opacity: 0.25 + trail * 0.75 }}
      >
        {[0.62, 1, 0.75].map((scale, i) => (
          <span
            key={i}
            className="block h-[2px] rounded-full"
            style={{
              width: `${(8 + trail * 42) * scale}px`,
              background: `linear-gradient(270deg, ${hue}, transparent)`,
              filter: boosting ? `drop-shadow(0 0 6px ${hue})` : undefined,
            }}
          />
        ))}
      </div>

      <svg
        viewBox="0 0 64 34"
        className={cn(
          "relative h-[26px] w-[49px] shrink-0 transition-[filter] duration-200 sm:h-[30px] sm:w-[56px]",
          boosting && "drop-shadow-[0_0_12px_var(--color-gl-pink)]",
        )}
        style={{
          filter: finished ? "saturate(1.15)" : undefined,
        }}
      >
        <defs>
          <linearGradient id={`body-${hue.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={hue} stopOpacity="0.95" />
            <stop offset="100%" stopColor={hue} stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Chassis: a forward-leaning wedge. */}
        <path
          d="M3 24 L10 13 Q13 9 19 9 L37 9 Q43 9 48 13 L60 20 Q62 21 62 24 L62 26 Q62 28 60 28 L5 28 Q3 28 3 26 Z"
          fill={ghost ? "none" : `url(#body-${hue.replace(/[^a-z0-9]/gi, "")})`}
          stroke={hue}
          strokeWidth="1.1"
          strokeLinejoin="round"
          strokeDasharray={ghost ? "3 2" : undefined}
        />

        {/* Canopy */}
        {!ghost && (
          <path
            d="M17 12 L34 12 Q39 12 43 15 L44 16 L18 16 Q16 16 16 14 Z"
            fill="rgba(255,255,255,0.28)"
          />
        )}

        {/* GenLayer Strong Mark as the emblem on the door. */}
        <g transform="translate(22.5 17.5) scale(0.115)" opacity={ghost ? 0.5 : 1}>
          <polygon points="44.26 32.35 27.72 67.12 43.29 74.9 0 91.93 44.26 0 44.26 32.35" fill="#fff" />
          <polygon points="53.5 32.35 70.04 67.12 54.47 74.9 97.76 91.93 53.5 0 53.5 32.35" fill="#fff" />
          <polygon
            points="48.64 43.78 58.33 62.94 48.64 67.69 39.47 62.92 48.64 43.78"
            fill={hue}
          />
        </g>

        {/* Wheels */}
        {[
          { cx: 17, cy: 27 },
          { cx: 49, cy: 27 },
        ].map((w) => (
          <g key={w.cx}>
            <circle cx={w.cx} cy={w.cy} r="6" fill="#0A0C1A" stroke={hue} strokeWidth="1.4" />
            <g
              style={{
                transformOrigin: `${w.cx}px ${w.cy}px`,
                animation:
                  trail > 0.02 ? `spin ${spinDuration.toFixed(2)}s linear infinite` : undefined,
              }}
            >
              <line
                x1={w.cx - 3.4}
                y1={w.cy}
                x2={w.cx + 3.4}
                y2={w.cy}
                stroke={hue}
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.8"
              />
              <line
                x1={w.cx}
                y1={w.cy - 3.4}
                x2={w.cx}
                y2={w.cy + 3.4}
                stroke={hue}
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.45"
              />
            </g>
          </g>
        ))}
      </svg>

      {isMe && (
        <span
          className="pointer-events-none absolute -top-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full"
          style={{ background: hue, boxShadow: `0 0 8px ${hue}` }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { svg g[style*="animation"] { animation: none !important; } }`}</style>
    </div>
  );
}
