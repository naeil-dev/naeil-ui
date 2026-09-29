"use client";
import * as React from "react";
import { Switch as Primitive } from "radix-ui";
import { cn } from "../../lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Root>) {
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
