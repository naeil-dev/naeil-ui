"use client";
import * as React from "react";
import { Checkbox as Primitive } from "radix-ui";
import { CheckIcon, MinusIcon } from "lucide-react";
import { cn } from "../../lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      data-slot="checkbox"
      className={cn("ui-choice ui-focus group/checkbox", className)}
      {...props}
    >
      <Primitive.Indicator className="flex items-center justify-center">
        <CheckIcon className="size-3.5 group-data-[state=indeterminate]/checkbox:hidden" />
        <MinusIcon className="hidden size-3.5 group-data-[state=indeterminate]/checkbox:block" />
      </Primitive.Indicator>
    </Primitive.Root>
  );
}
export { Checkbox };
