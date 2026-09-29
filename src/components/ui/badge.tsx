import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-sm border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none ui-focus aria-invalid:border-error transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        success: "bg-success-bg text-success border-transparent",
        warning: "bg-warning-bg text-warning border-transparent",
        error: "bg-error-bg text-error border-transparent",
        info: "bg-info-bg text-info border-transparent",
        default:
          "bg-primary text-primary-foreground border-transparent [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground border-transparent [a&]:hover:bg-secondary/80",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground border-transparent [a&]:hover:bg-destructive/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
