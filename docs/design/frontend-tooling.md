# Optional frontend-reference workflow setup

This workflow helps an agent resolve a specific design gap using real references and verify rendered UI. It is **optional for @naeil/ui consumption and Storybook**. Ordinary UI development needs no external API key. DESIGN.md remains the authority; established neutral colors, Pretendard, content widths and restrained motion do not need fresh discovery.

## Install or read the workflow

Read [SKILL.md](../../skills/frontend-reference-workflow/SKILL.md) directly in this repository. For reusable installation, copy `skills/frontend-reference-workflow/` to your agent's documented skill directory (for example `~/.agents/skills/frontend-reference-workflow` in clients supporting it), preserving scripts, references and agent metadata. Update existing installations intentionally without overwriting unrelated config. Do not assume a maintainer's global setup or private launcher exists. Discover the skill in a fresh session; files on disk do not prove runtime discovery.

Invoke `$frontend-reference-workflow` in a compatible Codex agent or `/frontend-reference-workflow` in a compatible Claude Code setup. Other agents can follow SKILL.md as instructions. Read your client's current skill/MCP documentation before changing its config.

## Tool and key choices

| Route | Requirements | No-key path |
| --- | --- | --- |
| Shared UI | Node/pnpm locally | Full Storybook/package development |
| Refero / awesome-design-md | Browser or readable original DESIGN file | Public references; availability may vary |
| Component Gallery / Kinetics | Browser or readable original example | Public browsing for a relevant gap |
| 21st MCP | Your own key from https://21st.dev/mcp; native HTTP MCP client or Node/npm + Python for bundled stdio helper | Skip MCP; inspect public pages/existing components and record browser use |
| Impeccable | Separately installed official skill from https://github.com/pbakaus/impeccable | Use project checks; do not claim Impeccable execution |
| Browser checker | Node, Playwright Chromium and axe (repository dev dependencies) | Local checks without an external API key |

For **portable 21st credential setup, native config examples, runnable stdio commands, usage checks and error handling**, read [tools.md](../../skills/frontend-reference-workflow/references/tools.md). Keys belong to the user; do not copy maintainer credentials/config. The bundled client has no private default launcher, does not install/register MCP by itself, and supports status and metadata search only. The explicit `npx` example can download the official proxy separately from UI installation.

Configured, installed, authenticated, tool-discovered, searched, retrieved and adopted are different states. Bundled status success proves that stdio invocation and usage response; it does not expose native tools in your agent. Use current `get_usage` and stop on auth, rate-limit, quota or payment errors. Component catalog access does not prove hosted AI access.

Impeccable applies to requested/agreed substantial finishing work. Read the actual official skill/playbook. `engine-probe` and `context` differ from executing polish/distill. Binary installation is separate tool setup.

## Local helper validation

From the repository root after `pnpm install --frozen-lockfile`:

```sh
pnpm exec playwright install chromium
node --test skills/frontend-reference-workflow/tests/browser-check.test.cjs skills/frontend-reference-workflow/tests/layout-comparison.test.cjs
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s skills/frontend-reference-workflow/tests -p 'test_*.py'
```

These use local Chromium fixtures and fake MCP servers, not real 21st authentication. Follow [verification](../../skills/frontend-reference-workflow/references/verification.md) and [layout](../../skills/frontend-reference-workflow/references/layout.md) guidance. Automated success covers measured cases; manual hit testing, keyboard/state/non-text contrast, fonts and visual review remain scoped checks.

## Historical checks, not your machine's setup

A maintainer environment was installed/connected on 2026-09-29; metadata search evidence is in [the dated report](frontend-workflow-v2-verification.md). That does not prove access on a fresh installation. Opus/Sol reviewed `2026-09-30.2` in [the dual review](frontend-v2-dual-review.md). `2026-10-01.1` received [direct follow-up validation](frontend-v2-low-followup.md) without completed independent approval. Public portability revision `2026-10-02.1` changes setup and command selection; prior approval does not extend to it.

Actual reference/tool usage belongs in [frontend-sources.md](frontend-sources.md), with dates/scope. Installation does not prove design-tool execution.
