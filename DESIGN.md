# naeil UI v2 — Design brief

Status: Visual direction accepted on 2026-09-29: neutral palette, Pretendard, larger text, purpose-specific widths, comfortable spacing by default, compact spacing for dense views, and short restrained transitions respecting reduced motion. Implemented in the shared package and actual-component Storybook examples. Independent review findings have been addressed; validation evidence and remaining limits are in [the verification report](https://github.com/naeil-dev/naeil-ui/blob/main/docs/design/v2-verification.md). See [the v2 specification](https://github.com/naeil-dev/naeil-ui/blob/main/docs/superpowers/specs/2026-09-29-shared-ui-v2-design.md) for scope. Publishing and deployment are separate.

## Purpose and scope

Build a shared design system that gives naeil products a precise, calm, coherent interface. The deliverables are design rules, tokens, reusable React components, composition examples, and instructions for consumers and coding agents.

The design must work for settings, forms, lists, and information panels across products. naeil.dev page composition, project illustrations, hero scenes, and other site content are outside this brief. Existing brand components in the public package require an explicit migration decision before their API changes.

## Reference and provenance

- Selected by the user: Linear, on 2026-09-29.
- Source: https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md
- Workflow reference: https://www.threads.com/@automation_claire/post/Dd1GZoREhnt
- Follow-up constraints: https://www.threads.com/@automation_claire/post/Dd1GcQGkpbL

The source is a third-party analysis of Linear's marketing pages, not an official specification of Linear's application. Its light theme, form validation, and complete application state palette are not documented. Source values are reference material, not verified accessibility results.

Adopt from the reference:

- Neutral surfaces with a slight cool tint and a consistent hierarchy of surface levels.
- A restrained accent for important actions, selection, links, and focus.
- Fine borders and surface differences to establish grouping and depth.
- Medium and semibold typography with explicit roles.
- A 4px spacing foundation and role-specific corner radii.

Adapt for naeil:

- Support both light and dark modes; the source's dark-only marketing rule does not apply.
- Use available fonts with Korean, Japanese, and Latin coverage, rather than Linear's proprietary fonts.
- Define success, warning, error, information, loading, empty, disabled, and selected states for product workflows.
- Establish product UI sizes rather than adopting marketing display sizes and section spacing.
- Keep the accent replaceable through a documented, accessible theme contract.

## Visual direction

Precision comes from consistent alignment, spacing, hierarchy, and interaction states. Group related information through proximity and separators; use a panel when it represents a meaningful group. Give the main task the strongest visual emphasis.

Use restrained rounding and quiet surface treatments. Gradients, glow, backdrop blur, and animated decoration are not default component treatments. Motion should communicate a state change or spatial relationship.

## Selected visual foundation

The neutral palette, larger-text direction, Pretendard, and the reviewed content-width recommendations are selected. The user also accepted the recommended comfortable spacing, demonstrated state direction, and short transitions. Engineering and compatibility decisions are consolidated in the linked specification. These are naeil decisions, not assertions about Linear's product UI.

### Color and surfaces

Define semantic roles before choosing final palette values:

| Role | Purpose |
| --- | --- |
| canvas | Application background |
| surface | Grouped content and panels |
| surface-raised | Menus, popovers, dialogs |
| surface-hover | Pointer hover on interactive surfaces |
| surface-selected | Persistent selection, distinct from hover |
| text-primary / secondary / disabled | Text hierarchy with explicit use restrictions |
| border / border-strong | Group boundaries and control boundaries |
| action / action-hover / action-pressed / on-action | Primary action colors |
| focus | Keyboard focus indicator |
| success / warning / error / info | Feedback, each with text and subtle-surface companions |

Use neutral surfaces, neutral selection backgrounds, and a neutral action palette as the shared default. The user selected neutral over blue and teal after comparing the revised study. Purple actions and purple selection backgrounds were rejected. Blue and teal remain comparison history, not required shipped themes. Provide complete light/dark roles and validate actual text and control states before publishing.

Brand/action, muted surface, and focus are separate semantic decisions even when some share a color. A project accent override must include its foreground and interaction states; replacing a single hue must not silently break legibility.

Normal text must meet 4.5:1 contrast, large text 3:1, and essential control boundaries and state indicators 3:1 against adjacent colors. Validate rendered combinations, including opacity. Decorative separators need not be treated as control boundaries. Disabled styles must not be reused for readable metadata.

### Typography

Selected UI family: Pretendard for Korean/Latin UI, with Noto Sans JP used for Japanese in the reviewed samples. JetBrains Mono for code and identifiers is still a proposal; it was not part of the font comparison. Font delivery must be documented for package consumers. Verify all three languages in specimens.

| Role | Size / line height | Weight |
| --- | --- | --- |
| Page title | 32 / 42px | 600 |
| Section title | 20 / 29px | 600 |
| Component title | 16 / 25px | 600 |
| UI body | 16 / 25px | 400 |
| Reading body | 16 / 30px | 400 |
| Label and control | 16 / 25px | 500 |
| Supporting text | 14 / 22px | 400 |
| Metadata | 13 / 20px | 400 |

Do not tighten body letter spacing to imitate a marketing headline. Metadata remains readable. Form labels, errors, and essential information must not shrink to badge-sized text. Preserve mobile input sizing where needed to avoid browser auto-zoom.

### Size, spacing, and shape

- Foundation: 4, 8, 12, 16, 24, 32, 48, 64px; allow named 2px optical adjustments for icons and indicators.
- Default control height: 40px. Compact control height: 36px, for deliberate dense layouts. Touch interaction areas: at least 44px, without overlapping adjacent targets.
- Default form/panel padding: 24px; compact form padding: 20px. Use 8px within a field and 24px between field groups, reduced to 16px in compact forms. Explicitly small surfaces may use 16px padding.
- Small tags: 4px radius. Buttons and inputs: 8px. Panels and dialogs: 12px. Circular avatars remain circular.
- Layout density must be consistent within a control group; individual consumers should not invent independent padding scales.

### Motion

Use named fast (120ms) and standard (180ms) transitions for color and opacity, with at most a small movement for notifications. Reduced-motion mode removes transitions and spatial movement. Do not add default spring, bounce, magnetic, or decorative motion. Kinetics was inspected as a reference; its effects were not adopted.

## Components and composition

First implement the foundation and existing eight families: Button, Input, Card, Dialog, DropdownMenu, Badge, Avatar, and Toaster. Align shared title primitives and theme controls with the same foundation.

- Button: clear primary/secondary/quiet/destructive hierarchy; specified hover, pressed, focus, disabled, and loading behavior.
- Input: visible field boundaries, label/help/error composition, and clear focus/invalid states.
- Card: grouping and surface role, without implying that every content block needs a card. Distinguish static and interactive examples.
- Dialog and menu: coherent raised surfaces, keyboard interaction, visible focus, and appropriate dismissal behavior.
- Badge and toast: status meaning conveyed by text or icon as well as color.
- Avatar: readable fallback initials; imagery supplied by the consumer.

Demonstrate the system in three neutral compositions: a settings form, a selectable list with metadata, and a detail panel with actions. These are library examples, not a redesign of a particular website. Additional public components require a demonstrated composition need.

### Application frame and content widths

The application frame owns navigation placement and outer gutters; each content region owns its purpose-specific width. A narrow settings form inside that frame must not move the shared navigation. For routes using the same frame, keep navigation anchors stable at the same viewport, language and theme, including loading and changing summary counts. A shared Header import alone does not establish this consistency.

Choose a product's frame width from its tasks, information density and representative content. A dashboard name or a wide monitor alone does not justify filling all available space. Inspect sparse as well as dense content before selecting a cap or fluid layout. The shared reading/settings/list defaults remain content rules, not a universal application maximum; RelayDock's 1600px decision is not a shared token.

Internal columns must respond to the space available inside their region. Use container queries or an equivalent content-aware layout when viewport breakpoints no longer represent that space. Keep wide tables locally scrollable; check localized labels, wrapping and controls inside cells as well as page overflow. See the [consumer composition guide](docs/design/v2-migration.md#앱-전체-틀과-콘텐츠-폭) for application ownership and checks.

## Connection to implementation

Use one canonical token source to generate the CSS that the package actually exports and that contrast checks inspect. Wire typography, radii, spacing, elevation, and motion into that same system. The visual design brief explains roles; numeric implementation values must be synchronized with the token source.

Preserve Radix interaction behavior and the existing React/Tailwind integration unless a concrete requirement warrants a change. Inventory current public exports before migration. Existing Nav, Footer, Logo, project colors, and deep import contracts need explicit compatibility decisions; do not silently remove them during a visual pass.

Consumer and repository agent guidance must explicitly point to this design document and the component APIs. External examples may fill an identified gap, and their adopted rules or code must be attributed. No custom skill or plugin is required to deliver v2. Installing a tool is a separate decision from selecting a design reference.

## Evaluation and acceptance

Compare the same compositions and content in light/dark themes, desktop/mobile widths, and Korean/Japanese/English. Include long labels, multiline content, keyboard focus, errors, disabled controls, and loading examples.

Before release, verify generated token consistency, public-package consumption, component behavior and accessibility, and visual results. Review actual screenshots or a working preview; a token table alone does not establish visual quality.

For application layout changes, compare affected routes side by side under the same conditions and verify the frame invariants separately from each page's component checks. Record functional checks, shared-design compliance and visual composition as distinct results. Keep prior findings open until remeasured or explicitly scoped out; a layout review does not close unrelated contrast, nested-control or touch findings.

The visual comparisons and implementation scope are accepted. Token generation, component behavior, packed consumption, and actual browser examples have been implemented and checked; see the verification report for results and limits.

## Historical design studies

The sections below record prototype-stage decisions and checks as they occurred. Their references to pending production work describe that earlier stage; current implementation status is above.

## Accepted direction — typography and content widths

The accepted comparison artifact is `docs/design/v2-typography-width.html`. It retains the selected neutral palette and compares font family and width independently. The original composition study remains in `docs/design/v2-preview.html`. These review screens do not modify the production library.

- Compare Pretendard (current recommendation) and Noto Sans KR with identical Korean/English text, 16px body, 14px supporting text, 20px headings, and matching weights/spacing. Both use explicitly loaded Noto Sans JP for Japanese samples; this is a shared Japanese companion, not a comparison between Japanese font candidates. Monospace font selection is outside this review.
- Let either font drive the same reading, settings, and task-table examples. Font loading status is visible; a fallback rendering must not be presented as a successful candidate comparison.
- Compare maximum outer content widths: reading 560/640/800px, settings 480/640/800px, and task lists 960/1,200px/available width. The user accepted 640px for reading and settings, and 1,200px for task lists as design defaults. These still need to be implemented as tokens. Short forms may use 480px; data-heavy layouts may need available width.
- Maximum widths shrink to available space on small screens. The comparison stage and its padding are review-page scaffolding, not a proposed universal application shell. A wide table scrolls inside its region on mobile, while reading and forms reflow.

Sources: [Pretendard](https://github.com/orioncactus/pretendard), [Noto Sans KR](https://fonts.google.com/noto/specimen/Noto+Sans+KR), and [Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP). The prototype loads fonts through jsDelivr and Google Fonts; production delivery remains to be decided.

Browser checks at 1440px confirmed candidate font loads and all nine width choices. At 390px the three layouts fit without page-level horizontal overflow, the table retains internal scrolling, and form inputs retain 16px text. These checks support the visual review and do not replace production accessibility or cross-browser testing. Subsequent spacing/state/motion recommendations have also been accepted; production coverage and verification remain outstanding.

## Accepted direction — spacing, states, and motion

`docs/design/v2-spacing-states.html` reuses the interactive neutral composition, with an independent settings example capped at 640px and a list/detail example capped at 1,200px. It preserves 16px main text and compares comfortable/compact spacing (40/36px controls, minimum 72/60px list rows). Mobile targets keep their larger sizes.

Review controls expose normal, loading, empty, and recoverable error list states. The existing email validation/recovery, simulated save, selected task, disabled action, language combobox, dialog, and toast remain available. Scenario data is simulated and resets on reload.

The user accepted the motion recommendation: short color transitions (120ms), menu entrance opacity (120ms), and dialog/toast transitions (180ms), alongside an explicit no-motion option. OS reduced-motion settings take priority. These are our selected rules, not adaptations from Kinetics or output from Impeccable. A subsequent reference review confirmed the Select gap and retained Radix as the implementation basis; see the specification for sources. Production component coverage, accessibility checks, and polish remain outstanding.

Browser verification confirmed the 640/1,200px example widths, all four list scenarios, error retry, task creation from the empty-state action, invalid email and recovery, and simulated save completion. Density retained 16px task titles; the compact two-line rows grew above their 60px minimum to fit their content. Motion-off disabled the dialog animation. At 390px there was no page overflow and inputs remained 44px high. OS reduced-motion behavior is specified in CSS but was not separately emulated in this browser check.

## Composition study — selected neutral direction

The standalone review artifact is `docs/design/v2-preview.html`. It is a disposable HTML/CSS/JavaScript prototype; the package implementation is unchanged. Open it directly or serve it locally. The specimen uses CDN-hosted Pretendard with system fallbacks. Form saves and tasks are simulated in memory and reset on reload.

The user requested larger typography, alternatives to the purple action and selected surfaces, and a coherent language dropdown. The current study uses 16px body/control/label text, 14px supporting text, and 13px metadata. Default/compact controls are 40/36px and task rows 72/60px; mobile controls remain at least 44px. Density changes spacing, not font size.

The current preview uses the selected neutral palette and retains light/dark and density controls. Palette comparison controls have been removed. Selected surfaces are #262626 in dark mode and #ebebeb in light mode. Selected-list indicators use the accent-text role for contrast against the selected surface. The comparison values below are retained as decision history.

| Palette | Dark action / foreground | Light action / foreground | Action text contrast, dark / light |
| --- | --- | --- | --- |
| Neutral (selected default) | #e5e5e5 / #171717 | #292929 / #ffffff | 14.23 / 14.55 |
| Blue (comparison only) | #3269ce / #ffffff | #245ec7 / #ffffff | 5.19 / 6.00 |
| Teal (comparison only) | #16756b / #ffffff | #116e64 / #ffffff | 5.54 / 6.11 |

The neutral default includes hover, focus, and accent-text roles; the earlier comparisons also supplied these roles. These measured button text pairs are not a complete accessibility certification. Semantic success/warning/error colors remain distinct from the replaceable action palette.

The language control now demonstrates a styled select-only combobox and opaque listbox in the browser's popover top layer. The menu matches the trigger width, marks the selected option, and opens above when space below is insufficient. It supports arrows, Home/End, Enter/Space, Escape, Tab dismissal, and text lookup. Selection updates a hidden form value; it does not translate the page. This is a visual/interaction probe: production implementation should use the established accessible primitives and undergo assistive-technology testing.

The prototype also demonstrates a settings form, searchable task list, detail panel, new-task dialog, toast, status badges, disabled controls, and invalid/recovered input. The revised dark desktop and light mobile layouts, menu visibility, and primary button text contrast were inspected in a browser. Broader component, language, and accessibility verification belongs to implementation.

### Previous study

Study 01 proposed purple actions (#6863dc dark / #6057cf light), purple selected surfaces, 14px controls and 12px metadata, and a native language select. Those choices have been superseded by study 02 in response to user feedback. Linear remains the structural reference; its brand color is not prescribed.
