# Sheet

Use Sheet for supporting detail or evidence that belongs at the edge of the current task. AB Storm's repeated 480px evidence panel is the demonstrated composition need. Prefer an inline panel for ordinary editing and [Dialog](dialog.md) for a centered interruption. Available since 0.12.0. See [release identities and publication status](../package-release.md#publication-and-deployment) for the current published release.

## API and wrapper defaults

Exports: `Sheet`, `SheetTrigger`, `SheetClose`, `SheetPortal`, `SheetOverlay`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`.

Root forwards Radix `open`/`defaultOpen`/`onOpenChange`/`modal`; wrapper adds no root defaults. Trigger/Close accept primitive button props including `asChild`. Content forwards primitive props, refs and focus/outside/Escape handlers and creates its own Portal and Overlay. Content adds:

| Prop | Default | Behavior |
| --- | --- | --- |
| `side` | `"right"` | `"right"`, `"left"`, `"top"` or `"bottom"`; exposed as `data-side` |
| `showCloseButton` | `true` | Shows the built-in X close button |
| `closeLabel` | `"Close"` | Screen-reader name of the built-in X; consumer supplies the UI language |

Right/left occupy the full viewport height and `min(100%, var(--ui-width-short-form))` width (480px default). Top/bottom occupy the full width, grow with content and stop at `100dvh`. All sides scroll internally. Raised surfaces, strong edge borders, inner-edge panel rounding and token padding (24px comfortable, 20px compact) follow the shared theme. `className` overrides the defaults. Content uses shared 120ms opacity motion and respects reduced motion. The X is 40px, at least 44px on small screens/coarse pointers.

Header/Footer are divs; Footer has no implicit action or close label. Title/Description wrap Radix semantic elements. Content does not expose a portal `container` prop; the separately exported SheetPortal is for a custom composition.

Inherited [Dialog 1.1.15 declaration](https://unpkg.com/@radix-ui/react-dialog@1.1.15/dist/index.d.ts). The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. The wrapper source `src/components/ui/sheet.tsx` is the API authority.

## Composition

```tsx
<Sheet>
  <SheetTrigger asChild><Button type="button">근거 보기</Button></SheetTrigger>
  <SheetContent closeLabel="닫기" lang="ko">
    <SheetHeader>
      <SheetTitle>근거</SheetTitle>
      <SheetDescription>보고서에 사용한 자료를 확인합니다.</SheetDescription>
    </SheetHeader>
    <p>소비자가 제공하는 근거와 출처</p>
  </SheetContent>
</Sheet>
```

Import the named components from `@naeil/ui/ui` or `@naeil/ui/components/ui/sheet` (Button from `/ui`). Variables/handlers and evidence data belong to consumers. Run **UI / Sheet / Usage**, **LocalizedClose** and **Sides** in Storybook; its Docs page renders this same guide. For a visible footer close, set `showCloseButton={false}` and compose `<SheetFooter><SheetClose asChild><Button>닫기</Button></SheetClose></SheetFooter>`.

## Keyboard, focus and accessible content

With Radix's modal defaults, opening moves focus inside; Tab/Shift+Tab stay inside, Escape dismisses, and focus returns to Trigger. Preserve default focus handlers unless you supply an equivalent destination. Always provide SheetTitle and a relevant SheetDescription; use `aria-describedby={undefined}` only when intentionally omitting a description. A triggerless controlled sheet requires a consumer focus-return destination. Portals inherit document-level theme/density; set the content language explicitly when needed.

## States, resilience and mistakes

Disabled applies to triggers/actions; loading/error/empty are consumer-owned content states. Keep failed input and retry actions inside the sheet. Long evidence scrolls internally; wrap long URLs and metadata rather than widening the page. Choose one close affordance: the built-in X, or an explicit SheetClose with the X disabled. Never remove every close action.

Localize `closeLabel`: Korean `닫기`, Japanese `閉じる`, English `Close`. Never leave English defaults in Korean or Japanese UI. SheetFooter has no implicit English button. Avoid casually nesting modal roots or preventing Escape without an accessible exit; consumer outside-dismissal/focus overrides need keyboard review.

Check light/dark, comfortable/compact, 320/390px mobile and long Korean, English and Japanese content. Follow the [shared override and acceptance guidance](common.md#styling-themes-and-overrides); automated keyboard/axe checks do not replace assistive-technology acceptance.
