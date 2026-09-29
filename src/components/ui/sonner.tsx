"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group font-sans"
      position="bottom-right"
      duration={4000}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border-strong)",
          "--success-bg": "var(--popover)",
          "--success-text": "var(--success)",
          "--success-border": "var(--border-strong)",
          "--error-bg": "var(--popover)",
          "--error-text": "var(--error)",
          "--error-border": "var(--border-strong)",
          "--info-bg": "var(--popover)",
          "--info-text": "var(--info)",
          "--info-border": "var(--border-strong)",
          "--warning-bg": "var(--popover)",
          "--warning-text": "var(--warning)",
          "--warning-border": "var(--border-strong)",
          "--border-radius": "var(--radius-md-value)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
