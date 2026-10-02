# Checkbox

Use Checkbox for independent selections, consent or a mixed group-selection state. Use Switch for an on/off preference and Select for one mutually exclusive value.

## API and wrapper defaults

Export: `Checkbox`. Forwards Radix Root props: `checked`/`defaultChecked`/`onCheckedChange` with **boolean | "indeterminate"**, `disabled`, `required`, `name`, `value`, `form`, `id`, button/ARIA props. Wrapper sets no checked default and renders its own Indicator (check/minus icons); no public Indicator, size or loading API. Graphic is 18×18px with a 44px pseudo-element hit area. The consumer computes mixed state from child selections.

Inherited [Checkbox 1.3.3 declaration](https://unpkg.com/@radix-ui/react-checkbox@1.3.3/dist/index.d.ts).

The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. [Wrapper source](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/src/components/ui/checkbox.tsx) is the API authority.

## Composition

```tsx
<label className="ui-choice-label">
  <Checkbox name="notifications" value="email" />Email notifications
</label>
<Checkbox checked={selectedCount === total ? true : selectedCount ? 'indeterminate' : false}
  onCheckedChange={selectAll} aria-label="Select all items" />
```

Import the named components from `@naeil/ui/ui`. Variables/handlers in snippets are consumer-owned. Run **UI / Checkbox / Usage** in Storybook for a complete interactive example; its Docs page renders this same guide.

The additional **Required consent** Storybook example demonstrates a consumer-owned required error, focus, pending confirmation and recovery using the same public props.

## Keyboard, focus and accessible content

Tab focuses enabled checkboxes; Space toggles. Mixed state exposes aria-checked="mixed" and a minus glyph; onCheckedChange receives boolean/mixed, so handle it intentionally (checked === true when coercing). Checked values submit; unchecked, indeterminate and disabled values do not represent selected items in FormData. Label consent clearly; use fieldset/legend for a related group.

## States, resilience and mistakes

Demonstrate unchecked/checked/mixed/disabled and required error/recovery. Loading/error/empty are group or operation state, not Checkbox props. Keep descriptive errors visible and connected; do not replace a disabled checkbox with unlabeled decoration. Use 44px label rows/gaps, wrap long Korean/English/Japanese labels, and verify indicators remain visible with forced colors. Do not invent an automatic select-all relationship.

Check this example in light/dark, comfortable/compact and mobile, including long Korean, English and Japanese text. Consumer overrides remain supported; follow the [shared override and acceptance guidance](common.md#styling-themes-and-overrides). Actual engine results and manual limits are in the [support matrix](../design/public-ui-support.md).
