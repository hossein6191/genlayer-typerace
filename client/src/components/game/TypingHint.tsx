import { useMemo } from "react";
import { Delete, Keyboard, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface TypingHintProps {
  text: string;
  typed: string;
  /** Characters entered past the last correct one. */
  wrongTrail: number;
  /** True while input is being refused because the error trail is full. */
  blocked: boolean;
  className?: string;
}

/**
 * Anything above U+024F is outside the Latin alphabet and its extensions, so a
 * character up there in a passage made of English cannot be a typo. It means
 * the keyboard is producing a different script entirely.
 */
function isNonLatin(char: string) {
  const code = char.codePointAt(0) ?? 0;
  return code > 0x024f;
}

function scriptName(char: string) {
  const code = char.codePointAt(0) ?? 0;
  if (code >= 0x0600 && code <= 0x06ff) return "Arabic or Persian";
  if (code >= 0x0400 && code <= 0x04ff) return "Cyrillic";
  if (code >= 0x0370 && code <= 0x03ff) return "Greek";
  if (code >= 0x0590 && code <= 0x05ff) return "Hebrew";
  if (code >= 0x4e00 && code <= 0x9fff) return "Chinese";
  if (code >= 0x3040 && code <= 0x30ff) return "Japanese";
  if (code >= 0xac00 && code <= 0xd7af) return "Korean";
  return "another script";
}

export function TypingHint({ text, typed, wrongTrail, blocked, className }: TypingHintProps) {
  const hint = useMemo(() => {
    if (wrongTrail === 0) return null;

    // Look only at the characters that are actually wrong right now.
    const start = typed.length - wrongTrail;
    const wrong = typed.slice(Math.max(0, start));

    const foreign = [...wrong].find(isNonLatin);
    if (foreign) {
      return {
        tone: "warn" as const,
        icon: <Keyboard className="size-4" />,
        title: `Your keyboard is typing ${scriptName(foreign)}`,
        body: "The passage is in English, so switch your input language and the letters will start matching",
      };
    }

    if (blocked) {
      return {
        tone: "bad" as const,
        icon: <TriangleAlert className="size-4" />,
        title: "Typing is paused until the mistakes are fixed",
        body: "Press Backspace to clear the highlighted characters, then carry on",
      };
    }

    return null;
  }, [typed, wrongTrail, blocked]);

  if (!hint) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3",
        hint.tone === "warn" ? "border-warn/40 bg-warn/8 text-warn" : "border-bad/40 bg-bad/8 text-bad",
        className,
      )}
    >
      <span className="mt-px shrink-0">{hint.icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{hint.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed opacity-90">{hint.body}</p>
      </div>
      {blocked && (
        <kbd className="ml-auto hidden shrink-0 items-center gap-1 self-center rounded border border-current/40 px-2 py-1 text-[10px] font-bold sm:flex">
          <Delete className="size-3" />
          Backspace
        </kbd>
      )}
      {/* Referenced so the passage stays part of the contract even though the
          hint only needs to inspect what was entered. */}
      <span className="sr-only">{text.length} characters in this passage</span>
    </div>
  );
}
