# NaeilFooter — canonical service footer

Available since **0.7.1**, the first published release containing this entry. See [release identities and publication status](../package-release.md#publication-and-deployment) for the current published release; hosted Docs and service activation have separate receipts. React-only opt-in entry:

```tsx
import { NaeilFooter } from '@naeil/ui/naeil-footer';
<NaeilFooter locale="ja" Link={GuardedLink} />
```

Use with [NaeilHeader and its account control](naeil-header.md) on owned user-facing services. Both `full` and `compact` contain the .naeil home link, Projects, Blog and the official naeil GitHub link. Full also displays the existing tagline. Compact reduces spacing/description, not the destinations. No social account or legal claim is invented. The website's former generic X homepage icon is not a canonical account link.

Owned services use the service profile below, which is always `full`. Without `service`, `compact` remains available for legacy consumers. Compact link groups are top-aligned so their titles line up; an `items-*` utility in `containerClassName` still controls every child's vertical alignment.

## Owned-service profile (0.14.0)

```tsx
<NaeilFooter service="estimate" locale={locale} Link={GuardedLink} onNavigate={guard} />
```

Owned services (`abstorm`, `home`, `estimate`, `jev`) pass `service`, like `NaeilHeader`. The service profile always renders `full` with the `.naeil` brand only (no service suffix), the tagline and the canonical destinations. It accepts only `locale`, `resolveHref`, `Link`, `onNavigate` and `meta`; `NaeilServiceFooterProps` rejects everything else at type level, and JavaScript/cast attempts (`variant`, `className`, `containerClassName`, `style`, `data-*`, `id`, children, …) are ignored with one development-only warning per prop. `meta` remains for recorded product status such as Home's version line. An unknown runtime `service` falls back to the legacy profile with a development warning. Omitting `service` keeps every existing prop and the B1 output unchanged. Screens that omit the shared chrome (Home's login screen) omit the footer.

`locale` selects `en`, `ko`, or `ja`. `resolveHref(path)` defaults to official localized naeil.dev destinations; a local website router may resolve unlocalized paths itself. `Link` handles **every** canonical anchor, including absolute GitHub URLs. It must forward href, target, rel, onClick, className and children. GitHub opens a new tab with noopener/noreferrer. The shared implementation does not itself trigger navigation or await saves.

`onNavigate(event, item)` reaches the brand and all group links. An application can synchronously preventDefault, flush its draft, and navigate only after successful saving. Preserve defaultPrevented, modified/middle clicks and target behavior according to the application's established guard. Do not run both adapter and onNavigate guards twice. Native explicit `external:true` links in generic SiteFooter bypass Link for compatibility, but **still call onNavigate**. This closes the former missing interception path.

`variant`, `className`, `containerClassName`, standard footer attributes, `meta` and children remain available. Product status/legal information belongs in meta; no private build data belongs in the UI. Canonical content has no arbitrary replacement groups/brand. Existing generic SiteFooter and Next/next-intl Footer keep their override APIs. Record intentional departures from the canonical composition as rollout exceptions; same component imports alone are not adoption evidence.

Footer owns its internal 1600px/clamp frame. Do not wrap it in an additional padded container. Its `data-naeil-footer`, `data-naeil-ui-version` and `data-naeil-ui-contract` identify the actual rendering. `@naeil/ui/release` exports `uiRelease` for the application-owned public artifact identity endpoint. That endpoint exposes only schemaVersion, appId, artifactId, sourceRevision and ui. Release version is not proof of deployment without the matching app artifact and rendered checks.

Actual shared examples: **Brand / NaeilHeader / ReferenceFull, ReferenceCompact, JapaneseApplication**. Full legacy Footer examples remain compatibility checks. Consumer saves, failures, auth, real supported locales and modified clicks require product tests.
