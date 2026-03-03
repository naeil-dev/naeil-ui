import * as React from "react";
import { cn } from "@/lib/utils";

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  children: React.ReactNode;
};

export const pageTitleClass =
  "text-foreground text-4xl font-bold tracking-tight lg:text-5xl";

export const sectionTitleClass = "text-foreground text-lg font-bold";

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
