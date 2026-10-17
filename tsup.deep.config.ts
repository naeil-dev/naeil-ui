import { defineConfig } from "tsup";

// An explicit allowlist prevents website actions and dependencies entering the package.
export default defineConfig({
  tsconfig: "tsconfig.build.json",
  entry: [
    "src/components/index.ts",
    "src/components/ui/index.ts",
    "src/components/ui/avatar.tsx",
    "src/components/ui/badge.tsx",
    "src/components/ui/button.tsx",
    "src/components/ui/card.tsx",
    "src/components/ui/checkbox.tsx",
    "src/components/ui/dialog.tsx",
    "src/components/ui/dropdown-menu.tsx",
    "src/components/ui/input.tsx",
    "src/components/ui/select.tsx",
    "src/components/ui/sonner.tsx",
    "src/components/ui/switch.tsx",
    "src/components/ui/tabs.tsx",
    "src/components/ui/textarea.tsx",
    "src/components/ui/navigation.tsx",
    "src/components/ui/site-footer.tsx",
    "src/components/nav.tsx",
    "src/components/naeil-header.tsx",
    "src/components/naeil-header-account.tsx", // Internal shared account UI, re-exported by naeil-header.
    "src/components/naeil-header-content.ts",
    "src/components/naeil-footer.tsx",
    "src/lib/ui-release.ts",
    "src/components/footer.tsx",
    "src/components/logo.tsx",
    "src/components/brand-artwork.generated.tsx", // Internal generated source; no public export.
    "src/components/locale-switcher.tsx",
    "src/components/theme-provider.tsx",
    "src/components/theme-toggle.tsx",
    "src/components/theme-toggle-icon.tsx",
    "src/components/typography.tsx",
    "src/lib/utils.ts",
    "src/lib/design/modal-inert.ts", // Internal helper; no package export.
    "src/i18n/config.ts",
    "src/i18n/routing.ts",
  ],
  format: ["esm"],
  bundle: false,
  splitting: false,
  dts: true,
  clean: false,
  outDir: "dist/source",
});
