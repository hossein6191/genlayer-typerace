import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { Delete, Keyboard, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
/**
 * Anything above U+024F is outside the Latin alphabet and its extensions, so a
 * character up there in a passage made of English cannot be a typo. It means
 * the keyboard is producing a different script entirely.
 */
function isNonLatin(char) {
    const code = char.codePointAt(0) ?? 0;
    return code > 0x024f;
}
function scriptName(char) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x0600 && code <= 0x06ff)
        return "Arabic or Persian";
    if (code >= 0x0400 && code <= 0x04ff)
        return "Cyrillic";
    if (code >= 0x0370 && code <= 0x03ff)
        return "Greek";
    if (code >= 0x0590 && code <= 0x05ff)
        return "Hebrew";
    if (code >= 0x4e00 && code <= 0x9fff)
        return "Chinese";
    if (code >= 0x3040 && code <= 0x30ff)
        return "Japanese";
    if (code >= 0xac00 && code <= 0xd7af)
        return "Korean";
    return "another script";
}
export function TypingHint({ text, typed, wrongTrail, blocked, className }) {
    const hint = useMemo(() => {
        if (wrongTrail === 0)
            return null;
        // Look only at the characters that are actually wrong right now.
        const start = typed.length - wrongTrail;
        const wrong = typed.slice(Math.max(0, start));
        const foreign = [...wrong].find(isNonLatin);
        if (foreign) {
            return {
                tone: "warn",
                icon: _jsx(Keyboard, { className: "size-4" }),
                title: `Your keyboard is typing ${scriptName(foreign)}`,
                body: "The passage is in English, so switch your input language and the letters will start matching",
            };
        }
        if (blocked) {
            return {
                tone: "bad",
                icon: _jsx(TriangleAlert, { className: "size-4" }),
                title: "Typing is paused until the mistakes are fixed",
                body: "Press Backspace to clear the highlighted characters, then carry on",
            };
        }
        return null;
    }, [typed, wrongTrail, blocked]);
    if (!hint)
        return null;
    return (_jsxs("div", { role: "status", className: cn("flex items-start gap-3 rounded-md border px-4 py-3", hint.tone === "warn" ? "border-warn/40 bg-warn/8 text-warn" : "border-bad/40 bg-bad/8 text-bad", className), children: [_jsx("span", { className: "mt-px shrink-0", children: hint.icon }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm font-semibold", children: hint.title }), _jsx("p", { className: "mt-0.5 text-xs leading-relaxed opacity-90", children: hint.body })] }), blocked && (_jsxs("kbd", { className: "ml-auto hidden shrink-0 items-center gap-1 self-center rounded border border-current/40 px-2 py-1 text-[10px] font-bold sm:flex", children: [_jsx(Delete, { className: "size-3" }), "Backspace"] })), _jsxs("span", { className: "sr-only", children: [text.length, " characters in this passage"] })] }));
}
