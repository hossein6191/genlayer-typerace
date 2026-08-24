import { jsx as _jsx } from "react/jsx-runtime";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export function TooltipContent({ className, sideOffset = 6, ...props }) {
    return (_jsx(TooltipPrimitive.Portal, { children: _jsx(TooltipPrimitive.Content, { sideOffset: sideOffset, className: cn("z-50 max-w-xs rounded-md border border-border-strong bg-surface-2 px-2.5 py-1.5 text-xs text-foreground shadow-xl", className), ...props }) }));
}
