import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;
export function DialogOverlay({ className, ...props }) {
    return (_jsx(DialogPrimitive.Overlay, { "data-slot": "dialog-overlay", className: cn("fixed inset-0 z-50 bg-black/70 backdrop-blur-sm", "data-[state=open]:animate-in data-[state=closed]:animate-out", className), ...props }));
}
export function DialogContent({ className, children, showClose = true, ...props }) {
    return (_jsxs(DialogPortal, { children: [_jsx(DialogOverlay, {}), _jsxs(DialogPrimitive.Content, { "data-slot": "dialog-content", className: cn("gl-panel gl-panel-glow fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2", "rounded-xl p-6 shadow-[0_40px_120px_-40px_#000]", className), ...props, children: [children, showClose && (_jsx(DialogPrimitive.Close, { className: "absolute right-4 top-4 cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:ring-2 focus-visible:ring-gl-purple/60", "aria-label": "Close dialog", children: _jsx(X, { className: "size-4" }) }))] })] }));
}
export function DialogHeader({ className, ...props }) {
    return _jsx("div", { className: cn("mb-4 flex flex-col gap-1.5", className), ...props });
}
export function DialogFooter({ className, ...props }) {
    return _jsx("div", { className: cn("mt-6 flex flex-wrap justify-end gap-2", className), ...props });
}
export function DialogTitle({ className, ...props }) {
    return (_jsx(DialogPrimitive.Title, { className: cn("text-lg font-semibold tracking-tight", className), ...props }));
}
export function DialogDescription({ className, ...props }) {
    return (_jsx(DialogPrimitive.Description, { className: cn("text-sm leading-relaxed text-muted-foreground", className), ...props }));
}
