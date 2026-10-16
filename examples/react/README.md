# React consumer example

A React 19 / Vite / Tailwind 4 settings form, using the packaged UI without Next.js or API keys. This consumer owns its local Pretendard and Noto Sans JP dependencies and imports in src/main.tsx; @naeil/ui adds no font runtime dependency. Korean/Latin/Japanese specimens are included. If these font resources fail, shared CSS uses system fallbacks; a family declaration alone is not proof that fonts loaded. Preserve the repository [font OFL notices](../../THIRD_PARTY_NOTICES.md#fonts) with redistributed builds.

The example targets the **@naeil/ui 0.6.0** and imports its React-only `NaeilHeader` and `SiteFooter`. Its checked-in dependency points to `file:../../naeil-ui-0.6.0.tgz`. Build and pack the current checkout, then run this separate consumer:

```sh
# From the repository root:
pnpm build:pkg
npm pack --ignore-scripts
cd examples/react
npm install
npm run dev
# npm run build checks TypeScript and production CSS/JavaScript.
```

This fixture deliberately uses the local archive so it validates the checkout. A registry-based application can use `pnpm add --save-exact @naeil/ui@0.6.0`; publication and archive identities are recorded in the release.

The [consumer guide](../../docs/design/v2-migration.md) covers required CSS/source registration, fonts, theme and density setup. The [application layout guide](../../docs/components/application-layout.md) explains shared component selection, consumer-agent instructions and intentional overrides. Header, main and footer use the same 1600px maximum frame and responsive 16–40px gutters. The main uses `ui-app-frame`, with a 640px settings section inside it; the fixed header's 65px clearance belongs to the application.

`pnpm check:consumers` validates fixture versions, copies this example to a temporary directory, installs the generated tarball independently and builds it without repository symlinks. Routing, authentication and locale callbacks here are demonstrations: the example saves only local UI state and does not contact a backend. A real application connects its existing providers, navigation guards and authentication through props instead of copying the shared header/footer implementation.

The form uses a native Textarea through its exact shared deep entry. Related preference panels exercise core Tabs, object refs and a class override; a second deep Tabs specimen uses RTL. The independent browser checker runs those extension contracts in Chromium and Playwright WebKit. Native form values/required rejection and disabled-tab keyboard navigation are checked alongside the existing mixed-import overlay/StrictMode regressions. These are local engine checks, not Safari or screen-reader certification. [Field and choice composition](../../docs/components/composition.md) explains consumer-owned labels, errors, native radios and Select.
