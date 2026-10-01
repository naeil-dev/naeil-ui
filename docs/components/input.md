# Input

Use Input for native single-line text/value entry. Use a native textarea for multiline text, Select for a small known option set, and Checkbox/Switch for booleans.

## API and wrapper defaults

Export: `Input`. Accepts `React.ComponentProps<"input">`; no wrapper default for `type`, value, disabled or validation. Native omitted type resolves to text. Important props: `value` + `onChange` or `defaultValue`, `name`, `type`, `required`, `readOnly`, `disabled`, `autoComplete`, `inputMode`, `min`/`max`, `minLength`/`maxLength`, `pattern`, form and ARIA props. No built-in label, error text or async validation API.

The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. [Wrapper source](https://github.com/naeil-dev/naeil-ui/blob/main/src/components/ui/input.tsx) is the API authority.

## Composition

```tsx
<label htmlFor="email">Notification email</label>
<Input id="email" name="email" type="email" required
  autoComplete="email" aria-invalid={invalid}
  aria-describedby="email-help email-error" />
<p id="email-help">Used for important updates.</p>
<p id="email-error" role="alert">{invalid ? 'Enter a valid email address.' : ''}</p>
```

Import the named components from `@naeil/ui/ui`. Variables/handlers in snippets are consumer-owned. Run **UI / Input / Usage** in Storybook for a complete interactive example; its Docs page renders this same guide.

## Keyboard, focus and accessible content

Tab focuses the input; text/navigation/editing follow the native input type. Consumer validation should focus the first invalid field and retain its value. Use labels and described help/errors; announce asynchronous validation outcomes without announcing each keystroke. Read-only and disabled have different focus/form submission behavior.

## States, resilience and mistakes

Show normal, empty, disabled, read-only, invalid and recovery. Loading may disable submission while preserving editable values; a disabled input is omitted from FormData. Never use placeholder as the only label, mix controlled/uncontrolled values, or lower mobile font size. Long input values scroll inside the native control; wrap helper/error text outside it.

Check this example in light/dark, comfortable/compact and mobile, including long Korean, English and Japanese text. Consumer overrides remain supported; follow the [shared override and acceptance guidance](common.md#styling-themes-and-overrides). Actual engine results and manual limits are in the [support matrix](../design/public-ui-support.md).
