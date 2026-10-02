# Badge

Use Badge for concise status/category text. Prefer readable body/helper text for essential instructions, Button for actions, and a real link for navigation.

## API and wrapper defaults

Exports: `Badge`, `badgeVariants`. Native span props plus `variant` and `asChild`. Defaults: **variant="default", asChild=false**. Variants: `default`, `secondary`, `outline`, `destructive`, `success`, `warning`, `error`, `info`. asChild uses Slot.Root; no disabled/loading or announcement API. Default text is intentionally small and single-line.

The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. [Wrapper source](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/src/components/ui/badge.tsx) is the API authority.

## Composition

```tsx
<Badge variant="success">Complete</Badge>
<Badge variant="error">Save failed</Badge>
<Badge asChild variant="outline"><a href="/activity">Activity</a></Badge>
```

Import the named components from `@naeil/ui/ui`. Variables/handlers in snippets are consumer-owned. Run **UI / Badge / Usage** in Storybook for a complete interactive example; its Docs page renders this same guide.

## Keyboard, focus and accessible content

Static badges are not focusable. Name status by text, not only color/icon. Dynamic important status needs an appropriate surrounding status/alert region; Badge alone does not announce changes. asChild links use native keyboard behavior; an icon-only badge needs an accessible text equivalent.

## States, resilience and mistakes

Pending/empty/error are literal status content; disabled is inapplicable to a static badge. Avoid essential long text in tiny tags; use a paragraph instead, or deliberate `whitespace-normal break-words max-w-full` overrides and review. Do not infer interactivity from hover or pass disabled to a span/link.

Check this example in light/dark, comfortable/compact and mobile, including long Korean, English and Japanese text. Consumer overrides remain supported; follow the [shared override and acceptance guidance](common.md#styling-themes-and-overrides). Actual engine results and manual limits are in the [support matrix](../design/public-ui-support.md).
