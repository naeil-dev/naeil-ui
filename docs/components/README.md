# Component usage guides

These guides target the **@naeil/ui 0.6.0**; release identities and publication evidence are recorded in the [release record](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.6.0). [Setup, themes, fonts and shared responsibilities](common.md). Run `pnpm storybook` for the current 17 Docs pages (15 UI and 2 Brand) and choose Docs or Usage. The [hosted Storybook](https://naeil-dev.github.io/naeil-ui/) was last verified for [0.5.0 on 2026-10-15](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.5.0); each subsequent deployment is recorded separately. Select chooses a value; DropdownMenu chooses an action.

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
| NaeilHeader | [NaeilHeader](./naeil-header.md) | Brand / NaeilHeader / Usage, JapaneseApplication |

[Field, native radio, Select and action composition](./composition.md) explains consumer state and semantic choices. [Demand decision](../design/component-demand.md) records why these two families were added.

Use opt-in `@naeil/ui/naeil-header` for the actual naeil.dev branded header, with official artwork URL references and consumer-owned routing, theme provider and authentication. Use generic `Navigation` from `/ui` for different product menus. [Navigation / SiteFooter](navigation.md) also documents the compatibility adapters.
