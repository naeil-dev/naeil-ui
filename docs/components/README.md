# Component usage guides

These maintained guides describe the repository APIs. See [release policy and identities](../package-release.md#publication-and-deployment) for the current published release. [Setup, themes, fonts and shared responsibilities](common.md). Run `pnpm storybook` for the current 18 Docs pages (16 UI and 2 Brand) and choose Docs or Usage. The [hosted Storybook](https://naeil-dev.github.io/naeil-ui/) has recorded [0.5.0 verification](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.5.0); each subsequent deployment requires its own receipt. Select chooses a value; DropdownMenu chooses an action.

Start application layouts with the [shared navigation/footer selection and frame guide](application-layout.md). It includes a starter, the 1600px frame contract and instructions to place in consumer repositories so agents reuse the shared implementation.

| Family | Guide | Runnable story |
| --- | --- | --- |
| Button | [Button](./button.md) | UI / Button / Usage |
| Input | [Input](./input.md) | UI / Input / Usage |
| Card | [Card](./card.md) | UI / Card / Usage |
| Dialog | [Dialog](./dialog.md) | UI / Dialog / Usage |
| Sheet | [Sheet](./sheet.md) | UI / Sheet / Usage, LocalizedClose, Sides |
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
| NaeilServiceShell, theme provider and PageHeader | [NaeilServiceShell](./naeil-shell.md) | Brand / NaeilServiceShell / Abstorm, Home, Estimate, Jev |

[Owned-service language runtime](naeil-locale.md) documents `/naeil-locale`, `/client`, `/server`, `/messages`, `/checker` and `/chrome`. Owned Next services under the shared provider import shell/provider/PageHeader/account from `/naeil-locale/chrome`; standalone React services use `/naeil-shell` and `/naeil-header` for account presentation. Standalone header/footer adapters remain available.

[Field, native radio, Select and action composition](./composition.md) explains consumer state and semantic choices. [Demand decision](../design/component-demand.md) records why these two families were added.

New owned-service adoption uses [NaeilServiceShell and root NaeilThemeProvider](naeil-shell.md), starts pages with `PageHeader` and runs `naeil-ui-conformance` in CI. Consumers supply routing/save guards, locale and authentication state/actions through the shell's adapters and `header.authSlot`; the shell owns canonical header/main/footer presentation. naeil.dev keeps its no-service catalog header and existing footer, with the root `NaeilThemeProvider`. Standalone `@naeil/ui/naeil-header` and `/naeil-footer` retain their compatibility APIs; official artwork remains URL-referenced. Use generic `Navigation` and `SiteFooter` from `/ui` for different products. [Navigation / SiteFooter](navigation.md) also documents the compatibility adapters.
