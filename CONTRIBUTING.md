# Contributing

The repository is maintained by the naeil-dev organization at https://github.com/naeil-dev/naeil-ui. Use GitHub issues for reproducible bugs and scoped proposals, and pull requests for changes. For security concerns follow [SECURITY.md](SECURITY.md). No support response time is guaranteed.

Read [AGENTS.md](AGENTS.md), [DESIGN.md](DESIGN.md), the [shared UI specification](docs/superpowers/specs/2026-09-29-shared-ui-v2-design.md), and the [consumer guide](docs/design/v2-migration.md). Preserve public imports and consumer overrides. Discuss API removals or a new visual direction before implementing them.

Use Node.js 22+ and pnpm. Run `pnpm install --frozen-lockfile`. Shared UI work can be developed with `pnpm storybook` without API keys. [Site auth setup](docs/site-development.md) and [agent tooling](docs/design/frontend-tooling.md) are separate paths.

Keep numeric foundations in `src/tokens/*.json`, regenerate using `pnpm build:tokens`, and place shared behavior styles in `src/styles/`. Product art and site-only styles stay outside shared foundations.

For package behavior changes, run `pnpm test`, `pnpm lint`, `pnpm check:contrast`, `pnpm build:pkg`, `pnpm check:package`, `pnpm build:storybook`, and `pnpm test:browser`. Install the configured engines with `pnpm exec playwright install chromium firefox webkit` when needed. Local Firefox currently fails at launch with `Could not find profile folder`; run available Chromium/WebKit locally and retain the Firefox CI path without claiming a local pass. Inspect the actual affected Storybook compositions in light/dark themes and relevant languages/viewports. Record manual, unverified, and inherited findings separately. Scope checks to the change for documentation-only fixes.

For workflow helper edits run the relevant tests in `skills/frontend-reference-workflow/tests/`; see [tooling setup](docs/design/frontend-tooling.md). Attribute adopted code and preserve required license notices. Do not include credentials, personal absolute paths, private session identifiers, or inaccessible local evidence links in public documentation.

A pull request should explain the trigger and resulting behavior, consumer compatibility, validation scope, and remaining limits. Keep generated files synchronized. Publishing an npm package and deploying the website are separate maintainer actions; a successful local build is not either action.
