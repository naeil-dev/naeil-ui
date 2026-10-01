# Card

Use Card to group related information or a form. Use plain sections/headings for content that needs no surface, Dialog for a modal task. CardElevated expresses an elevated surface; neither is an interactive control.

## API and wrapper defaults

Exports: `Card`, `CardElevated`, `CardHeader`, `CardFooter`, `CardTitle`, `CardAction`, `CardDescription`, `CardContent`. All accept `React.ComponentProps<"div">`; no variant/size/asChild/loading API. Card and CardElevated use `data-slot="card"`, default panel spacing and consumer className; CardElevated adds shadow/elevated dark surface. CardTitle is a **div**, not a semantic heading. CardAction occupies the second header column.

The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. [Wrapper source](https://github.com/naeil-dev/naeil-ui/blob/main/src/components/ui/card.tsx) is the API authority.

## Composition

```tsx
<Card>
  <CardHeader><CardTitle><h2>Profile</h2></CardTitle>
    <CardDescription>Public account details.</CardDescription></CardHeader>
  <CardContent><p>No profile description yet.</p></CardContent>
  <CardFooter><Button type="button">Edit profile</Button></CardFooter>
</Card>
```

Import the named components from `@naeil/ui/ui`. Variables/handlers in snippets are consumer-owned. Run **UI / Card / Usage** in Storybook for a complete interactive example; its Docs page renders this same guide.

## Keyboard, focus and accessible content

Static cards are not tab stops. Put real buttons/links inside and a semantic heading inside CardTitle. A region label is the consumer’s choice; do not add button role/tabIndex to a card containing other controls.

## States, resilience and mistakes

Loading/empty/error are consumer content with status/retry actions, not Card props; disabled is inapplicable to the static surface. Keep CardAction concise, wrap long localized headings and use `w-full max-w-*` instead of fixed widths. Avoid nested cards and implicit clickable-card behavior; an entire link card must contain no nested controls.

Check this example in light/dark, comfortable/compact and mobile, including long Korean, English and Japanese text. Consumer overrides remain supported; follow the [shared override and acceptance guidance](common.md#styling-themes-and-overrides). Actual engine results and manual limits are in the [support matrix](../design/public-ui-support.md).
