import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-surface/80 px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground/70 transition-colors",
        "focus-visible:outline-none focus-visible:border-gl-purple/70 focus-visible:ring-2 focus-visible:ring-gl-purple/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
