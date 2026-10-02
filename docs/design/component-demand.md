# Demand-led component decision — 2026-10-02

This extends the approved shared system with **Tabs and Textarea only**. Form fields and native exclusive choices receive composition guidance. It adds no dependencies, product workflows, website redesign or RadioGroup/FormField API. Prepared package 0.3.0 remains unpublished.

## Evidence and boundaries

A read-only audit inspected reachable application manifests and UI source, traced imports to route render sites, and distinguished installed package imports from local primitives. Exact private source/call-site/hash provenance was retained privately and directly checked before scope acceptance. Public roles below describe that bounded local sample, not an ecosystem survey or promised migration. Worktrees/snapshots, unused wrapper files and menu-radio definitions were excluded from adoption counts. No consumer repository was edited or executed.

| Candidate | Actual observed demand | Decision / smallest reusable contract |
| --- | --- | --- |
| Tabs | Four route-reachable panel compositions across three distinct products: a report detail view, a collaboration shell, dashboard detail, and usage windows. All four use locally copied Radix tabs, including the product separately installing @naeil/ui 0.1.0 for navigation/theme/locale compatibility imports. | Adopt Root/List/Trigger/Content wrappers forwarding Radix props/ref/classes. Shared panel relationships, keyboard focus and neutral states are absent from the existing 11 families. No package Tabs adoption is claimed. |
| Textarea | Repeated routed description/brief fields, composer and correction flows in one copied-UI product. A second product's native file editor corroborates multiline input, but is not another styled-wrapper adopter. | Adopt native textarea props/ref and shared focus/invalid/type/density styling. Input cannot replace multiline entry. Native HTML supplies editing/form behavior; the wrapper avoids repeated visual drift. Autosizing, chat shortcuts and editor behavior remain product-owned. |
| FormField | Labels repeat around different controls; help/error/validation lives in the consumer and existing repository examples. No common form-state/context API is used in the sample. | Use label/ID, described help/error and state composition; no new wrapper or form-state dependency. |
| RadioGroup | No application RadioGroup/native-radio use was observed. One routed product uses exclusive answer buttons, establishing candidate single-choice composition demand. Unused legacy choice/workbench code and action-menu radio exports are not additional adopters. | Document native fieldset/legend/same-name radios and compact Select. Defer a styled RadioGroup API until a broader shared contract needs it; this is not a claim that exclusive-choice demand is absent. |

## Contract and cost

[Tabs](../components/tabs.md) keeps installed Radix defaults: horizontal, automatic activation, looping focus, no invented initial value or forced mounting. [Textarea](../components/textarea.md) keeps native two-row and vertical-resize defaults and all native handlers/constraints. Existing semantic palette, Pretendard/Japanese companion, 16px text, density/touch minima, purpose-specific widths, short/reduced motion and class overrides remain the authority in [DESIGN.md](https://github.com/naeil-dev/naeil-ui/blob/main/DESIGN.md). No new numeric token is needed.

The runtime cost is thin wrappers and existing shared CSS; Radix Tabs already comes through the installed radix-ui dependency. Maintenance includes two exact deep entries, docs/stories, state/keyboard/form/override regressions and packed type/runtime checks. There is no new dependency, unused visual variant, form context or cross-product business contract. Revisit deferred candidates when repeated real usage needs more than native composition.

## Reproducible repository evidence

The external audit is a private local sample; these repository artifacts reproduce the accepted common contracts without exposing private applications:

- [Field/choice guide](../components/composition.md), source `src/stories/extension-examples.tsx`, standalone `src/components/ui/{tabs,textarea}.stories.tsx`, and the real packed example `examples/react/src/App.tsx`.
- Units: `pnpm exec vitest run src/lib/design/__tests__/extension.test.ts`.
- Rendered Docs/Usage and behavior: `pnpm build:storybook`, then `pnpm exec playwright test e2e/extension.spec.ts --project=chromium --project=webkit`.
- Distribution: `pnpm build:pkg`, `pnpm check:package` (actual isolated React and Next tarball installs).
- [Dated Stage 4 verification](public-ui-stage4-verification.md) records commands, source identities, actual results and limits. The [Stage 3 report](public-ui-stage3-verification.md) remains dated evidence of its original 11-family scope.
