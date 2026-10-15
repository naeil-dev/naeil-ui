# Shared naeil header — approved contract

The owner requested “공통화로 해” after rejecting the estimate header against both naeil.dev/ko and /ja. Language was not the cause. Implement one real package composition consumed by both sites; copying the site's source/styles/menu into estimate is superseded.

## Scope and authority

- Base: remote main b667a8483d711376e23fae881cb90ce123a090df; preserve dirty local main and other worktrees. Shared worktree: feat/shared-naeil-header. Estimate base: 040d8cf653932689a5f8cd78521793cb2a0f73af.
- Actual naeil.dev Nav/NavWrapper/SiteControls, DESIGN.md, current tokens, public Navigation/Radix behavior and Logo1.1.1 are authority. Live /ko and /ja inspected at1440×900dark; both use a fixed65px header, centered1280px border-box frame,24px gutters,160px desktop brand reservation and16px brand/menu gap. Verify mobile and both themes as well.
- Preserve neutral colors, Pretendard/Noto Sans JP,16px text/44px touch, hover travel tolerance, keyboard/touch/Escape/focus and reduced motion. No numeric foundation/token changes.
- Preserve estimate1600px main/footer frame,252px company sidebar/Drawer, purpose widths, two tabs, whole-person weekly matrix, all18completed improvements and absence of canceled sidebar delete.
- No business/schema/calculation/storage/auth contract changes. All raw/invalid/failed/401/409/autosave/flush/navigation/logout guards remain.

## Shared implementation

Create opt-in React-only `@naeil/ui/naeil-header` exporting `NaeilHeader` and its locale/props types. Keep generic /ui and existing Next compatibility paths/API supported. Version0.5.0 candidate includes previously unpublished Navigation/SiteFooter and this branded composition. Generic consumers must not import header artwork unless choosing this entry.

The module owns the actual brand lockup, five-project catalog and localized header-only text, two-column desktop/one-column mobile menu, artwork/badges, theme control, optional locale control, separator/auth placement and fixed1280px header composition. Reference the five existing decorative images through official https://naeil.dev/images/ URLs in that one catalog. Their redistribution provenance is unresolved in THIRD_PARTY_NOTICES, so no artwork bytes enter npm or the consumer public folder. Keep visible menu labels/destinations usable if decorative images fail. No site backend/full messages/hero code in the package. Keep licenses/notices.

`NaeilHeaderProps` extends Navigation's header/routing/guard props, replacing brand/items/toolbar/mobileToolbar with locale, resolveHref(path), optional brandHref/brandSlot/brandLinkProps, optional project/subnav/visibility compatibility overrides, optional onLocaleChange, authSlot and optional labels. Shared theme control uses the consumer's existing next-themes provider and mounted SSR-safe state. Default resolveHref produces https://naeil.dev/{locale}/…; the site adapter supplies its localized Link and relative resolver. Header routes through supplied Link even for absolute destinations; onNavigate also reaches brand and all menu links. Modified clicks retain native behavior.

Nav becomes a compatibility adapter to this composition; NavWrapper supplies only locale/path/router/auth state. SiteControls becomes a thin provider/translation adapter to shared control rendering. No separate site/estimate toolbar/menu JSX. Estimate supplies Japanese locale, GuardedLink and password-session logout control, with no fake extra language support or invented SSO. Optional locale control is shown only when supported by the application. Compact estimate footer uses package SiteFooter; site full footer keeps its content and uses the same generic implementation.

Estimate removes copied navigation/footer/menu/CSS/project images. Shared header owns its1280px frame independently from the unchanged1600px workspace. Add fixed-header clearance to main, sticky summary/sidebar/settings-save and focus/section-scroll offsets; preserve existing viewport budget and focus reveal.

## Verification and release boundary

Meaningful RED→GREEN for shared composition/locale/destinations/SSR, actual Storybook controls and packaged import; estimate header geometry and saved/invalid/failed/401/409/modified navigation/logout/focus regressions. Run shared units/types/lint/contrast/package/site/Storybook/clean packed consumers and browser checks, estimate units/types/lint/build and affected standalone E2E. Use isolated new evidence paths; inspect actual screenshots under matching locale/theme/viewports (390/768/1440/2560) against live site and shared candidate. Preserve prior accessibility/manual/device/OAuth limitations.

Freeze reviewed committed shared source and archive, integrate exact archive in estimate, freeze/review/package/smoke/integrity/identity. Preserve latest2470main/all backups through owned graceful replacement. Public estimate release remains authorized in session, but shared npm publication/main merge/site deployment have separate explicit policy; prepare concrete results before any missing final authorization. No push, npm publish, site deployment or production replacement is inferred from local verification alone.


## Latest external release authorization

The owner answered the explicit scope question with “공유 패키지 공개·naeil.dev 배포까지 진행”. Shared npm0.5.0 publication and naeil.dev deployment are now authorized, including the required reviewed branch/PR/main integration. Estimate public release remains authorized from earlier session instructions. Preserve source/archive identity, actual CI/site validation and fresh local/public business baselines. Authentication is required separately from authorization: npmwhoami returned401; official web login requested without asking for credentials. HostedDocs/GitHubRelease remain distinct from real-site deployment; package-release procedure applies.
