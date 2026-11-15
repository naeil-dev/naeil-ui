"use client";
import * as React from "react";
import { Switch as Primitive } from "radix-ui";
import { cn } from "../../lib/utils";

function Switch({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Primitive.Root>, "asChild">) {
  return (
    <Primitive.Root
      data-slot="switch"
      className={cn("ui-choice ui-focus", className)}
      {...props}
    >
      <Primitive.Thumb data-slot="switch-thumb" />
    </Primitive.Root>
  );
}
export { Switch };
