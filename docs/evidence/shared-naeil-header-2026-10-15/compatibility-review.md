# Required pre-build compatibility correction from main

Actual source inspection: legacy Nav now ignores consumer next-intl nav/projects messages and force-casts arbitrary locale; header projects override forcibly maps external:false, which changes existing external projects contract. Public compatibility is approved; please add meaningful rendering REDs and fix before main final build:

1. Legacy Nav must still respect its consumer-owned useTranslations('nav') and ('projects') translations, e.g. en provider nav.projects='Consumer tools'/nav.blog='Consumer journal'/custom project names. Locale other than en/ko/ja previously rendered translated labels, so do not crash just because canonical branded defaults only cover3; choose safe canonical fallback for control/landmark defaults while passing supplied messages.
2. Preserve external semantics of provided projects and legacy projectsExternal: native external anchors must not go through a consumer internal-only Link. Default NaeilHeader official links still go through the supplied Link so estimate guards remain (explicit onNavigate reaches all links regardless).
3. Keep actual NavWrapper using NaeilHeader canonical catalog/control composition. Avoid copying menu/artwork markup back into Nav. A small shared project-link builder or content override lets the compatibility adapter supply translated data without owning rendering; pick the least API surface that preserves the existing contract. Expose only warranted overrides and document them if public.
4. Add default brand accessible name .naeil if needed (unless brandLinkProps aria-label supplied). Current default Logo contains CSS text in its accessibility snapshot; existing default does not name destination. Preserve custom brand accessible content with no forced incorrect name.

Main continues packed fixtures/docs while you own this correction. Do not run package/build/Storybook yet; send completion with fresh unit/type/scoped lint results.
