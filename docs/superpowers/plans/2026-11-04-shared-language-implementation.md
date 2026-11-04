# Shared language implementation — 2026-11-04

Approved source: [final design](../specs/2026-11-04-shared-language-design.md), SHA-256 `514c16a8dfc1a85324a9209811db624fb19ca57ae3cf3a457ef9c930e900dc0e`. This is implementation progress, not a deployment receipt.

## Preserved source and isolation

Original `outgoing-anaconda` remains on `6d15cbc376495779896aa428b3154a4a3f07ae7a`, with no tracked diff. All 23 design/evidence files are hash-preserved in `/Users/jaymini/.local/share/naeil-shared-language/2026-11-04/design-backup` and copied to the new worktree. The unrelated 2026-10-29 remediation plan stays untouched. Frozen0.7.1 source/tag/archive remain immutable.

| Owner | Worktree | Exact production base | Files owned |
| --- | --- | --- | --- |
| Main | `28nele6j/shared-language-20261104` | Site `9b3bea317bc482a834edc7cb57a0d84291d329b9` | Site app/integration, cross-service inventory, plan/evidence, final validation |
| Astra runtime | same worktree | same | `src/naeil-locale/**`, new build/export config and focused tests |
| Astra Jev | `28nele6j/jev-shared-language-20261104` | `8fa67de0d0a50132004d1c07a74f9cfc23e5db78` | Jev state, locale/auth/routes, dictionaries and tests |
| Astra Estimate | `28nele6j/estimate-shared-language-20261104` | `259f9e0a1f136fdc152f3089e813dd5b81395e80` | Estimate state, locale/auth/routes, complete UI translation and tests |

Site identity and freshly fetched `origin/main` agree. Jev runtime matches 2939 artifact files and21 links. Estimate exact checkout matches all347 source-file manifest hashes. Old consumer copies are discovery material, not editing bases. Registry now reports `latest=0.7.2`, `next=0.9.0`; published0.9.0 must not be overwritten. Version/source reconciliation is recorded separately from product acceptance.

## Execution gates

1. Capture current source/registry/DNS/ingress/user-route and rendered/code navigation inventory. Known three apps are established; full DNS control-plane access remains under inspection. Do not infer global scope from the old three-service runner.
2. Freeze shared export contract; implement shared next-intl request/proxy/messages/provider/controller, strict UI versus protocol parsing, canonical URL builder, delayed explicit preference commit and shared departure guard. Keep legacy public routing behavior unchanged.
3. Move Jev runs/stream/prompt/selection and Estimate raw inputs/undo/dialogs/controller to session-scoped root stores. Test remount, same/stale/new revision, session change, failed/slow RSC, no extra saves/aborts/refresh. Auth data checks remain independent from proxy markers.
4. Migrate common chrome strings to one `naeil` JSON source plus standalone compatibility; migrate app messages to `site`, `jev`, `estimate` namespaces. Validate key/ICU/variables and inventory residual user-visible literals. Translate all Estimate UI, preserving business document/PDF language and input parsers.
5. Main reviews all worker changes, runs package/type/unit/security checks, actual Storybook, contrast, exact packed React/Next consumers and full local three-language app acceptance. Keep receiver/send activation separate and document pending rows honestly.
6. Prepare exact candidate artifacts, separate fallback builds and restoration procedure before production exposure. Record package publication, Docs and each consumer separately. Existing transaction approvals are not reused. Obtain any genuinely required release approval only against reviewed artifacts and a tested rollback.
7. Deploy receivers first with unprefixed English; verify all three paths/auth returns/aliases before turning on cross-service links and preference writes. Keep receiver-compatible rollback; record actual activation and T+90 legacy-hint sunset. Final deployed acceptance is mandatory for full completion.

## Export contract

`@naeil/ui/naeil-locale` owns types/registry/path/build/compatibility; `/client` owns root controller/provider/departure guard; `/server` owns routing/request/proxy/metadata; `/messages` owns static selected-locale merge; `/checker` owns ICU validation. Root controller sits above locale routes and business stores. Consumers supply app namespace loaders, route registry and existing auth/guards; no app reimplements locale algorithms.

## Current progress and unresolved gates

- [x] Git/hash/agent collision recheck; only the new main was running in original cwd. Prior Opus reviewer is now closed; its exact-file receipt remains valid evidence of design only.
- [x] Preserve design bytes and isolate exact maintained source for all three apps.
- [x] Begin runtime and business lifetime implementation in explicit non-overlapping ownership.
- [x] Current full domain/route/code inventory; Cloudflare control-plane receipt captured. Expanded rendered-edge acceptance is tracked below.
- [x] Shared runtime and state/auth gate.
- [x] Complete translations/common UI migration.
- [ ] Local full acceptance, Storybook/packed consumption, review.
- [x] Independently tested emergency fallback sources/artifacts. Final clean Site build receipt remains in local acceptance.
- [ ] Publication/deployment/receiver acceptance/send activation.
- [ ] Deployed acceptance and operational receipts.

Home remains excluded by the approved design. The user explicitly reconfirmed Baby as a separate excluded product on 2026-11-04. Authenticated Cloudflare inventory confirms the three required apps plus excluded Baby. See ../../design/shared-language-2026-11-04/implementation-progress.md for executed checks and the remaining local/deployed gates.
