import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function Card({ className, ...props }) {
    return (_jsx("div", { "data-slot": "card", className: cn("gl-panel rounded-lg text-foreground shadow-[0_24px_60px_-40px_#000]", className), ...props }));
}
export function CardHeader({ className, ...props }) {
    return _jsx("div", { "data-slot": "card-header", className: cn("flex flex-col gap-1.5 p-5", className), ...props });
}
export function CardTitle({ className, ...props }) {
    return (_jsx("h3", { "data-slot": "card-title", className: cn("text-base font-semibold leading-tight tracking-tight", className), ...props }));
}
export function CardDescription({ className, ...props }) {
    return (_jsx("p", { "data-slot": "card-description", className: cn("text-sm text-muted-foreground leading-relaxed", className), ...props }));
}
export function CardContent({ className, ...props }) {
    return _jsx("div", { "data-slot": "card-content", className: cn("p-5 pt-0", className), ...props });
}
export function CardFooter({ className, ...props }) {
    return (_jsx("div", { "data-slot": "card-footer", className: cn("flex items-center gap-3 p-5 pt-0", className), ...props }));
}
