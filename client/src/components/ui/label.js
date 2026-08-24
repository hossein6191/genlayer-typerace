import { jsx as _jsx } from "react/jsx-runtime";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";
export function Label({ className, ...props }) {
    return (_jsx(LabelPrimitive.Root, { "data-slot": "label", className: cn("text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground select-none", className), ...props }));
}
