# Component usage guides

These guides target the **@naeil/ui 0.5.0 release candidate**; final archive verification and publication are pending. [Setup, themes, fonts and shared responsibilities](common.md). Run `pnpm storybook` for the current 17 Docs pages (15 UI and 2 Brand) and choose Docs or Usage. The [hosted Storybook](https://naeil-dev.github.io/naeil-ui/) was last verified for [0.4.0 on 2026-10-11](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.4.0); this candidate does not establish a new hosted deployment. Select chooses a value; DropdownMenu chooses an action.

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
