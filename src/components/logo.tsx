"use client";

import { useId, type SVGProps } from "react";
import { BrandArtwork, brandDimensions, brandVersion, type BrandAsset } from "./brand-artwork.generated";

export interface LogoProps extends Omit<SVGProps<SVGSVGElement>, "children" | "width" | "height" | "viewBox"> {
  /** Rendered height. Symbol stays square; lockups preserve their aspect ratio. */
  size?: number;
  /** Legacy single-ink currentColor silhouette. Prefer tone="gray" for tonal detail. */
  mono?: boolean;
  variant?: "symbol" | "horizontal" | "footer" | "stacked" | "wordmark";
  tone?: "color" | "gray";
  /** Auto follows the nearest .light/.dark or data-theme ancestor, then the OS. */
  theme?: "auto" | "light" | "dark";
  /** null marks a decorative logo; label the containing link instead. */
  label?: string | null;
}

// Self-contained: deep-import consumers do not need Tailwind or a theme provider.
// Custom properties inherit from the nearest explicit theme, including nested previews.
const autoThemeCSS = `
:where(.light,[data-theme="light"]){--naeil-logo-light:inline;--naeil-logo-dark:none}
:where(.dark,[data-theme="dark"]){--naeil-logo-light:none;--naeil-logo-dark:inline}
@media(prefers-color-scheme:dark){[data-naeil-theme="auto"]{--naeil-logo-os-light:none;--naeil-logo-os-dark:inline}}
`;

export function Logo({
  size = 20,
  mono = false,
  variant = "symbol",
  tone = "color",
  theme = "auto",
  label = "naeil",
  className,
  ...props
}: LogoProps) {
  const id = `naeil-${useId()}`;
  const form = variant === "symbol" && size <= 48 ? "symbol-small" : variant;
  const mode = mono ? "mono" : `${tone}${theme === "dark" ? "-dark" : ""}`;
  const asset = `${form}-${mode}` as BrandAsset;
  const geometry = brandDimensions[asset];
  const auto = !mono && theme === "auto";
  return (
    <svg
      width={size * geometry.width / geometry.height}
      height={size}
      viewBox={geometry.viewBox}
      fill="none"
      role={label === null ? undefined : "img"}
      aria-label={label ?? undefined}
      aria-hidden={label === null ? true : undefined}
      focusable="false"
      data-naeil-brand={brandVersion}
      data-naeil-variant={variant}
      data-naeil-theme={auto ? "auto" : theme}
      className={className}
      {...props}
    >
      {auto ? <>
        <style>{autoThemeCSS}</style>
        <g data-naeil-palette="light" style={{ display: "var(--naeil-logo-light, var(--naeil-logo-os-light, inline))" }}>
          <BrandArtwork asset={asset} id={`${id}-light`} />
        </g>
        <g data-naeil-palette="dark" style={{ display: "var(--naeil-logo-dark, var(--naeil-logo-os-dark, none))" }}>
          <BrandArtwork asset={`${form}-${tone}-dark` as BrandAsset} id={`${id}-dark`} />
        </g>
      </> : <BrandArtwork asset={asset} id={id} />}
    </svg>
  );
}
