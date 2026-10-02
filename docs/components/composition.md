# Fields and choice composition

The screen owns form state, validation, IDs and asynchronous work. `@naeil/ui` adds no FormField wrapper, form-state context or RadioGroup API. Existing HTML plus shared controls covers the observed common contract; see the [demand decision](../design/component-demand.md).

## Label, help, error and recovery

```tsx
import { useId, useRef, useState } from 'react';
import { Button, Textarea } from '@naeil/ui/ui';

function NotesForm() {
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const [invalid, setInvalid] = useState(false);
  const [status, setStatus] = useState('');
  return <form noValidate onSubmit={event => {
    event.preventDefault();
    const valid = field.current!.validity.valid;
    setInvalid(!valid);
    if (!valid) { field.current!.focus(); return; }
    // Application-owned persistence and server validation go here.
    setStatus('Notes accepted for this example.');
  }} className="grid gap-6">
    <div className="grid gap-2">
      <label htmlFor={id}>Notes</label>
      <Textarea ref={field} id={id} name="notes" required
        aria-invalid={invalid} aria-describedby={`${id}-help ${id}-error`}
        onChange={() => { setInvalid(false); setStatus(''); }} />
      <p id={`${id}-help`}>Enter a description. Enter starts a new line.</p>
      <p id={`${id}-error`} role="alert">{invalid ? 'Enter notes before saving.' : ''}</p>
    </div>
    <Button type="submit">Save notes</Button>
    <p role="status">{status}</p>
  </form>;
}
```

Use the same label/help/error relationship with [Input](input.md); put it on [SelectTrigger](select.md) for Select. Keep existing description IDs when appending an error ID. Do not use placeholder as a name or nest multiple controls inside one label. `useId` avoids collisions when a composition repeats. Announce persistent errors once and preserve drafts; disable repeated submission with meaningful busy text when necessary. Disabled fields are omitted from FormData; read-only values remain included. HTML client validation is not server validation.

## Choose values with native radios or Select

For a small visible set of mutually exclusive values, use a `fieldset`/`legend` and native radios sharing one `name`. The label row provides the 44px target; leave space between rows. Native checked state, arrow navigation, form values and required validation remain native.

```tsx
<fieldset>
  <legend>Delivery channel</legend>
  <label className="ui-choice-label">
    <input className="ui-focus accent-primary" type="radio"
      name="delivery" value="instant" defaultChecked required />
    Instant delivery
  </label>
  <label className="ui-choice-label">
    <input className="ui-focus accent-primary" type="radio"
      name="delivery" value="digest" />
    Daily digest
  </label>
</fieldset>
```

Use a unique group name for separate forms/groups, or controlled `checked`/`onChange` when the product owns state. Connect group help/errors through `aria-describedby` and associate field-level errors where needed. A card selection still needs a value-input contract; visual selection or `aria-pressed` alone does not create radio semantics.

Use [Select](select.md) for a compact finite value input, for example a language, and preserve its `name` for form submission. Checkbox means independent boolean choices; Switch means an on/off preference. Do not use DropdownMenu action-radio items as the form's ordinary value input.

## Actions, toggle actions and panels

A Button performs an action such as clearing a draft. A toggle action such as pinning a preview uses a stable visible label and `aria-pressed`; it is not automatically a mutually exclusive form option. DropdownMenu groups commands. Tabs switches related panels; links navigate routes. These choices depend on the task, not the shape of the control.

Run **UI / Textarea / Usage** for the complete field/radio/Select/action/toggle specimen and **UI / Tabs / Usage** for panel state/mount responsibility. Both use actual public controls. Apply the [shared contract](common.md) and preserve the product's application frame outside purpose-specific settings/reading/list widths. Check keyboard, native FormData, errors, long text, themes/density and overrides. [Manual acceptance](../design/public-ui-support.md) remains separate from automated checks.
