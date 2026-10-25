# Retired project pages

Content Collector (`cc`), PKM, Sustainability Analyzer (`sa`) and Baby Agent were removed from naeil.dev on 2026-10-25. Folders starting with `_` are not routed by Next.js.

To restore one, move its folder back to `src/app/[locale]/(content)/`, add it to the landing/projects lists, `sitemap.ts` and `headerProjects`, and remove it from the redirects in `next.config.ts`. Reverting the retirement commit restores all four.
