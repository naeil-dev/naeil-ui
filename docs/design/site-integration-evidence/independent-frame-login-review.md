# Independent review: frame, metadata, login, design

Reviewed 2026-10-13 against the approved task contract in `../naeil-site-integration-2026-10-13.md`, DESIGN.md, migration guide and Navigation contract. Reviewer implemented home/blog and deliberately reviewed only other owners' implementation; home/blog requires a separate reviewer. No implementation edits or full check reruns were performed as part of this review.

## Verdict

Source-level spec compliance and code quality: approved; no blocking or actionable correctness findings in the reviewed changes. Actual production rendering, controls, localized routing, measured contrast, app-frame alignment, packed consumption and real-provider OAuth remain subject to main's integrated verification. A source review is not a substitute for those checks.

## Reviewed evidence

- Root layout establishes html lang from request locale and explicitly delivers Japanese font weights. Locale layout validates locale, uses canonical service spelling/title template, supplies the shared frame and a focusable main/skip link. Content group offset remains 112px through navigation + spacing tokens. Project route additions are metadata-only; excluded page bodies remain untouched.
- `site-metadata.ts:9` constructs as-needed paths through the existing routing contract (English unprefixed; ko/ja prefixed), so canonical and alternate links now agree with public routes. `site-metadata.ts:39` keeps social titles complete while document titles pass only the page name for the ancestor template. Available locale filtering and x-default fallback are coherent. Route metadata layouts cover login/design/project pages, and login metadata has noindex. `sitemap.ts` reuses the same URL contract and emits only existing article translations.
- `nav-wrapper.tsx:35` preserves query/hash when changing language. Website-specific theme/language labels stay in application components; the shared Select owns value selection and Radix behavior. Theme and locale triggers explicitly reserve 44px; guest/auth triggers reserve 44px and provide names. The unchanged shared menu density remains 40px desktop/44px mobile per the component contract, rather than a new site-specific API.
- Nav continues its existing public props and composes Navigation; its default project group opts into two desktop columns, with mobile behavior in the core. Footer still includes the original brand, tagline, projects/blog links, GitHub text destination, GitHub icon and X icon. FooterWrapper keeps locale-aware Link routing. New props are additive; this review found no removal of a supported adapter contract.
- `login/oauth-flow.ts:14` prevents duplicate overlapping requests, records the chosen provider, holds a successful redirect pending and re-enables choices after thrown/returned errors. Inspection of the installed Supabase GoTrueClient `_handleProviderSignIn` confirms it invokes browser location.assign before returning success, matching the state-flow assumption. The UI retains Google/GitHub, exposes localized pending/error states without provider details, marks provider busy, uses status/alert regions and preserves callback/retry recovery. Callback change appends error=auth; success routing logic is preserved.
- Design showcase uses existing shared components and reads numeric foundations from token JSON. Semantic swatches use active CSS variables; the blue primitive is explicitly legacy; neutral action, selection, focus and feedback roles are not conflated. The old AccentPicker that mutates ineffective primitive variables was removed from this page. Whale identity is preserved, unsupported float removed, controls use shared Select/Checkbox, invalid-input help is connected, and localized sample typography now uses the token's unitless normal line-height so larger fonts wrap coherently.

## Findings and disposition

No P0/P1/P2 findings. No actionable P3 finding remains. A provisional note about v0.6.0/v0.5.0 deployment sample strings was discussed with the owner; the directly associated translated CardDescription explicitly identifies them as example release history, so they do not claim the real package release is newer than 0.4.0. No requested factual content was rewritten.

Carry-forward items remain main-owned: the prior English locale redirect-loop finding requires production routing evidence; header/footer invariants require matching viewport/language/theme measurement; user/session controls and menus need actual keyboard/assistive-technology verification. The existence of the source changes alone does not close these prior findings.

## Final reviewed hashes

SHA-256:

- root layout: `f24082fa0acfd00b2d23dd6cd99331214a8d6a73a1bd09bf063c5c9bba9457de`
- locale layout: `0f94da971bb8562d68801f8227333c8fa8e77fd07273dca5c4d4e949422f526f`
- nav-wrapper: `a3642bdf725ede9b8751df59b6ad8a5f6b650c525b2d455a6bb8a828e2d0c1f2`
- site-controls: `57a3fbc788e0dce3295eb11da2be9d116edd57f72bc111ff51562754ff120f6d`
- auth-slot: `f685ada664145b242d2f93814f91369a9e45ed6481e86a30e563b2a0b4a16512`
- site-metadata: `9b1a10c7ef7212b9593f0affcda51b158c9addbc9ab90a5cf0a5de460f37748a`
- sitemap: `4c8ef94eb2fc1dc4a3faf1b3ebb7f801c7aee55f93ad9f850230d9ded5feb0f0`
- login page: `cf292ae279ebda051657d7c46105a4e35470ef34f08e6c212ba9e7373235d484`
- OAuth buttons: `03e1343d99ca4e93725608eabb9a3a8f57efaf18e16a1530d77cb5f14e8ce17e`
- OAuth flow: `23bd0e497ff6ab80e6c7de01ad9eec2c7bf8233c51e79b8535ddbd0bd52af789`
- auth callback: `10d2059dc65a4e053aa92e04c93c2c2b2bf04bf9cd779ad7f9a414e32d595450`
- design page: `a4deb13981d9e7db3ca28da20325f6517c3544a0c27d0497e0af3a49767bb9e3`
