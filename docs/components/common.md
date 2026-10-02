# Shared usage contract

These guides describe the prepared **0.3.0, unpublished** package. Start with the [consumer setup and migration](../design/v2-migration.md). All listed exports are available from `@naeil/ui/ui`; the legacy root needs the optional Next/next-intl peers. Examples import real wrappers; product state, validation and network requests belong to consumers.

## Styling, themes and overrides

Import `@naeil/ui/globals.css` once and register `@source` for the installed package's `dist` in your Tailwind 4 build. Alternatively load both theme.css and components.css alongside your existing Tailwind setup. Deliver Pretendard and, for Japanese, Noto Sans JP locally through your app's font pipeline; the package does not fetch fonts. Keep font OFL notices with redistributed binaries. The independent React example demonstrates consumer-owned delivery.

Use `.light`/`.dark` on the document root to override OS theme. Root `data-ui-density="compact"` changes spacing, not text size: default controls are 40px, compact 36px, small screens/coarse pointers at least 44px. Portals use document-level styles/density, so a locally themed subtree alone does not theme portaled content. Purpose-specific reading/settings/list widths are 640/640/1200px caps that shrink to available space; the product owns its application frame.

`className` is merged by `cn` (clsx + tailwind-merge). Consumer classes and primitive props remain available. Recheck specificity, text/control/focus contrast, mobile targets and portaled content after overriding. Override semantic color companions together; do not replace only an action hue or remove focus outlines. Reduced-motion rules remove shared transitions/animations. Custom consumer animation still needs its own reduced-motion treatment.

## Semantics and state ownership

Give every input/action a visible accessible name. Connect native labels with IDs, helper/error text with `aria-describedby`, invalid controls with `aria-invalid`, and async outcomes with an appropriate status/alert region. Placeholder is not a label. Preserve input on failure, give a recovery action, and enforce server validation in your application.

Loading is composition: state + meaningful text + `aria-busy`, with `disabled` when repeating the operation is invalid. Button has no `loading` prop. Static Card/Badge/Avatar do not gain loading/disabled/error behavior merely from an ARIA attribute. Use meaningful content and surrounding status messages. Native links are not disabled by a `disabled` prop forwarded through `asChild`.

Avoid nested buttons/links or embedding unrelated controls in a single clickable surface. A small Switch/Checkbox graphic has a 44px pseudo-element target; keep label rows at least 44px and leave room so adjacent targets do not overlap. Test actual pointer hit areas, keyboard focus and text wrapping in the consumer.

## Long and localized content

Examples include Korean, English and Japanese. Set `lang` on translated content (Japanese selects Noto Sans JP in shared globals). Use responsive widths, `min-width: 0`, flexible heights and consumer wrapping classes for long actions/status text. The wrappers may use single-line truncation; retain the complete accessible name and offer the full value elsewhere if necessary. Do not shrink essential text to fit.

Run each affected composition under matching light/dark, comfortable/compact, mobile and long-content conditions. Check 320 CSS-pixel reflow, text scaling, CSS zoom and actual native browser zoom separately. Axe and keyboard automation do not replace assistive-technology use. Follow the [manual acceptance and support matrix](../design/public-ui-support.md) and [dated verification](../design/public-ui-stage3-verification.md).

[Field/choice composition](composition.md) gives complete label/error and native-radio guidance. [Tabs](tabs.md) and [Textarea](textarea.md) extend the same shared contract; current extension results are in [Stage 4 verification](../design/public-ui-stage4-verification.md).

## Exact inherited contracts

Native wrappers use React 19 element props: inspect your installed `@types/react/index.d.ts`, or infer `React.ComponentProps<typeof Component>`. Radix wrappers use `React.ComponentProps<typeof Primitive.Part>`; inspect the installed declarations reached through `radix-ui/dist/index.d.ts`. Per-family guides link pinned declarations inspected locally during this work. Those links describe the inherited contract, not a promise that all primitive configurations have been tested. Wrapper defaults below are separate from primitive defaults; omitted primitive defaults are not invented here. Consumer examples and browser checks demonstrate only their recorded configuration.
