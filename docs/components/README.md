# Component usage guides

These maintained guides cover published exact **@naeil/ui 0.8.0** and the unpublished **0.9.0 frame candidate**. On 2026-10-29 registry tags were latest=0.7.2 and next=0.8.0; see [release policy and identities](../package-release.md#publication-and-deployment). [Setup, themes, fonts and shared responsibilities](common.md). Run `pnpm storybook` for the current 17 Docs pages (15 UI and 2 Brand) and choose Docs or Usage. The [hosted Storybook](https://naeil-dev.github.io/naeil-ui/) has recorded [0.5.0 verification](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.5.0); each subsequent deployment requires its own receipt. Select chooses a value; DropdownMenu chooses an action.

Start application layouts with the [shared navigation/footer selection and frame guide](application-layout.md). It includes a starter, the 1600px frame contract and instructions to place in consumer repositories so agents reuse the shared implementation.

| Family | Guide | Runnable story |
| --- | --- | --- |
| Button | [Button](./button.md) | UI / Button / Usage |
| Input | [Input](./input.md) | UI / Input / Usage |
| Card | [Card](./card.md) | UI / Card / Usage |
| Dialog | [Dialog](./dialog.md) | UI / Dialog / Usage |
| DropdownMenu | [DropdownMenu](./dropdown-menu.md) | UI / DropdownMenu / Usage |
| Badge | [Badge](./badge.md) | UI / Badge / Usage |
| Avatar | [Avatar](./avatar.md) | UI / Avatar / Usage |
| Toaster | [Toaster](./sonner.md) | UI / Toaster / Usage |
| Select | [Select](./select.md) | UI / Select / Usage |
| Switch | [Switch](./switch.md) | UI / Switch / Usage |
| Checkbox | [Checkbox](./checkbox.md) | UI / Checkbox / Usage |
| Tabs | [Tabs](./tabs.md) | UI / Tabs / Usage |
| Textarea | [Textarea](./textarea.md) | UI / Textarea / Usage |
| Navigation | [Navigation](./navigation.md) | UI / Navigation / Usage |
| SiteFooter | [SiteFooter](./navigation.md) | UI / SiteFooter / Usage |
| NaeilFooter | [NaeilFooter](./naeil-footer.md) | Brand / NaeilHeader / ReferenceFull, ReferenceCompact |
| NaeilHeader and account control | [NaeilHeader](./naeil-header.md) | Brand / NaeilHeader / Usage, JapaneseApplication, AccountStates |

[Field, native radio, Select and action composition](./composition.md) explains consumer state and semantic choices. [Demand decision](../design/component-demand.md) records why these two families were added.

Use opt-in `@naeil/ui/naeil-header` for the actual naeil.dev branded header and its `NaeilHeaderAccountControl` in `authSlot`, paired with `@naeil/ui/naeil-footer` on owned services. Consumers supply routing/save guards, theme providers and authentication state/actions; official artwork remains URL-referenced. Canonical footer and account examples are part of existing stories, without additional Docs families. Use generic `Navigation` and `SiteFooter` from `/ui` for different products. [Navigation / SiteFooter](navigation.md) also documents the compatibility adapters.
