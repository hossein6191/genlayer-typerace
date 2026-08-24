import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface CountdownProps {
  /** Local-clock timestamp when the race unlocks. */
  startsAtLocal: number;
  onDone?: () => void;
}

/**
 * Full-surface countdown. Numbers land with a spring, then the word GO clears
 * the way. Reduced-motion users get the same information without the scaling.
 */
export function Countdown({ startsAtLocal, onDone }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => startsAtLocal - Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = startsAtLocal - Date.now();
      setRemaining(next);
      if (next <= 0) {
        window.clearInterval(id);
        onDone?.();
      }
    }, 60);
    return () => window.clearInterval(id);
  }, [startsAtLocal, onDone]);

  if (remaining <= -900) return null;

  const seconds = Math.ceil(remaining / 1000);
  const label = remaining <= 0 ? "GO" : String(Math.max(1, seconds));

  return (
    <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center rounded-lg bg-background/78 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={label}
            initial={{ opacity: 0, scale: 0.55, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.5, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="gl-gradient-text text-[clamp(4rem,16vw,9rem)] font-extrabold leading-none tracking-tight"
          >
            {label}
          </motion.span>
        </AnimatePresence>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          {remaining <= 0 ? "Go" : "Get ready"}
        </p>
      </div>
    </div>
  );
}
