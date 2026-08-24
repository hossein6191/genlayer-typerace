import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Defaults to manual activation. Radix activates on focus by default, which is
 * dangerous here: a stray keystroke while the typing field has lost focus could
 * silently change the difficulty or the game mode mid-session.
 */
export function Tabs({
  activationMode = "manual",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root activationMode={activationMode} {...props} />;
}

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1 rounded-md border border-border bg-surface/70 p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded px-3 py-1 text-xs font-semibold text-muted-foreground transition-all",
        "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gl-purple/50",
        "data-[state=active]:bg-gl-purple/18 data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_0_0_1px_var(--color-gl-purple)]",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("mt-4 focus-visible:outline-none", className)}
      {...props}
    />
  );
}
