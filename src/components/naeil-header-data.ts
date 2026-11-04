// Canonical header-only copy and catalog extracted from the existing site.
// Application page dictionaries and framework i18n stay outside the package.
export const headerLocales = ["en", "ko", "ja"] as const;
export type NaeilHeaderLocale = (typeof headerLocales)[number];
export const headerProjects = [
  {
    "key": "naeilUi",
    "href": "/design",
    "accent": "oklch(0.623 0.214 259)",
    "icon": "whale",
    "status": "active" as "active" | "coming"
  }
] as const;
