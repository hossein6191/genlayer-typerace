import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CharState } from "@/hooks/useTypingEngine";
import { cn } from "@/lib/utils";

interface TypingSurfaceProps {
  text: string;
  /** What the player actually entered, so a mistake can show their character. */
  typed?: string;
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
  width: number;
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
  typed = "",
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
    const box = {
      left: a.left - c.left,
      top: a.top - c.top,
      width: a.width,
      height: a.height,
    };
    setCaret(box);
    setLineHeight(a.height);

    const viewport = viewportRef.current;
    if (!viewport) return;

    // Follow the caret, but only when it has left the comfortable band. Inside
    // that band the reader keeps whatever position they scrolled to.
    const viewportHeight = viewport.clientHeight;
    const lead = box.height;
    const current = viewport.scrollTop;
    const caretBottom = box.top + box.height;

    if (box.top - current < lead) {
      viewport.scrollTop = Math.max(0, box.top - lead);
    } else if (caretBottom - current > viewportHeight - lead) {
      viewport.scrollTop = caretBottom - viewportHeight + lead;
    }
  }, [cursor, text]);

  useEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
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
        className="gl-passage-scroll relative overflow-y-auto overscroll-contain"
        style={{ height: minHeight, minHeight: minHeight ?? "9rem" }}
        // Reading ahead is allowed; the wheel must not be swallowed.
        onWheel={(e) => e.stopPropagation()}
      >
        <div
          ref={contentRef}
          className={cn(
            "relative font-mono text-[clamp(0.95rem,2.1vw,1.35rem)] leading-[1.85] tracking-[0.01em]",
            locked && "blur-[3px] opacity-35 select-none",
          )}
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
                // In the gap in front of the character, not on top of it. The
                // old glow washed over the left stroke of the very letter the
                // player was reading.
                left: caret.left - 1.5,
                top: caret.top + caret.height * 0.12,
                height: caret.height * 0.76,
                boxShadow: "0 0 5px 0 var(--color-gl-pink)",
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

            // The word the caret is inside gets an underline, so the eye can
            // find its place without hunting for a one pixel bar.
            const isCurrentWord =
              cursor >= piece.start && cursor < piece.start + piece.value.length;

            return (
              <span
                key={`w-${pieceIndex}`}
                className={cn(
                  "inline-block whitespace-pre",
                  isCurrentWord &&
                    "underline decoration-gl-purple/50 decoration-2 underline-offset-[6px]",
                )}
              >
                {piece.value.split("").map((ch, i) => {
                  const index = piece.start + i;
                  const state = charStates[index] ?? "pending";
                  const isCaret = index === cursor;
                  // On a mistake, show the character the player actually
                  // entered rather than the one the passage wanted. Showing the
                  // expected character hides the cause: someone typing in the
                  // wrong keyboard layout sees only red English letters and has
                  // no way to tell what their keyboard is really producing.
                  const entered = state === "wrong" ? typed[index] : undefined;
                  const glyph =
                    state === "wrong"
                      ? entered === " "
                        ? "␣"
                        : (entered ?? ch)
                      : ch;
                  // Typing a letter where a space belongs used to run the two
                  // words together on screen, so "enough for" read as
                  // "enoughffor" and the mistake looked like a rendering bug.
                  const swallowedSpace = state === "wrong" && ch === " " && entered !== " ";

                  return (
                    <span
                      key={index}
                      ref={isCaret ? caretAnchorRef : undefined}
                      data-state={state}
                      title={state === "wrong" ? `Expected "${ch === " " ? "space" : ch}"` : undefined}
                      className={cn(
                        "relative transition-colors duration-75",
                        // Dim enough to read as "not yet typed", bright enough
                        // to clear the 4.5:1 contrast floor against the panel.
                        state === "pending" && "text-muted-foreground/70",
                        state === "correct" && "text-foreground",
                        state === "wrong" &&
                          "text-bad bg-bad/15 rounded-[3px] underline decoration-bad/70 decoration-2 underline-offset-[3px]",
                        swallowedSpace && "outline outline-1 outline-bad/60",
                        // Not typed yet, so it reads as untyped. Lighting it
                        // made the passage look like it was typing itself.
                        state === "current" && "text-muted-foreground/70",
                      )}
                    >
                      {glyph}
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
