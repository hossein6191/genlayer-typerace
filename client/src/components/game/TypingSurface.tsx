import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CharState } from "@/hooks/useTypingEngine";
import { cn } from "@/lib/utils";

interface TypingSurfaceProps {
  text: string;
  charStates: CharState[];
  /** Index of the caret — equal to the number of characters committed. */
  cursor: number;
  /** Dim the passage and show a hint while typing is not allowed. */
  locked?: boolean;
  lockedHint?: string;
  onFocusRequest?: () => void;
  focused?: boolean;
  /** How many text lines stay visible before it scrolls. */
  visibleLines?: number;
  className?: string;
}

interface CaretBox {
  left: number;
  top: number;
  height: number;
}

/**
 * Splits the passage into renderable chunks that never break a word across a
 * line, while still honouring the explicit newlines that code passages use.
 */
function chunk(text: string) {
  const out: Array<{ kind: "word" | "break"; start: number; value: string }> = [];
  let buffer = "";
  let start = 0;

  const flush = () => {
    if (buffer) {
      out.push({ kind: "word", start, value: buffer });
      buffer = "";
    }
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n") {
      flush();
      out.push({ kind: "break", start: i, value: "\n" });
      start = i + 1;
      continue;
    }
    if (!buffer) start = i;
    buffer += ch;
    if (ch === " ") {
      flush();
      start = i + 1;
    }
  }
  flush();
  return out;
}

export function TypingSurface({
  text,
  charStates,
  cursor,
  locked = false,
  lockedHint,
  onFocusRequest,
  focused = true,
  visibleLines = 4,
  className,
}: TypingSurfaceProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const caretAnchorRef = useRef<HTMLSpanElement | null>(null);
  const [caret, setCaret] = useState<CaretBox | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [lineHeight, setLineHeight] = useState(0);

  const chunks = useCallback(() => chunk(text), [text])();

  // Position the caret and keep the active line inside the viewport. Measured
  // rather than styled so it lands exactly on the glyph, including inside the
  // proportional gaps of a code passage.
  useLayoutEffect(() => {
    const anchor = caretAnchorRef.current;
    const content = contentRef.current;
    if (!anchor || !content) return;

    const a = anchor.getBoundingClientRect();
    const c = content.getBoundingClientRect();
    const box = { left: a.left - c.left, top: a.top - c.top, height: a.height };
    setCaret(box);
    setLineHeight(a.height);

    const viewport = viewportRef.current;
    if (!viewport) return;
    const viewportHeight = viewport.clientHeight;
    const caretBottom = box.top + box.height;

    setScrollTop((prev) => {
      // Keep one line of lead-in above the caret so the eye has context.
      const lead = box.height;
      if (box.top - prev < lead) return Math.max(0, box.top - lead);
      if (caretBottom - prev > viewportHeight - lead) {
        return caretBottom - viewportHeight + lead;
      }
      return prev;
    });
  }, [cursor, text]);

  useEffect(() => {
    setScrollTop(0);
  }, [text]);

  const minHeight = lineHeight ? lineHeight * visibleLines : undefined;

  return (
    <div
      className={cn("relative", className)}
      onMouseDown={(e) => {
        // Clicking the passage should hand focus back to the hidden input
        // without the browser trying to place a text selection.
        e.preventDefault();
        onFocusRequest?.();
      }}
    >
      <div
        ref={viewportRef}
        className="relative overflow-hidden"
        style={{ height: minHeight, minHeight: minHeight ?? "9rem" }}
      >
        <div
          ref={contentRef}
          className={cn(
            "relative font-mono text-[clamp(0.95rem,2.1vw,1.35rem)] leading-[1.85] tracking-[0.01em]",
            "transition-transform duration-200 ease-out",
            locked && "blur-[3px] opacity-35 select-none",
          )}
          style={{ transform: `translateY(${-scrollTop}px)` }}
          aria-hidden={locked}
        >
          {/* The caret rides above the glyphs so it can move smoothly. */}
          {caret && !locked && (
            <span
              className={cn(
                "pointer-events-none absolute z-10 w-[2px] rounded-full bg-gl-pink",
                "transition-[left,top] duration-[90ms] ease-out",
                focused ? "animate-[caret_1.05s_steps(1)_infinite]" : "opacity-30",
              )}
              style={{
                left: caret.left,
                top: caret.top + caret.height * 0.12,
                height: caret.height * 0.76,
                boxShadow: "0 0 10px 1px var(--color-gl-pink)",
              }}
            />
          )}

          {chunks.map((piece, pieceIndex) => {
            if (piece.kind === "break") {
              const isCaret = cursor === piece.start;
              return (
                <span key={`br-${pieceIndex}`} className="inline-block w-full">
                  {isCaret && <span ref={caretAnchorRef} className="inline-block w-0 align-middle" />}
                  <span className="text-muted-foreground/30 select-none">↵</span>
                  <br />
                </span>
              );
            }

            return (
              <span key={`w-${pieceIndex}`} className="inline-block whitespace-pre">
                {piece.value.split("").map((ch, i) => {
                  const index = piece.start + i;
                  const state = charStates[index] ?? "pending";
                  const isCaret = index === cursor;
                  return (
                    <span
                      key={index}
                      ref={isCaret ? caretAnchorRef : undefined}
                      data-state={state}
                      className={cn(
                        "relative transition-colors duration-75",
                        // Dim enough to read as "not yet typed", bright enough
                        // to clear the 4.5:1 contrast floor against the panel.
                        state === "pending" && "text-muted-foreground/70",
                        state === "correct" && "text-foreground",
                        state === "wrong" &&
                          "text-bad bg-bad/12 rounded-[3px] underline decoration-bad/70 decoration-2 underline-offset-[3px]",
                        state === "current" && "text-foreground",
                      )}
                    >
                      {ch === " " && state === "wrong" ? "␣" : ch}
                    </span>
                  );
                })}
              </span>
            );
          })}

          {/* Anchor for the caret once the passage is fully typed. */}
          {cursor >= text.length && (
            <span ref={caretAnchorRef} className="inline-block w-0" />
          )}
        </div>
      </div>

      {locked && lockedHint && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-full border border-border-strong bg-surface/90 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur">
            {lockedHint}
          </p>
        </div>
      )}

      {/* Fade the top and bottom edges so scrolled text does not clip harshly. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-surface to-transparent" />
    </div>
  );
}
