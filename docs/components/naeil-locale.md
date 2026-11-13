# Owned-service language runtime

The opt-in `@naeil/ui/naeil-locale` entries support the registered naeil Next applications. English uses `/`, Korean `/ko`, and Japanese `/ja`, including deep routes. The URL determines the language. Cookie and browser preferences never redirect or overwrite it. The existing public `i18n/routing`, `Nav` and `Footer` APIs retain their previous behavior.

Use exact `next-intl@4.14.8` with the shared server/client entries. Next and React remain external peers. Standalone header/footer imports do not require Next or next-intl.

## Entries and ownership

| Import | Responsibility |
| --- | --- |
| `@naeil/ui/naeil-locale` | Supported locales, strict service/route registry, `localePath`, `localeHref`, legacy receiving aliases and logical-route comparison |
| `/naeil-locale/server` | `createNaeilLocaleProxy`, `createNaeilRequestConfig`, request access markers and `localeMetadata` (title `Page — .naeil <service>` from the service id; `serviceName` is deprecated since 0.14.0 and only honored for compatibility) |
| `/naeil-locale/client` | Root `NaeilLocaleController`, locale `NaeilLocaleProvider`, `useLocaleController`, `useLocaleBeforeUnload` |
| `/naeil-locale/messages` | Selected common/application JSON loading and namespace merge |
| `/naeil-locale/checker` | Three-language key, nonempty value, ICU syntax and argument compatibility checks |
| `/naeil-locale/chrome` | Existing header/account/footer presentation using the provider's selected common dictionary |

Place the controller and app-owned session/business store in `app/layout.tsx`, above `[locale]`. Place the shared provider in `app/[locale]/layout.tsx` using the validated locale and server-loaded messages. Keep raw input, dialogs, undo, save/run controllers, stream readers and document-departure guards in the root lifetime. Locale remounts must not save, abort, reset, or seed a retained draft from older server props. Translate message keys at the rendering boundary, not inside persistent business state.

The shared config sets `localePrefix: "as-needed"`, `localeDetection: false`, `localeCookie: false`, and `alternateLinks: false`. Consumers set Next's `skipProxyUrlNormalize: true` and `skipTrailingSlashRedirect: true`; normalization follows the existing protocol/auth checks. A trusted ingress consumer may pass `requestOrigin: request => existingValidatedRequestUrl(request).origin` to the proxy. This keeps alias redirects and internal rewrites on the validated authority, including local127.0.0.1 deployments. Never derive it from an unvalidated forwarded host.

```tsx
// app/layout.tsx — inside the existing html/body
<NaeilLocaleController service="estimate" preferenceWritesEnabled={false}>
  <BusinessStateProvider>{children}</BusinessStateProvider>
</NaeilLocaleController>

// app/[locale]/layout.tsx — validate locale and setRequestLocale on the server
<NaeilLocaleProvider locale={locale} messages={await getMessages()}>
  {children}
</NaeilLocaleProvider>
```

Use `createNaeilRequestConfig({namespace: "estimate", messages: {en: () => import("../../messages/en.json"), ko: () => import("../../messages/ko.json"), ja: () => import("../../messages/ja.json")}})` in the next-intl request config. Every app JSON has exactly its own namespace. The package owns `naeil`; do not copy it into an app. The shared checker is a required build gate. The loader imports only the selected app dictionary and shared dictionary; an observable English recovery handles unexpected runtime omissions. Such omissions still fail acceptance.

Render complete paths with `localePath` for same-service navigation and `localeHref` for owned service links. Pass those paths to base Next Link/router or anchors without another locale option. The controller performs `router.replace(href, {scroll: false})`, serializes requests and waits for the matching provider arrival. It restores a stable `data-naeil-focus-id`, input `name`, or `id`. Only a successful explicit selection may write preference; history, prefetch and direct visits do not. Storage failure cannot block a path change.

Compatibility note: timeout releases the pending lock but retains the failed intent so a matching late provider arrival clears the error and applies the normal preference-write opt-in. The full destination (including query and fragment) must match. Cancel, history navigation, departure to another logical route, or a newer selection discards that late-arrival eligibility. `retry()` now uses the latest failed request, including unsupported-route failures and destination options; if the URL already has the requested locale, it clears the error and returns `false` without starting another navigation. A URL change alone never writes preference: a matching provider must commit.

The canonical chrome can be imported from `/naeil-locale/chrome` under the shared provider. Existing `/naeil-header` and `/naeil-footer` remain standalone compatibility adapters and include the small three-language common dictionary. Consumer Link, auth, save guards, frame overrides, desktop/mobile account locks and project data remain consumer-owned.

## AB Storm registration (0.11.0 candidate)

`service="abstorm"` binds to exactly `https://abstorm.naeil.dev`. Its protected UI inventory is `/`, `/new`, `/runs/[id]`, `/runs/[id]/report` and `/experts`; `/new?copy=<id>` uses the same registered page. All support English, Korean and Japanese paths. `/auth/session`, `/auth/logout`, `/api/*` and `/health` remain unlocalized protocol endpoints, with no UI exceptions. Unknown UI paths are rejected instead of inheriting the app’s catch-all history fallback.

The inventory was checked against AB Storm source `087e67239db26506a73c51fde7a6d246e4a0d0d9`. Generic error documents originally used its `abstorm` title and no favicon; since 0.14.0 every service's error document uses the canonical `<message> — .naeil <service>` title (`.naeil` for naeil.dev) and links the shared `/icon.svg`. This registration does not add a default header/footer destination or application translations. Consumer provider, routing, authentication, message loading and upgrade remain app-owned; package registration alone does not establish production adoption.

## Security and rollout

The proxy runs exact existing protocol boundaries first, strips external private markers, strictly classifies UI paths, applies the existing app authorizer, and then runs next-intl. Protected entries without an authorizer fail closed. A marker is only a rendering hint: every protected server data read must independently authorize. RSC denial renders a valid localized access boundary and retains the root draft; it must not send login HTML or redirect an in-progress editor to another document. Keep the root beforeunload guard active during RSC failure and access recovery.

Compatibility note: a protocol hook returning `NextResponse.next({request: {headers}})` or `NextResponse.rewrite(url, {request: {headers}})` now preserves the complete supplied request header set, including deletions and replacements. Internal locale/access markers are still removed. Plain `NextResponse.next()` without request overrides retains the sanitized incoming headers.

`localePath` is not an auth-return validator. Keep existing exact return/invite/callback/relay origin and envelope validation. Protocol paths stay outside `[locale]`; localized protocol aliases are rejected. Public metadata advertises only available translations. Protected/auth/error UI is noindex without SEO alternates.

Compatibility note: literal backslashes in UI query strings and fragments are preserved by `resolveLocaleUrl` and `localePath`; backslashes in the pathname remain invalid. Encoded locale and protocol-prefix segments are rejected using the registered locale and protocol inventories, including consumer `protocolPrefixes`. This also applies to dynamic UI segments; use the literal spelling of reserved segments.

## Proxy matcher and public files

The proxy passes these unlocalized prefixes (exact path or descendants) through without locale rewriting: `/api`, `/auth`, `/_next`, `/_vercel`, `/.well-known`, `/health`, `/invite`, `/return`, `/webhook`, `/images`, `/fonts`, plus the service's `protocolPrefixes`. Exact registered `uiProtocolExceptions`, such as Estimate's `/auth/complete`, remain UI routes. The built-in exact public files are `/favicon.ico`, `/favicon.svg`, `/icon.svg`, `/apple-icon.png`, `/robots.txt` and `/sitemap.xml`. Compatibility note: `/favicon.svg` is now included so Estimate's error-document favicon passes through the same proxy that emitted it.

Other public files, including manifests, Open Graph images and extra icons, must be excluded by the consumer's matcher or explicitly passed by its protocol hook or service `protocolPrefixes`. Unknown paths are otherwise rejected with 404, even when they contain a file extension. A protocol hook runs before classification; keep its allowlist exact and preserve existing auth/invite/return checks.

The site uses the following catch-all matcher and passes its additional public files in the protocol hook. This is the recommended starting point when existing security checks must run on every request:

```ts
// proxy.ts — retain existing protocol/security checks before this asset branch.
import { NextResponse, type NextRequest } from "next/server";
import { createNaeilLocaleProxy } from "@naeil/ui/naeil-locale/server";

async function protocol(request: NextRequest) {
  const path = new URL(request.url).pathname;
  // App-owned examples; replace these with the application's actual public files.
  if (path.startsWith("/svg/") || ["/manifest.webmanifest", "/og.png"].includes(path)) {
    return NextResponse.next();
  }
  return undefined;
}

export default createNaeilLocaleProxy({ service: "main", protocol /*, authorize: existingAuthorizer */ });
export const config = { matcher: ["/:path*"] };
```

Keep the existing authorizer when integrating this example. If the matcher excludes assets instead, those requests bypass both the locale proxy and its protocol hook; exclude only paths that need neither. Passing a path through does not create or serve the file: the consumer still owns its static asset or handler.

## Activation

Receiver deployment and sending are separate gates. `preferenceWritesEnabled` defaults to false. Before first exposure, validate a separate receiver-compatible fallback or the previous build's safe rejection of new paths. After all required receiver and auth receipts pass, enable the reviewed cross-service links and explicit preference writes. Keep package, source, hosted Docs, app identities, activation times and rollback receipts separate. Home and Baby are outside this migration.
