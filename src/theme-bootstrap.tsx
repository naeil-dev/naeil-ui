import { themePreflightScript } from "./lib/theme/preference";

/** Static, validated bootstrap for an inline classic script in head before body. */
export const naeilThemeBootstrap = themePreflightScript;

/** Server-safe: place first in head, outside Suspense. Keep the root provider. */
export function NaeilThemeScript({ nonce }: { nonce?: string }) {
  return <script nonce={nonce} data-naeil-theme-preference="" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: naeilThemeBootstrap }} />;
}
