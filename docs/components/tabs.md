# Tabs

Use Tabs to switch related panels within one view. Use links for navigation to routes, Select/native radios for values, and DropdownMenu for actions. Tabs does not own routing, data fetching or draft storage.

## API and wrapper defaults

Exports: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`. Each accepts `React.ComponentProps<typeof RadixTabs.Part>`, including element `ref`, `className`, `style`, ARIA and event handlers. There are no custom variants. Root inherits `value`/`defaultValue`/`onValueChange`, `orientation`, `dir`, `activationMode`. List inherits `loop`; Trigger requires a unique string `value` and accepts `disabled`; Content requires the matching `value` and accepts `forceMount`.

The wrappers set only slots/classes. Installed [Radix Tabs 1.1.13 declarations](https://unpkg.com/@radix-ui/react-tabs@1.1.13/dist/index.d.ts) and [runtime](https://unpkg.com/@radix-ui/react-tabs@1.1.13/dist/index.js) supply horizontal orientation, automatic activation, looping focus and enabled triggers by default. **Supply an initial `defaultValue` or controlled `value`**: omitting both leaves no panel selected until activation. `forceMount` is omitted by default: inactive panel containers are hidden and their children unmount. Draft state inside those children resets on remount; hoist state to preserve it.

`forceMount` retains children and makes inactive panels present too. Consumers must explicitly hide inactive content, for example `hidden={value !== 'draft'}`, so it cannot receive focus or appear as a second visible panel. Root has no group-wide `disabled` prop; disable individual triggers. Keep matching values, generated IDs/roles and focus handlers intact.

The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. [Wrapper source](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/src/components/ui/tabs.tsx) is the API authority.

## Composition

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@naeil/ui/ui';

<Tabs defaultValue="overview">
  <TabsList aria-label="Workspace details">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="history">History</TabsTrigger>
  </TabsList>
  <TabsContent value="overview"><p>Workspace summary.</p></TabsContent>
  <TabsContent value="history"><p>Activity history.</p></TabsContent>
</Tabs>
```

Run **UI / Tabs / Usage** and its Docs page for automatic, controlled manual/vertical, disabled, localized overflow and explicitly hidden retained panels. `activationMode="manual"` is useful when switching requires delayed loading; the consumer owns loading/error/retry and status announcements. Automatic activation is suitable when panels are immediately available.

## Keyboard, focus and accessible content

Name the tablist with `aria-label` or `aria-labelledby`. Radix supplies tab/tabpanel relationships and roving focus: horizontal arrows or vertical Up/Down move through enabled tabs; Home/End reach endpoints. Automatic mode activates on focus; manual mode activates with Enter/Space. `dir="rtl"` adjusts horizontal navigation. List `loop={false}` stops endpoint wrap. Tab leaves the list for the selected panel or its controls. Panels have `tabIndex=0` and a visible shared focus outline. Disabled triggers are skipped.

## States, resilience and mistakes

Selection uses a neutral surface and a visible bottom border; focus has a separate outline. The list scrolls locally on one keyboard axis; each trigger is capped to available list width and long labels wrap without shrinking 16px text. Triggers grow above the density minimum to fit enlarged/multiline text. Do not wrap the list itself into ambiguous keyboard rows or truncate every label to fit. Vertical lists need a consumer-chosen width suitable for their labels; use horizontal orientation on narrow screens when needed. Panels wrap long words; check their contents separately from the list.

Theme, root density, 40/36px trigger minimum heights and the mobile/coarse 44px minimum follow the existing system; wrapped or enlarged text increases height. Reduced motion removes color transitions. `className`/style and inherited props remain overrides; test state/focus/overflow after changes. Empty/error/loading panels are consumer content, not Tabs props. See [composition guidance](./composition.md) and the [current support matrix](../design/public-ui-support.md) for manual limits.
