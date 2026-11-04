# @naeil/ui 0.10.0 — shared language runtime

Adds opt-in `naeil-locale` client, server, messages, checker and chrome entries for a common Next/next-intl language contract: unprefixed English, `/ko` Korean and `/ja` Japanese. URL language is authoritative; explicit preferences commit only after the new route arrives. The shared loader combines common `naeil` JSON with the selected application's JSON and validates ICU keys/variables at build time.

Common header/footer/account text now has one JSON source. Existing standalone compositions, generic Navigation/SiteFooter, legacy Nav/Footer and public compatibility imports remain supported. Use the new opt-in runtime for the new URL contract. Next consumers of it use `next-intl@4.14.8`.

The package does not own application data or authentication. Site/Jev/Estimate integration keeps session-scoped state above locale routes, including editing drafts/undo and active Jev streams; app-owned guards and exact auth returns remain in effect. Application deployment is recorded separately from this package release. Home and Baby are excluded from this migration.

Reviewed package SHA-256: `a4a1e312f2f608358a10f9019c248af37a8172bb116d3bc506144442cb963fb4` (175 files). Proposed tag source: `455f2f9aedb108606af2f429c18281260eafd2dd`. Proposed npm dist-tag: `next`; `latest` stays on 0.7.2. Frozen 0.7.1 is unchanged.

Validation: 791 shared/Site unit tests passed (5 existing skips), types/lint/contrast and exact packed React/Next consumption passed. Actual built Storybook Chromium passed 22 checks; Firefox/WebKit passed 28 and could not validate 16 whole-header image cases because the official external image returned a Vercel 403 challenge. Blocked-image usability passed. This release does not claim native screen-reader certification or completed service deployment.

These are prepared notes, not a publication receipt. At publication, attach the verified npm download metadata and separately record actual tag/Release/publication timestamps. Maintained usage is in `docs/components/naeil-locale.md` at the release source.
