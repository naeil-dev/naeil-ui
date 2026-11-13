import * as React from "react";
import { cn } from "@/lib/utils";

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  children: React.ReactNode;
};

export const pageTitleClass =
  "text-foreground text-3xl font-semibold";

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

type PageHeaderProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Page-level actions, aligned to the end and wrapping below on narrow screens. */
  actions?: React.ReactNode;
  titleId?: string;
};

/** Shared page header: 32/42 title, 12px gap, 16/25 secondary description, 32px before content. */
export function PageHeader({ title, description, actions, titleId, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("ui-page-header", className)} {...props}>
      <div className="ui-page-header-text">
        <PageTitle id={titleId}>{title}</PageTitle>
        {description ? <p className="ui-page-description">{description}</p> : null}
      </div>
      {actions ? <div className="ui-page-header-actions">{actions}</div> : null}
    </div>
  );
}
