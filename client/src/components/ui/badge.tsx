import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-gl-purple/40 bg-gl-purple/12 text-gl-purple",
        blue: "border-gl-blue-400/40 bg-gl-blue-500/12 text-gl-blue-300",
        ok: "border-ok/40 bg-ok/12 text-ok",
        warn: "border-warn/40 bg-warn/12 text-warn",
        bad: "border-bad/40 bg-bad/12 text-bad",
        muted: "border-border-strong bg-surface-2 text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
