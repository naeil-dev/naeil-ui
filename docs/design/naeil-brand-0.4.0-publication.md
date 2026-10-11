# @naeil/ui 0.4.0 and .naeil brand 1.1.1 publication

Verified on 2026-10-11. npm 0.4.0, the GitHub Release, hosted Storybook and the production brand website are published. Brand 1.1.1 retains its independent version and non-React usage kit.

| Published item | Identity and evidence |
| --- | --- |
| Source | [PR #3](https://github.com/naeil-dev/naeil-ui/pull/3), merged as `e8fe5afc13788a0cac0244b72e78975812f4a2ee`; tag `v0.4.0` points to that commit. |
| npm | [@naeil/ui 0.4.0](https://www.npmjs.com/package/@naeil/ui/v/0.4.0), published `2026-10-11T05:36:58.047Z`; `latest` verified as `0.4.0`. |
| GitHub Release | [v0.4.0](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.4.0), public and latest, published `2026-10-11T05:45:55Z`; all 9 assets downloaded anonymously and byte-verified. |
| Independent brand | [naeil-brand-1.1.1.zip](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/naeil-brand-1.1.1.zip): START-HERE.html, SVG/PNG/icons, usage examples, checksums, Lato source/OFL and verification. |
| Hosted Docs | [Brand / Logo](https://naeil-dev.github.io/naeil-ui/?path=/docs/brand-logo--docs), deployed from the exact source in [Pages run 38114879574](https://github.com/naeil-dev/naeil-ui/actions/runs/38114879574), completed `2026-10-11T05:36:38Z`. |
| Production website | [naeil.dev](https://naeil.dev/), Vercel deployment `6991225824` succeeded for the same source; actual homepage/login rendering and deployed icons verified. |

Install the published package:

```sh
npm install --save-exact @naeil/ui@0.4.0
# pnpm add --save-exact @naeil/ui@0.4.0
```

The release connects Logo, default Nav/Footer and the site login screen to the approved sunset/island identity and preserves the leading period in `.naeil`. Existing imports, Logo size/className/mono and Nav brandSlot remain supported. Shared typography remains Pretendard; the logo uses outlined Lato Regular 400. See the [consumer guide](v2-migration.md#brand-logo-integration-040) for variants, theme, grayscale and accessibility responsibilities.

## Archive identity

The frozen candidate, a rebuild from the merged source and the actual public registry download are byte-identical.

| Archive | Size / contents | SHA-256 |
| --- | --- | --- |
| `naeil-ui-0.4.0.tgz` | 131,414 compressed bytes; 108 files; 772,862 unpacked bytes | `77fe024ceb631ea76100fdc687f04ee1ae90bfcbb306629cb9dac854226c724f` |
| `naeil-brand-1.1.1.zip` | 3,942,650 bytes; 159 files; ZIP CRC passed | `a922a7375b5c3be412c759c0f54b532155f260801ea2bdd9cff43eca66848144` |

Brand extraction evidence retains 158 verified hashes and 93 relative-link checks. All archives and receipts are identified by the release's [SHA256SUMS](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/SHA256SUMS).

## Completed verification

| Check | Actual result / receipt |
| --- | --- |
| Source and build | 46 local unit tests passed; merged-source rebuild matches the frozen archive. [Source receipt](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/source-verification.json). |
| Remote acceptance | [Merged-source CI](https://github.com/naeil-dev/naeil-ui/actions/runs/38113742370) passed package/site/type/lint/contrast/consumer checks. Its browser job and the Docs workflow each passed 233 tests with 4 expected Firefox/WebKit forced-colors skips. |
| Published consumers | Actual npm installs in separate React/Next apps with independent empty caches passed types, production builds, SSR/deep imports, exact notices, production fonts/fallback, mixed-import ownership/StrictMode and Chromium/WebKit Tabs/Textarea contracts. Next is absent from the React fixture. [npm receipt](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/npm-publication-verification.json). |
| Hosted Storybook | Chromium/WebKit passed 28 Docs visits (14 pages per engine), 28 actual Docs-to-Usage transitions, 4 brand theme checks, 6 exact notice files, 4 canonical SVG references, loaded local fonts under `/naeil-ui/` and pinned guide links. [Hosted receipt](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/hosted-docs-verification.json). |
| Production | Chromium/WebKit passed 24 homepage/login conditions across Korean/English/Japanese, desktop/mobile and light/dark. Checks cover header/footer/login logos, mobile menu, theme palettes, overlap and overflow; 3 deployed icons match the approved bytes. [Production receipt](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/production-verification.json). |
| Independent brand | Exact approved ZIP, CRC and original extraction evidence checked. [Brand receipt](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/brand-publication-verification.json). |

Local deployed-browser engines were Chromium `153.0.8010.12` and Playwright WebKit `26.6`. [deployment-screenshots.zip](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/deployment-screenshots.zip) preserves 30 actual production/Docs captures and their hash manifest; receipts record the complete checked matrix. Aside was also used to open, capture and inspect the actual deployed production and Brand Docs pages. No new visual reference, Figma/Recraft operation or image generation was used for publication.

## Maintained documentation and support scope

The immutable npm archive, release tag and source receipts retain `e8fe5af`. This report and maintained guides record the subsequent publication outcome. Documentation updates do not replace the published bytes or redeploy the unchanged Storybook runtime; the deployed component guide links retain their tested foundation snapshots.

The earlier local homepage/login failure from absent Supabase environment variables remains dated implementation evidence; actual production rendering was checked separately here. Full site OAuth authentication, native Safari/VoiceOver listening, physical devices, native zoom/Windows high contrast, print/trademark certification and real-consumer adoption were not certified by these checks. The [support matrix and remaining manual coverage](public-ui-support.md) retain all unresolved findings and distinguish automated WebKit from native Safari.
