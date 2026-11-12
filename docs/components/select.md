# Select

Use Select for one value from a finite option set. Prefer native select when native platform behavior is essential; use DropdownMenu for actions and text input/search for very large or editable choices.

## API and wrapper defaults

Exports: `Select`, `SelectValue`, `SelectGroup`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`.

Select/Value/Group alias Radix parts. Root: `value`/`defaultValue`/`onValueChange`, `open`/`defaultOpen`/`onOpenChange`, `name`, `required`, `disabled`, `form`, `dir`, `autoComplete`; wrapper sets no root defaults. Trigger forwards button/ARIA props and renders a chevron. Value accepts placeholder. Content creates Portal, Viewport and scroll buttons and defaults **position="popper", sideOffset=6**; forwards position/alignment/collision/Escape/close-focus/outside handlers. Item requires a nonempty string `value`, accepts `disabled` and `textValue`, and creates ItemText/Indicator. No searchable, multiselect or async data API; SelectPortal/Viewport/Icon/ItemText are not public exports.

Inherited [Select 2.2.6 declaration](https://unpkg.com/@radix-ui/react-select@2.2.6/dist/index.d.ts).

The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. [Wrapper source](https://github.com/naeil-dev/naeil-ui/blob/main/src/components/ui/select.tsx) is the API authority.

## Composition

```tsx
<label htmlFor="language">Language</label>
<Select name="language" defaultValue="en">
  <SelectTrigger id="language"><SelectValue placeholder="Choose language" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="ko">한국어</SelectItem>
    <SelectItem value="en">English</SelectItem>
    <SelectItem value="ja">日本語</SelectItem>
  </SelectContent>
</Select>
```

Import the named components from `@naeil/ui/ui`. Variables/handlers in snippets are consumer-owned. Run **UI / Select / Usage** in Storybook for a complete interactive example; its Docs page renders this same guide.

## Keyboard, focus and accessible content

Trigger is the labeled combobox. Enter/Space/arrows open; arrows/Home/End/typeahead navigate enabled options; Enter chooses, Escape cancels and focus returns. Name and value allow form submission. Put aria-invalid/aria-describedby on Trigger and visible help/error nearby; SelectLabel labels a group, not the form control.

## States, resilience and mistakes

Show placeholder, selected, disabled root/item, invalid, loading and empty option sets. Loading/empty data is consumer state: disable the trigger and provide external status/retry, not an empty-string SelectItem. Empty string is the clear/placeholder root value. Trigger truncates long text; ensure the full accessible name/value remains available and option text wraps. Theme/density must be on the document root because content is portaled.

Check this example in light/dark, comfortable/compact and mobile, including long Korean, English and Japanese text. Consumer overrides remain supported; follow the [shared override and acceptance guidance](common.md#styling-themes-and-overrides). Actual engine results and manual limits are in the [support matrix](../design/public-ui-support.md).
