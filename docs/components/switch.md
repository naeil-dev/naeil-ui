# Switch

Use Switch for an on/off preference; tell the user whether it applies immediately or on Save. Use Checkbox for consent, selection or a group of options; use Select for more than two values.

## API and wrapper defaults

Export: `Switch`. Forwards Radix Root props: `checked`/`defaultChecked`/`onCheckedChange`, `disabled`, `required`, `name`, `value`, `form`, `id`, button/ARIA props. Wrapper sets no state defaults and always renders its own Thumb; no public Thumb, size, loading or indeterminate API. Graphic is 36×22px with a 44px pseudo-element hit area independent of density. Underlying form mirroring comes from Radix when used in a form.

Inherited [Switch 1.2.6 declaration](https://unpkg.com/@radix-ui/react-switch@1.2.6/dist/index.d.ts).

The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. [Wrapper source](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/src/components/ui/switch.tsx) is the API authority.

## Composition

```tsx
<div className="ui-choice-label">
  <Switch id="summary" name="summary" defaultChecked />
  <label htmlFor="summary">Weekly summary</label>
</div>
<p>Changes apply when you save.</p>
```

Import the named components from `@naeil/ui/ui`. Variables/handlers in snippets are consumer-owned. Run **UI / Switch / Usage** in Storybook for a complete interactive example; its Docs page renders this same guide.

## Keyboard, focus and accessible content

Tab focuses enabled switches; Space toggles and aria-checked exposes the boolean. Keep a stable label across on/off states. The label should activate the control; checked values submit, unchecked/disabled controls are omitted. No mixed state; choose Checkbox if mixed selection is needed.

## States, resilience and mistakes

Demonstrate on/off/disabled and consumer saving/error recovery. Put pending/error/status beside the preference; never claim disabling saves the value. Keep labels and pseudo-element hit areas from overlapping neighbors, check visible thumb/track/focus in forced colors, and let long localized labels wrap. Custom classes must retain state distinction and focus.

Check this example in light/dark, comfortable/compact and mobile, including long Korean, English and Japanese text. Consumer overrides remain supported; follow the [shared override and acceptance guidance](common.md#styling-themes-and-overrides). Actual engine results and manual limits are in the [support matrix](../design/public-ui-support.md).
