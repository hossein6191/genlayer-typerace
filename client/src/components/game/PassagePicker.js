import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Loader2, Shuffle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
/**
 * Choose the exact text a race will run on, or leave it on random so a group
 * racing several rounds gets something new each time.
 */
export function PassagePicker({ difficulty, value, onChange, className }) {
    const [passages, setPassages] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        api
            .passages(difficulty)
            .then((list) => !cancelled && setPassages(list))
            .catch(() => !cancelled && setPassages([]))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [difficulty]);
    return (_jsxs("div", { className: cn("flex flex-col gap-1.5", className), children: [_jsxs(Label, { htmlFor: "passage-picker", children: ["Passage", _jsx("span", { className: "ml-2 font-normal normal-case tracking-normal text-muted-foreground", children: loading ? "loading" : `${passages.length} in this tier` })] }), _jsxs("div", { className: "relative", children: [loading && (_jsx(Loader2, { className: "pointer-events-none absolute right-8 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" })), _jsxs("select", { id: "passage-picker", value: value ?? "", disabled: loading, onChange: (e) => onChange(e.target.value || null), className: cn("h-9 w-full cursor-pointer appearance-none rounded-md border border-border bg-surface/80 px-3 pr-8 text-xs text-foreground", "focus-visible:border-gl-purple/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gl-purple/25", "disabled:cursor-not-allowed disabled:opacity-50"), children: [_jsx("option", { value: "", children: "Random each round" }), passages.map((p) => (_jsxs("option", { value: p.id, children: [p.title, " (", p.chars, " chars)"] }, p.id)))] }), _jsx("svg", { "aria-hidden": true, viewBox: "0 0 12 12", className: "pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-muted-foreground", children: _jsx("path", { d: "M2 4.5 6 8.5 10 4.5", fill: "none", stroke: "currentColor", strokeWidth: "1.6" }) })] }), !value && (_jsxs("p", { className: "flex items-center gap-1.5 text-[11px] text-muted-foreground", children: [_jsx(Shuffle, { className: "size-3" }), "Every round draws a different text"] }))] }));
}
