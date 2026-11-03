# Site Server Action request boundary

## Problem and scope

The B/D mail gate alone does not bound a Next 16.1.7 action sent to a page that does not own it. The revised #34 exposes credential actions on login/change-password pages. A public `requestPasswordCode` action ID posted with `[]` to `/projects` selects the first worker's literal `/[locale]/login/change-password` path. Locale middleware rewrites it to `/en/[locale]/login/change-password`; Next selects the same worker again before entering the disabled mail action. One unauthenticated request can therefore create unbounded internal HTTP requests.

This correction belongs only to the site's request boundary. It does not patch Next, change shared UI, alter action IDs, add delivery, enable a gate, or authorize hosted operations. The prior source, split stages, failing reproduction and bounded diagnostic remain evidence of the defect. Only revised #34 needs this follow-up; earlier stages do not compile these credential action exports.

## Chosen approach

The application proxy checks a POST carrying `Next-Action` against the current build's server-reference manifest before ordinary session refresh, locale rewrite, trailing-slash handling or framework action forwarding. It uses the manifest's action ID, exported name and worker paths; it does not infer an action from request-body shape or an ID prefix. Action bodies are not read by this boundary.

Rejected alternatives: blanket non-login action denial breaks header logout/recovery; rejecting only an internal forwarded request limits recursion but permits the first internal fetch and Next replaces its non-Flight error with `200 {}`; reconstructing a Flight response or compiler ID algorithm would couple application code to an unnecessary internal protocol. The selected manifest dependency must instead be pinned, traced and verified in a packaged runtime. This choice and its response contract were authorized for local implementation by the main coordinator.

## Normative response contract

For a normal request without a POST `Next-Action` header, existing behavior is unchanged. Protected service-return and invitation ingress keep their existing precedence, response bodies and security headers.

For a POST `Next-Action` in the ordinary site namespace:

| Condition | Response |
|---|---|
| Current known action, supported manifest worker, delivered path belongs to that action, no caller `x-action-forwarded` header | Continue normal Next handling. Owning-route disabled mail actions return their existing `200 text/x-component` Flight `mailPaused` result. |
| Known emailLogin/requestPasswordCode, mail gate OFF, path is not an owner or a forwarded header is present | `409 application/json`, exactly `{"status":"mailPaused"}`. |
| Known action, path is not an owner or a forwarded header is present | `409 application/json`, exactly `{"status":"invalidActionRoute"}`. |
| Malformed action ID | `400 application/json`, exactly `{"status":"invalidAction"}`. |
| Well-formed ID absent from this build | `404 application/json`, exactly `{"status":"invalidAction"}`, with `x-nextjs-action-not-found: 1` to preserve Next's stale-action signal. |
| Manifest unavailable, invalid schema, unsupported worker pattern or unsupported entry metadata | `503 application/json`, exactly `{"status":"actionUnavailable"}`. No fail-open fallback. |

All boundary responses have `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, no cookies, redirect or rewrite headers, and no session/config/SDK/transaction/upstream work. These responses do not invoke an action. **Off-owner `409` JSON is deliberately different from owning-route `200` Flight.** This supersedes the former ambiguous “another route returns mailPaused” statement: recognized disabled mail requests still report `mailPaused`, but invalid dispatch is an HTTP error, not successful action execution. Neither form enables mail.

The off-owner JSON status is a direct HTTP contract, not a resolved Next client action value: the pinned client reducer rejects non-Flight JSON as an action error. A well-formed stale ID retains Next's404/action-not-found header so the client can keep its existing typed stale-action handling. No custom Flight serialization is introduced.

An externally supplied `x-action-forwarded` header, including empty/0/1 values, never bypasses the boundary. Literal and encoded dynamic-worker segments, encoded separators, duplicate slashes, malformed encodings and unsupported locale aliases are never treated as owner paths. Valid en/ko/ja routes and one trailing slash retain their existing locale/canonical redirects. Static path segments must be delivered literally; ordinary encoded Unicode in a single dynamic blog slug may match the one-segment worker, never a separator or another route.

## Manifest and packaging contract

Next is pinned to 16.1.7. The observed Turbopack `server/server-reference-manifest.json` has `node`/`edge` action maps; IDs are 42 lowercase hexadecimal characters. Used entries carry `exportedName`, `workers` and worker `moduleId`/`async` metadata. The installed Next declarations in `flight-client-entry-plugin.d.ts` and `selectWorkerForForwarding` describe the worker mapping; locally generated manifests provide the exact pinned runtime evidence. Optional framework fields are not copied or exposed. In particular, the manifest encryption key is never logged, placed in a client bundle or copied to a public policy file.

The supported worker grammar is an app page, optional route groups, a first `[locale]` segment, static segments and ordinary single dynamic segments. Catch-all, optional, parallel/intercepting and unknown grammars fail closed. Parsing must not invent a regex from untrusted request text. The runtime reads only the configured server artifact path, extracts a small policy, caches immutable production policy, and rereads development output without changing action code.

Build configuration binds the actual dist directory and development `dev/` directory to that server path, and includes the manifest in server tracing. Exact production build, middleware NFT and an independently packaged standalone runtime must show that the file exists and is readable. A missing artifact produces finite 503; it does not silently disable the boundary. Local packaged success is not hosted Vercel acceptance.

The pinned Turbopack build does not apply `outputFileTracingIncludes` to its proxy NFT. The supported `compiler.runAfterProductionCompile` config hook therefore requires the current generated manifest and proxy/middleware NFT, validates the version1/files trace shape, and adds only the relative `server-reference-manifest.json` file. An absent or unsupported trace fails the build. This changes the application's generated packaging trace, not the installed Next package. Standalone already carries the manifest via required-server-files; that fact alone does not prove a separately packaged proxy function can read it.

## Required preservation and acceptance

Normal logout and clearLocalSession remain callable from every actual rendered page: landing, blog, blog slug, design, projects, login and change-password, with supported locales. OAuth prepareLogin stays callable from login. Password login, no-mail D first change, completion recovery and auth cookie behavior stay unchanged on their owning routes. Existing service-return/C tests must continue to pass.

Regression coverage includes both mail actions; canonical and locale owner routes; en alias and trailing slash; off-owner and unknown paths; raw/encoded literal worker paths; unknown/malformed IDs; missing/corrupt/unsupported manifest entries; caller forwarded headers; and all ordinary global actions. Fresh compiled HTTP must show off-owner rejection without a diagnostic preload, zero internal self-forwarding and zero unauthenticated Auth upstream calls. Count HTTP externally with a loopback ingress observer and block no requests in that observer. Use valid root-last multipart for emailLogin. The main coordinator assigns the runner slot and the new-tree actual Auth lifecycle validation.

No existing resources or evidence are deleted. Existing #33 Linux WebKit preparation remains on its unchanged source and requires its own slot. This correction does not resolve that inherited rendering failure.
