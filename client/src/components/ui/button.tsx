import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[background,box-shadow,transform,color] duration-200 cursor-pointer select-none disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-gl-purple/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-gl-blue-600 text-white shadow-[0_8px_24px_-10px_var(--color-gl-blue)] hover:bg-gl-blue-500",
        gradient:
          "text-white shadow-[0_10px_30px_-12px_var(--color-gl-purple)] bg-[linear-gradient(100deg,var(--color-gl-pink),var(--color-gl-purple)_55%,var(--color-gl-blue-500))] bg-[length:180%_100%] bg-left hover:bg-right",
        outline:
          "border border-border-strong bg-surface-2/60 text-foreground hover:bg-surface-3 hover:border-gl-purple/60",
        ghost: "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
        danger: "bg-bad/90 text-white hover:bg-bad",
        success: "bg-ok/15 text-ok border border-ok/40 hover:bg-ok/25",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
