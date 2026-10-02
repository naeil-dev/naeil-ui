# Dialog

Use Dialog for a focused modal task or detail that requires an interruption. Prefer an inline panel for ordinary editing and a native confirmation flow suited to destructive actions; this package does not export AlertDialog.

## API and wrapper defaults

Exports: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`, `DialogPortal`, `DialogOverlay`.

Root forwards Radix `open`/`defaultOpen`/`onOpenChange`/`modal`; wrapper adds no root defaults. Trigger/Close accept primitive button props including `asChild`. Content forwards primitive focus/outside/Escape handlers and **defaults `showCloseButton=true`**; it creates its own Portal and Overlay. Footer is a div with **`showCloseButton=false`**. Header is a div; Title/Description wrap primitive semantic elements. Built-in close labels are English `Close`. For localized close controls set Content showCloseButton=false and compose DialogClose. Content does not expose a portal `container` prop; the separately exported DialogPortal is for a custom composition.

Inherited [Dialog 1.1.15 declaration](https://unpkg.com/@radix-ui/react-dialog@1.1.15/dist/index.d.ts).

The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. [Wrapper source](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/src/components/ui/dialog.tsx) is the API authority.

## Composition

```tsx
<Dialog>
  <DialogTrigger asChild><Button type="button">Edit name</Button></DialogTrigger>
  <DialogContent showCloseButton={false}>
    <DialogHeader><DialogTitle>Edit name</DialogTitle>
      <DialogDescription>Change your display name.</DialogDescription></DialogHeader>
    <label htmlFor="name">Name</label><Input id="name" />
    <DialogFooter><DialogClose asChild>
      <Button type="button" variant="outline">Cancel</Button>
    </DialogClose></DialogFooter>
  </DialogContent>
</Dialog>
```

Import the named components from `@naeil/ui/ui`. Variables/handlers in snippets are consumer-owned. Run **UI / Dialog / Usage** in Storybook for a complete interactive example; its Docs page renders this same guide.

## Keyboard, focus and accessible content

For the modal example, opening moves focus inside, Tab/Shift+Tab stay inside, Escape dismisses and focus returns to Trigger. Preserve default focus handlers unless you supply an equivalent appropriate destination. Always provide DialogTitle and a relevant Description; use aria-describedby={undefined} only when intentionally omitting a description. A triggerless controlled dialog requires a consumer focus-return destination.

## States, resilience and mistakes

Disabled applies to triggers/actions; loading/error/empty are content state. Keep failed input inside the dialog and enable retry. Long/mobile content should remain scrollable within the viewport (e.g. max-h-[calc(100%-2rem)] overflow-y-auto); do not hide all close actions. Consumer outside-dismissal overrides need keyboard/focus review. Do not nest modal roots casually or prevent Escape without an accessible exit.

Check this example in light/dark, comfortable/compact and mobile, including long Korean, English and Japanese text. Consumer overrides remain supported; follow the [shared override and acceptance guidance](common.md#styling-themes-and-overrides). Actual engine results and manual limits are in the [support matrix](../design/public-ui-support.md).
