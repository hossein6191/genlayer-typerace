import { jsx as _jsx } from "react/jsx-runtime";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
export function Avatar({ className, ...props }) {
    return (_jsx(AvatarPrimitive.Root, { "data-slot": "avatar", className: cn("relative flex size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-border-strong", className), ...props }));
}
export function AvatarImage({ className, ...props }) {
    return (_jsx(AvatarPrimitive.Image, { "data-slot": "avatar-image", className: cn("aspect-square size-full object-cover", className), ...props }));
}
export function AvatarFallback({ className, ...props }) {
    return (_jsx(AvatarPrimitive.Fallback, { "data-slot": "avatar-fallback", className: cn("flex size-full items-center justify-center rounded-full bg-surface-3 text-[11px] font-bold uppercase text-muted-foreground", className), ...props }));
}
