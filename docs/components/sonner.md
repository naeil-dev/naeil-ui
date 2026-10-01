# Toaster

Use Toaster for brief nonblocking outcome feedback. Keep form errors inline and persistent; use Dialog only when a task needs focused interaction. Critical recovery must remain available after a toast expires.

## API and wrapper defaults

Export: `Toaster`. `toast` is **not** re-exported: import it from `sonner` (declare Sonner as a direct consumer dependency when using its API).

Accepts Sonner `ToasterProps`. Wrapper defaults: theme from next-themes (falls back to `system`), position **bottom-right**, duration **4000ms**, semantic icons and CSS-variable style. Props are spread last: consumer `theme`, `position`, `duration`, `icons`, `style`, `className`, `toastOptions`, `offset`, `mobileOffset`, `closeButton`, `hotkey`, `containerAriaLabel` override wrapper values; `style`/`icons` replace that object, not a deep merge. Mount one instance per intended notification scope.

Inherited [Sonner 2.0.7 declarations](https://unpkg.com/sonner@2.0.7/dist/index.d.ts). Installed Sonner implements polite notifications and Alt+T as its default focus hotkey; these are primitive behaviors, not new wrapper defaults.

The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. [Wrapper source](https://github.com/naeil-dev/naeil-ui/blob/main/src/components/ui/sonner.tsx) is the API authority.

## Composition

```tsx
import { Toaster, Button } from '@naeil/ui/ui';
import { toast } from 'sonner';
<>
  <Button type="button" onClick={() => toast.success('Settings saved.')}>Save</Button>
  <Toaster closeButton containerAriaLabel="Notifications"
    toastOptions={{ closeButtonAriaLabel: 'Dismiss notification' }} />
</>
```

Import the named components from `@naeil/ui/ui`. Variables/handlers in snippets are consumer-owned. Run **UI / Toaster / Usage** in Storybook for a complete interactive example; its Docs page renders this same guide.

## Keyboard, focus and accessible content

Sonner creates its notification region; meaningful text should convey status without color. Name notification/close controls in the product language. The tested keyboard flow uses Alt+T to focus notifications, Tab to an action. Escape collapses the notification stack; moving focus out restores the prior action. macOS WebKit may require Option+Tab/Option+Shift+Tab to include buttons under its default keyboard-navigation setting. Review conflicts before changing hotkeys. Verify actual announcements with a screen reader manually; axe does not prove them.

## States, resilience and mistakes

Demonstrate success/info/warning/error, loading updated by the same id, and an action. Toaster has no disabled/loading prop; those belong to toast calls and initiating controls. With no notifications it renders no message. Keep long multilingual text wrap-safe, use mobileOffset deliberately, avoid duplicate toasters and move persistent errors/retry to the page. Custom style/icons/animations need contrast and reduced-motion verification.

Check this example in light/dark, comfortable/compact and mobile, including long Korean, English and Japanese text. Consumer overrides remain supported; follow the [shared override and acceptance guidance](common.md#styling-themes-and-overrides). Actual engine results and manual limits are in the [support matrix](../design/public-ui-support.md).
