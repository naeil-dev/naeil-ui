# Actual built Storybook recheck2

Fresh build and artifact guard pass. Combined actual browser run:62passed,0failed (Chromium31,WebKit31). Each engine covers13whole-header and18existing navigation/footer/brand cases. The strengthened theme test requires the user's dark selection to persist after a later auth interaction and250ms; both engines pass after previousGlobal guard fix.

Whole-header coverage:390/768/1440/2560px × light/dark; fixed1280px maximum frame and24px gutters; canonical catalog/copy/status/official image loads; keyboard/hover travel and selected route; mobile touch/focus trap/Escape; locale selection and reduced motion; Japanese-only omission; interactive theme/auth; blocked decorative image fallback; actual Docs. All16whole-header axe audits report0violations. Raw incompletes remain in results/**/axe.json and attached report:8aria-valid-attr-value rows for lazy Select aria-controls,12color-contrast rows for overlapping-background inference. These are retained manual-review limits, not suppressed or claimed passes.

Opened and inspected fresh Chromium1440light desktop menu,390dark mobile sheet and WebKit1440dark desktop menu screenshots. Catalog/artwork/menu placement visible and intact. Source/fixture/index hashes are in source-and-index.sha256. New screenshots, trace-on-failure setup, raw audit attachments and browser report are isolated here; previous initial/recheck1 failures preserved.

Fresh scoped ESLint, check:types and diff whitespace checks pass. No implementation changes made during recheck2. No Firefox rerun: prior31attempt launch block remains recorded ('Could not find profile folder'); no Firefox product pass. Native devices/manual assistive technology and live OAuth remain outside these tests.

Owned Playwright Storybook6007 server automatically exited after the run; listener check confirmed port released. No commits, publication or deployment.
