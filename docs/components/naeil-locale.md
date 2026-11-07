# Owned-service language runtime

The opt-in `@naeil/ui/naeil-locale` entries support the registered naeil Next applications. English uses `/`, Korean `/ko`, and Japanese `/ja`, including deep routes. The URL determines the language. Cookie and browser preferences never redirect or overwrite it. The existing public `i18n/routing`, `Nav` and `Footer` APIs retain their previous behavior.

Use exact `next-intl@4.14.8` with the shared server/client entries. Next and React remain external peers. Standalone header/footer imports do not require Next or next-intl.

## Entries and ownership

| Import | Responsibility |
| --- | --- |
| `@naeil/ui/naeil-locale` | Supported locales, strict service/route registry, `localePath`, `localeHref`, legacy receiving aliases and logical-route comparison |
| `/naeil-locale/server` | `createNaeilLocaleProxy`, `createNaeilRequestConfig`, request access markers and `localeMetadata` |
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

The canonical chrome can be imported from `/naeil-locale/chrome` under the shared provider. Existing `/naeil-header` and `/naeil-footer` remain standalone compatibility adapters and include the small three-language common dictionary. Consumer Link, auth, save guards, frame overrides, desktop/mobile account locks and project data remain consumer-owned.

## AB Storm registration (0.11.0 candidate)

`service="abstorm"` binds to exactly `https://abstorm.naeil.dev`. Its protected UI inventory is `/`, `/new`, `/runs/[id]`, `/runs/[id]/report` and `/experts`; `/new?copy=<id>` uses the same registered page. All support English, Korean and Japanese paths. `/auth/session`, `/auth/logout`, `/api/*` and `/health` remain unlocalized protocol endpoints, with no UI exceptions. Unknown UI paths are rejected instead of inheriting the app’s catch-all history fallback.

The inventory was checked against AB Storm source `087e67239db26506a73c51fde7a6d246e4a0d0d9`. Generic error documents use its existing `abstorm` title and no favicon. This registration does not add a default header/footer destination or application translations. Consumer provider, routing, authentication, message loading and upgrade remain app-owned; package registration alone does not establish production adoption.

## Security and rollout

The proxy runs exact existing protocol boundaries first, strips external private markers, strictly classifies UI paths, applies the existing app authorizer, and then runs next-intl. Protected entries without an authorizer fail closed. A marker is only a rendering hint: every protected server data read must independently authorize. RSC denial renders a valid localized access boundary and retains the root draft; it must not send login HTML or redirect an in-progress editor to another document. Keep the root beforeunload guard active during RSC failure and access recovery.

`localePath` is not an auth-return validator. Keep existing exact return/invite/callback/relay origin and envelope validation. Protocol paths stay outside `[locale]`; localized protocol aliases are rejected. Public metadata advertises only available translations. Protected/auth/error UI is noindex without SEO alternates.

Receiver deployment and sending are separate gates. `preferenceWritesEnabled` defaults to false. Before first exposure, validate a separate receiver-compatible fallback or the previous build's safe rejection of new paths. After all required receiver and auth receipts pass, enable the reviewed cross-service links and explicit preference writes. Keep package, source, hosted Docs, app identities, activation times and rollback receipts separate. Home and Baby are outside this migration.
