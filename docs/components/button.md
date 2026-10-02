# Button

Use Button for an action, a native anchor for navigation, and Select for a value. Prefer one clear primary action per task.

## API and wrapper defaults

Exports: `Button`, `buttonVariants`.

| Prop | Contract / wrapper default |
| --- | --- |
| `variant` | `default` (default), `destructive`, `outline`, `secondary`, `ghost`, `link` |
| `size` | `default` (default), `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg` |
| `asChild` | `false`; Slot.Root composes one supplied element |
| Native props | `type`, `disabled`, `onClick`, `name`, `value`, form and ARIA props; no wrapper `type` default |

`size` names are preserved; shared CSS controls actual height (40/36px; lg adds 4px; mobile minimum 44px). `xs` does not imply an extra-small touch target. `loading` is not an API.

The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. [Wrapper source](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/src/components/ui/button.tsx) is the API authority.

## Composition

```tsx
<Button type="button" disabled={saving} aria-busy={saving}
  onClick={save}>{saving ? 'Saving…' : 'Save settings'}</Button>
<p role="status">{result}</p>
<Button asChild variant="link"><a href="/settings">Settings</a></Button>
```

Import the named components from `@naeil/ui/ui`. Variables/handlers in snippets are consumer-owned. Run **UI / Button / Usage** in Storybook for a complete interactive example; its Docs page renders this same guide.

## Keyboard, focus and accessible content

Native buttons activate with Enter/Space and show focus-visible; disabled buttons leave the tab sequence. Name icon buttons with aria-label. Keep loading text meaningful and announce completion/error near the form; restore enabled state after failure. A button without type inside a form submits by browser default.

## States, resilience and mistakes

Demonstrate normal, disabled, saving and recovery; no-data/error belong to the operation. Do not nest Button in a link or treat variant="link" as navigation. With asChild anchors, own href/activation/disabled policy. For long translated actions use `className="h-auto min-h-11 whitespace-normal py-2"` and check both densities.

Check this example in light/dark, comfortable/compact and mobile, including long Korean, English and Japanese text. Consumer overrides remain supported; follow the [shared override and acceptance guidance](common.md#styling-themes-and-overrides). Actual engine results and manual limits are in the [support matrix](../design/public-ui-support.md).
