import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[linear-gradient(90deg,var(--color-surface-2),var(--color-surface-3),var(--color-surface-2))] bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}
