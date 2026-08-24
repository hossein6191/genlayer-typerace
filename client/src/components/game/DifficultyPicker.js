import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
export function DifficultyPicker({ options, value, onChange, disabled, className, }) {
    return (_jsx("div", { className: cn("grid gap-3 sm:grid-cols-3", className), role: "radiogroup", "aria-label": "Difficulty", children: options.map((option) => {
            const selected = option.id === value;
            return (_jsxs("button", { type: "button", role: "radio", "aria-checked": selected, disabled: disabled, onClick: () => onChange(option.id), className: cn("group relative cursor-pointer overflow-hidden rounded-lg border p-4 text-left transition-all duration-200", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gl-purple/70", "disabled:cursor-not-allowed disabled:opacity-45", selected
                    ? "border-transparent bg-surface-2"
                    : "border-border bg-surface/60 hover:border-border-strong hover:bg-surface-2/70"), style: selected
                    ? { boxShadow: `inset 0 0 0 1px ${option.accent}, 0 12px 40px -22px ${option.accent}` }
                    : undefined, children: [_jsx("span", { "aria-hidden": true, className: "pointer-events-none absolute inset-x-0 top-0 h-px opacity-70", style: { background: `linear-gradient(90deg, transparent, ${option.accent}, transparent)` } }), _jsxs("div", { className: "mb-1.5 flex items-center justify-between gap-2", children: [_jsx("span", { className: "text-[10px] font-bold uppercase tracking-[0.2em]", style: { color: option.accent }, children: option.label }), selected && _jsx(Check, { className: "size-3.5", style: { color: option.accent } })] }), _jsx("p", { className: "text-base font-semibold leading-tight", children: option.codename }), _jsx("p", { className: "mt-1.5 text-xs leading-relaxed text-muted-foreground", children: option.blurb })] }, option.id));
        }) }));
}
