import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap ui-control ui-focus rounded-md text-base font-medium transition-colors duration-(--ui-motion-fast) cursor-pointer  disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0  ui-focus aria-invalid:border-error",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 ",
        outline:
          "border border-border-strong bg-background hover:bg-surface-subtle",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-surface-subtle",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "px-4 has-[>svg]:px-3",
        xs: "gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "rounded-md px-6 has-[>svg]:px-4",
        icon: "",
        "icon-xs": "rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "",
        "icon-lg": "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
