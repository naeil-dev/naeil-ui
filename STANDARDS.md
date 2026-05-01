# STANDARDS.md — Design System

AI coding requests in this repo must follow the global `ai-code-management` workflow.

## Default verification

For most component/style/token changes:

```bash
pnpm lint
pnpm test
pnpm build:pkg
```

For token/theme/accessibility-sensitive changes:

```bash
pnpm build:tokens
pnpm check:contrast
```

For full app/package confidence:

```bash
pnpm build
pnpm build:pkg
```

## Operating rules

- Keep public package exports stable unless the task explicitly changes the API.
- For visual/component changes, include a screenshot or manual smoke note when practical.
- Treat tokens, theme CSS, package exports, and peer dependency changes as medium risk.
- If unrelated dirty files exist, prepare a commit packet instead of committing.
