"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "../../lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("ui-tabs min-w-0", className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn("ui-tabs-list", className)} {...props} />;
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn(
    "ui-tabs-trigger ui-control ui-focus h-auto min-h-(--ui-control-height) w-max max-w-full shrink-0 whitespace-normal break-words rounded-md border-b-2 px-3 text-base leading-normal font-medium disabled:cursor-not-allowed disabled:opacity-50",
    className,
  )} {...props} />;
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("ui-focus min-w-0 break-words", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
