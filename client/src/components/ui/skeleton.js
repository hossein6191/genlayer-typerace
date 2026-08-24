import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function Skeleton({ className, ...props }) {
    return (_jsx("div", { className: cn("animate-pulse rounded-md bg-[linear-gradient(90deg,var(--color-surface-2),var(--color-surface-3),var(--color-surface-2))] bg-[length:200%_100%]", className), ...props }));
}
