# Avatar

Use Avatar for a person/team identity image with a fallback. Prefer plain names when imagery adds no value; put actions on a named Button/link rather than on the Avatar span.

## API and wrapper defaults

Exports: `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`.

Avatar forwards Radix Root span props and defaults **size="default"**; sizes `sm`/`default`/`lg` render 24/32/40px graphics. Image forwards native image props and `onLoadingStatusChange`. Fallback accepts `delayMs`; wrapper sets no delay default. Badge is a span; Group/GroupCount are divs. These have styling, not automatic presence, count, tooltip or click logic.

Inherited [Avatar 1.1.10 declaration](https://unpkg.com/@radix-ui/react-avatar@1.1.10/dist/index.d.ts).

The [shared usage contract](common.md) covers setup, inherited/native prop typing, themes, density, font delivery and overrides. [Wrapper source](https://github.com/naeil-dev/naeil-ui/blob/main/src/components/ui/avatar.tsx) is the API authority.

## Composition

```tsx
<div className="flex items-center gap-3">
  <Avatar><AvatarImage src={person.photo} alt="" />
    <AvatarFallback aria-hidden="true">AL</AvatarFallback></Avatar>
  <span>{person.name}</span>
</div>
```

Import the named components from `@naeil/ui/ui`. Variables/handlers in snippets are consumer-owned. Run **UI / Avatar / Usage** in Storybook for a complete interactive example; its Docs page renders this same guide.

## Keyboard, focus and accessible content

Use alt="" and hide redundant initials when an adjacent name conveys the identity; otherwise provide meaningful alt and a labeled fallback (e.g. role="img" aria-label="Alex Lee"). Avatar itself is not a button/tab stop. Presence markers/counts need visible or accessible text; color alone is insufficient.

## States, resilience and mistakes

Loading or failed image falls back; demonstrate missing/error/loaded images. Empty identity needs a consumer placeholder, not fabricated initials. Disabled does not apply to the graphic. GroupCount is supplied by consumers and does not compute hidden members. Long Korean/English/Japanese names belong beside the fixed graphic and wrap; keep meaningful counts accessible and do not turn tiny avatar imagery into an undersized target.

Check this example in light/dark, comfortable/compact and mobile, including long Korean, English and Japanese text. Consumer overrides remain supported; follow the [shared override and acceptance guidance](common.md#styling-themes-and-overrides). Actual engine results and manual limits are in the [support matrix](../design/public-ui-support.md).
