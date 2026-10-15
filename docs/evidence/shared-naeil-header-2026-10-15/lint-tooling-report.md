# Generated trace viewer lint boundary

Root cause: preserved Playwright HTML reports include generated third-party trace viewer JavaScript under `docs/evidence/**/trace/**`. ESLint already excluded normal `playwright-report/**` and `test-results/**`, but custom evidence destinations were outside that boundary. The original `lint-final.log` reports1,028errors and11,177warnings from those viewer bundles plus the existing logo-study warning. Original reports and failure logs remain unchanged.

Only source change: add one explicit global ignore in `eslint.config.mjs`:

```diff
     "test-results/**",
+    // Playwright's generated third-party trace viewer, preserved with evidence reports.
+    "docs/evidence/**/trace/**",
     ".storybook/.generated/**",
```

This excludes the generated trace-viewer subtree only. Source code, ESLint rules and other evidence scripts remain subject to lint. No runtime/UI/package implementation changed.

Verification: full `pnpm lint` exited0. New output is preserved in `lint-final-recheck1.log`:0errors,1existing warning at `docs/design/logo-study-2026-10-09/verify_browser.mjs:34:70` (`@typescript-eslint/no-unused-expressions`). `git diff --check -- eslint.config.mjs` also exited0. No commit, push, publication or deployment.
