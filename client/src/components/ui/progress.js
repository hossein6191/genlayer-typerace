import { jsx as _jsx } from "react/jsx-runtime";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
export function Progress({ className, value = 0, indicatorClassName, ...props }) {
    return (_jsx(ProgressPrimitive.Root, { "data-slot": "progress", className: cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-3", className), value: value, ...props, children: _jsx(ProgressPrimitive.Indicator, { className: cn("h-full w-full flex-1 rounded-full bg-[linear-gradient(90deg,var(--color-gl-pink),var(--color-gl-purple))] transition-transform duration-200 ease-out", indicatorClassName), style: { transform: `translateX(-${100 - (value ?? 0)}%)` } }) }));
}
