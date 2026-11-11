# DropdownMenu

Use DropdownMenu for actions and view toggles, Select for a form value, and navigation links for destinations. Menu checkbox/radio items are action-menu options, not a substitute for form inputs.

## API and wrapper defaults

Exports: `DropdownMenu`, `DropdownMenuPortal`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuLabel`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`.

Root: primitive `open`/`defaultOpen`/`onOpenChange`, `modal`, `dir`; no wrapper root defaults. Trigger supports `asChild` and `disabled`. Content creates Portal and defaults `sideOffset=4`; forwards align/side/collision/focus/outside handlers. Item defaults `variant="default"`, accepts `destructive` and `inset`; uses `onSelect`, `disabled`, `textValue`. Label/SubTrigger accept `inset`. CheckboxItem accepts boolean/indeterminate `checked` and `onCheckedChange`; RadioGroup accepts value/onValueChange, RadioItem requires value. Sub forwards open state; SubContent does not create a Portal automatically. Shortcut is a styled span and does **not** register a keyboard shortcut.

Inherited [DropdownMenu 2.1.16 declaration](https://unpkg.com/@radix-ui/react-dropdown-menu@2.1.16/dist/index.d.ts), including its inherited Menu types.

The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. [Wrapper source](https://github.com/naeil-dev/naeil-ui/blob/main/src/components/ui/dropdown-menu.tsx) is the API authority.

## Composition

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild><Button type="button" variant="outline">Actions</Button></DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onSelect={copy}>Copy reference</DropdownMenuItem>
    <DropdownMenuItem disabled>Archive (unavailable)</DropdownMenuItem>
    <DropdownMenuItem variant="destructive" onSelect={confirmDelete}>Delete…</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Import the named components from `@naeil/ui/ui`. Variables/handlers in snippets are consumer-owned. Run **UI / DropdownMenu / Usage** in Storybook for a complete interactive example; its Docs page renders this same guide.

## Keyboard, focus and accessible content

Enter/Space/ArrowDown open a trigger; arrows/Home/End/typeahead navigate enabled items, Enter selects, Escape closes and returns focus in the tested composition. Submenus use ArrowRight/ArrowLeft for LTR. Name icon-only triggers. Use onSelect for keyboard and pointer activation; announce operation success/failure outside the transient menu.

## States, resilience and mistakes

Disabled items remain descriptive but cannot select. Loading/empty/error belong to action state or an external status region; disable unavailable actions and supply recovery outside. Do not nest buttons inside menu items. Long localized actions must wrap within a viewport-bounded Content; pass className="max-w-[calc(100vw-2rem)]" and wrapping styles as needed. Do not imply shortcuts work unless the consumer registers them.

Check this example in light/dark, comfortable/compact and mobile, including long Korean, English and Japanese text. Consumer overrides remain supported; follow the [shared override and acceptance guidance](common.md#styling-themes-and-overrides). Actual engine results and manual limits are in the [support matrix](../design/public-ui-support.md).
