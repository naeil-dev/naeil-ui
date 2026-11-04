# Implementation inventory — 2026-11-04

Local implementation inventory, not a production activation receipt. Approved design/source-audit bytes remain unchanged.

| UI origin | Exact maintained production base | Scope |
| --- | --- | --- |
| `https://naeil.dev` | `9b3bea317bc482a834edc7cb57a0d84291d329b9`, UI0.9.0 | Required |
| `https://jev.naeil.dev` | `8fa67de0d0a50132004d1c07a74f9cfc23e5db78`, UI0.7.2 | Required |
| `https://abestimate.naeil.dev` | `259f9e0a1f136fdc152f3089e813dd5b81395e80`, UI0.7.2 | Required |
| Baby | `/dashboard` was HTTP200 during investigation | User reconfirmed separate-product exclusion |
| Home | Existing React/Vite/i18next product | Approved default exclusion |
| trip/work/digest/line/esg | Public DNS checks returned ENOTFOUND; no current zone record | Outside current active UI inventory; no claim about deleted history |

Site base agrees with fetched origin/main and production identity. Jev matched2939deployed files+21links. Estimate matched347manifest sourceFiles. Old consumer copies were discovery aids, not editing bases. Registry reconciliation found latest0.7.2 and next0.9.0;0.8.0/0.9.0 already exist. New0.10.0 remains unpublished.

The authenticated Cloudflare control-plane inventory was completed through Aside at 12:06–12:09 JST. The zone contains exactly four DNS records (apex, Jev, Estimate, excluded Baby), one healthy tunnel and three published routes. Six Networks routes are system CIDRs. No additional active owned UI was found in this zone/account. See [the inventory receipt](cloudflare-inventory.json). No DNS/tunnel settings were changed.

## Route and code navigation inventory

| App | Logical UI routes | Navigation producers reviewed |
| --- | --- | --- |
| Site | `/`, `/projects`, `/design`, `/blog`, `/blog/[slug]`, `/login`, protected `/login/change-password` | Header/footer/brand; landing/project cards; blog list/adjacent/language links and untranslated-post fallback; credential/OAuth completion; logout/local clear; password enforcement; validated return; metadata/sitemap; invitation outbound links |
| Jev | protected `/`, `/login` | Header/footer/brand; common controller; central login/logout return; access-error and RSC recovery; narrow return validator |
| Estimate | protected `/`, `/estimates`, `/estimates/[id]`, `/compare`, `/settings`, `/calendar`, `/calendar-preview`, `/calendar-preview/estimates`, `/calendar-preview/estimates/[id]`; `/login`, `/access-denied`, exact UI exception `/auth/complete` | Header/footer/brand/account; workspace; root redirect; create/open/delete/compare/settings/calendar/preview transitions; auth completion/return; recovery destinations; existing save/flush guards |

Actual cross-service chrome edges are Jev→Site and Estimate→Site. Site's isolated invitation results provide service-entry links. No Jev↔Estimate menu or Site project menu is invented. All-pair builder contracts are separate from actual rendered edges.

API/OAuth/invite/return/relay/webhook/health/assets retain their protocol boundaries. Site preserves `/console-invite/`, `/svg/` and existing root public files. Localized protocol aliases never reach handlers. Retired project redirects are existing Next compatibility entries outside active UI. Exact validated auth return query/hash is retained; auth UI completion uses the committed locale. A changed login destination invalidates its prior root request.

`NAEIL_LOCALE_SEND_ENABLED` defaults off: no common preference writes; Jev/Estimate retain baseline cross-service chrome destinations. Internal and auth login/return links are already canonical in the receiver stage (§11.4). Site invitation service links use the flag. Enabling it does not change unprefixed-English semantics again.

Common JSON namespace is `naeil`; app namespaces are `site`, `jev`, `estimate`. Apps use selected `/naeil-locale/chrome`; standalone adapters preserve small common dictionaries/public behavior. Exact next-intl4.14.8 and the ICU checker are shared. Estimate holiday names/sample documents/PDF language remain business data. Jev's exact deployed source has no favicon asset or declaration; that inherited absence is recorded, without inventing artwork or a nonexistent icon URL.

Original outgoing-anaconda stays at6d15cbc with no tracked diff. Its unrelated2026-10-29plan is untouched. All23approved files were hash-preserved in the isolated checkout and owner-local backup. Frozen0.7.1 source/tag32108fd8 and archive/reference bytes remain unchanged.
