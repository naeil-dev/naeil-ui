# Textarea

Use Textarea for plain multiline text. Use Input for single-line values. Rich-text/code editors, autosizing, chat submission shortcuts and file/paste processing belong to the product.

## API and wrapper defaults

Export: `Textarea`. Accepts `React.ComponentProps<"textarea">`, including React 19 `ref`, `rows`, `cols`, `name`, `form`, `value`/`defaultValue`, `onChange`, `onKeyDown`, `onPaste`, `required`, `readOnly`, `disabled`, `minLength`/`maxLength`, `autoComplete`, `wrap`, ARIA, `className` and `style`.

The wrapper sets only slot/classes; **omitted `rows` retains the native two-row default**. It defaults to vertical resizing, full available width, 16px text, 25px line height and 8px vertical padding. Root density supplies the existing 40/36px minimum, raised to at least 44px on mobile/coarse pointers; rows and text determine the actual multiline height. It has no fixed control height or content autosizing. Consumer `rows`, resizing classes, padding and styles remain available. No label, error, value, validation or disabled default is invented.

The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. [Wrapper source](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/src/components/ui/textarea.tsx) is the API authority. Native props are defined by the installed React 19 declarations and HTML textarea behavior.

## Composition

```tsx
import { Textarea } from '@naeil/ui/ui';

<label htmlFor="notes">Workspace notes</label>
<Textarea id="notes" name="notes" rows={4} required
  aria-invalid={invalid} aria-describedby="notes-help notes-error" />
<p id="notes-help">Describe the workspace. Enter starts a new line.</p>
<p id="notes-error" role="alert">{invalid ? 'Enter workspace notes.' : ''}</p>
```

The screen owns `invalid` and submission. Run **UI / Textarea / Usage** and its Docs page for native row/ref/form behavior, invalid recovery, disabled/read-only controls, localization and field/radio/Select/action composition. See the complete [field composition guide](./composition.md).

## Keyboard, focus and accessible content

Use a visible label and unique ID; placeholder is supplementary. Connect existing help/error IDs with `aria-describedby`; set `aria-invalid` when validation fails. On failed submit preserve the value and focus the invalid field; announce asynchronous outcomes with a status/alert region. Tab focuses the textarea; Enter inserts a newline. The wrapper adds no shortcuts and does not intercept composition events. A consumer chat handler must account for IME and modifier keys itself.

## States, resilience and mistakes

Support empty/placeholder, editable, invalid/recovery, read-only and disabled states. Read-only controls remain focusable and submit their name/value; disabled controls do neither. Native `required` and length constraints are available; server validation remains consumer-owned. Use either controlled `value` + handler or `defaultValue`, and do not switch modes.

Long text scrolls inside the native control and can be resized vertically; labels/help/errors wrap outside it. Check long Korean/English/Japanese, both themes and densities, mobile input size, focus/error boundaries and override classes. Normal and invalid boundaries use existing semantic tokens, reduced motion removes transitions, and shared font delivery stays consumer-owned. Do not lower essential mobile text or remove focus to imitate a specialized editor. [Support and manual acceptance](../design/public-ui-support.md) distinguish engine checks from Safari/screen-reader/device certification.
