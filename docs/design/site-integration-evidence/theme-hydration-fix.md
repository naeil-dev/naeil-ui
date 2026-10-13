# Site theme control hydration correction

2026-10-13. Independent two-context Chromium reproduction on the current production preview `http://localhost:3010/ko/blog` with matching localStorage theme/colorScheme: light produced no pageerror; dark produced React error418 and the post-hydration label “밝은 테마로 전환”. Existing main matrix independently reports the same dark-only failure across routes/browsers.

Source cause: next-themes reads stored theme in its client state initializer while returning undefined for its SSR state. SiteThemeControl used mounted only for disabled, leaving its icon and translated aria-label dependent on resolvedTheme before hydration completed. That renders Moon/dark-action on SSR but Sun/light-action on the initial dark client pass.

Correction: derive dark as `mounted && resolvedTheme === "dark"`. useSyncExternalStore's server snapshot remains false through hydration, so the icon, label and disabled state match SSR; its post-mount snapshot then enables and updates the control to the actual preference. Actual click behavior is retained and no shared package component changed. Scoped ESLint passed. Main owns fresh production rebuild plus both-theme/both-browser error and interaction verification; the existing running build predates this source edit.

Corrected `src/components/site-controls.tsx` SHA-256: `0c8d3f10bd20be90af5721916230de3a97c908a634c6004cb265228b7ae4abb8`.
