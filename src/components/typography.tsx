import * as React from "react";
import { cn } from "@/lib/utils";

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  children: React.ReactNode;
};

export const pageTitleClass =
  "text-foreground text-3xl font-semibold leading-tight";

export const sectionTitleClass = "text-foreground text-xl font-semibold";

export function PageTitle({ className, children, ...props }: HeadingProps) {
  return (
    <h1 className={cn(pageTitleClass, className)} {...props}>
      {children}
    </h1>
  );
}

export function SectionTitle({ className, children, ...props }: HeadingProps) {
  return (
    <h2 className={cn(sectionTitleClass, className)} {...props}>
      {children}
    </h2>
  );
}
