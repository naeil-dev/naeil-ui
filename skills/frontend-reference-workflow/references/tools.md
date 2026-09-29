# Tool routes and setup

Official sources checked 2026-09-29. Recheck before changing installations; the original Threads setup instructions may age.

## Read-only references

- Refero: https://styles.refero.design — browse real styles and read the selected DESIGN.md. Authentication/download access may vary. No mandatory MCP.
- awesome-design-md: https://github.com/VoltAgent/awesome-design-md — choose an actual brand folder and pin its source when adopting rules. Do not assume names/counts from memory.
- Component Gallery: https://component.gallery — compare the relevant component's behavior across systems. Plain HTTP returned 403 in setup verification; the browser read succeeded.
- Kinetics: https://kinetics.colorion.co — inspect a specific example's code/prompt only when motion is needed. Plain HTTP returned 403; the browser read succeeded. Available does not mean its effects fit every UI.

## 21st MCP

Source: https://github.com/21st-dev/magic-mcp/blob/main/README.md
Setup/key management: https://21st.dev/mcp

The current endpoint is `https://21st.dev/api/mcp`, using an `x-api-key` header. Legacy Magic keys were reset; do not use outdated `magic.21st.dev` configuration. `API_KEY_21ST` is the local environment variable used in the examples below. Do not ask the user to paste its value into chat.

Before retrieval, announce what is being searched, discover current tools, and inspect `get_usage` if exposed. Do not hardcode a daily free quota. `search` and `get_component` are distinct from hosted `generate`/`iterate_generation`; hosted AI access is separate and should not be used just to inspect a component. Stop on quota/auth/payment errors, explain the limitation, and do not silently retry paid operations.

Codex HTTP config (place only in the active authorized config; preserve unrelated entries):

```toml
[mcp_servers."21st"]
url = "https://21st.dev/api/mcp"
env_http_headers = { "x-api-key" = "API_KEY_21ST" }
```

When a key is not yet supplied, keep a prepared Codex entry `enabled = false`; it is **configured but not connected**. After the environment variable is available to the actual agent process, set enabled to true/restart and confirm the tool list. GUI agents may not inherit a terminal's exports. Do not mark usable based on config syntax alone.

Claude Code supports environment expansion in JSON config. The same connection can be registered without embedding a secret:

```sh
claude mcp add-json --scope user 21st '{"type":"http","url":"https://21st.dev/api/mcp","headers":{"x-api-key":"${API_KEY_21ST}"}}'
```

Register/enable only when that process will receive the variable. Confirm discovery and account usage without printing credentials. If API access is pending, public browser browsing is still an option; label it as browser use, never MCP execution.

### This machine's verified connection

The initial disabled HTTP entries were activated using a local stdio launcher in both Codex homes and Claude Code user scope. The launcher at `~/.local/share/naeil-frontend/21st-mcp/launch.py` loads `~/.config/naeil/21st/api-key` (0600) into the official proxy's environment, then runs the pinned `@21st-dev/magic@0.2.3` package. This is the maintained compatibility proxy to the current 21st endpoint, not the retired Magic backend. It avoids depending on GUI inheritance of terminal exports or embedding secrets in MCP config/arguments.

Initialize, tools/list, and get_usage succeeded. The account currently has free-tier catalog access with hosted AI disabled. No component retrieval/generation was run during connection verification. Check current usage before retrieval; this dated check does not guarantee future allowance. New sessions must load the registered MCP to expose tools to the agent.

## Reusable 21st client when native tools are not exposed

Use the native MCP tools when present. Otherwise the existing authorized stdio launcher can be called without rebuilding a protocol client:

```sh
python3 <skill>/scripts/twenty_first.py status
python3 <skill>/scripts/twenty_first.py search --query "data table filter toolbar"
```

Announce the gap/query before search. `status` initializes MCP, discovers current tools and calls `get_usage`; `search` also calls the metadata search. The default launcher is this machine's verified path above. On another machine, supply `--launcher /absolute/path/to/approved-launcher.py` only after verifying its configuration. No automatic installation or changes to MCP configuration occur.

The client never opens the credential file itself. The existing launcher supplies credentials. Raw child stderr and protocol error content are suppressed; timeout/auth/tool errors stop without retries. Successful usage/search results contain service metadata; store only necessary design evidence, not unrelated returned content. `--timeout` bounds each protocol call.

This helper intentionally supports **status and search only**. It does not download component code, generate, upload, subscribe or spend a retrieval allowance. If component code is needed, use the discovered native retrieval tool under the existing usage/authorization rules; absent retrieval tools are a specific blocked step, not permission to invent a new bridge. A successful search is evidence of real MCP search, not component adoption.

## Impeccable

Source: https://github.com/pbakaus/impeccable
Skill source checked: `.agents/skills/impeccable` at commit `114ea1d3838fca73b253af45f873b9c4f5f213c8` (skill 4.4.0). Installed from the official repository, not a homemade imitation.

Codex: `$impeccable polish <target>` / `$impeccable distill <target>` / `$impeccable bolder <target>`.
Claude Code: `/impeccable polish <target>` / `/impeccable distill <target>` / `/impeccable bolder <target>`.
These are agent skill commands, not shell verbs named `polish` or `distill`.

Read the installed SKILL.md and relevant playbook. Its launcher is `<installed-skill>/scripts/impeccable`. Run `sh <launcher> engine-probe` to verify the engine. The official launcher downloads the pinned platform binary and checks its SHA-256. `context --target <path>` runs from the user's project and loads its actual context. Do not claim that engine-probe/context executed polish or distill.

No automatic edit hooks are needed for on-demand commands. Do not install hooks or browser extensions as an incidental prerequisite; use their documented setup if requested. Keep the project's approved design above generic advice, including advice against neutral gray or suggestions to add expressive visuals.

New local skills should be discoverable on a subsequent turn; if the runtime list does not refresh, restart the session. The presence of files and successful engine execution are separate evidence from discovery in a fresh agent session.

## Source record

For each adopted reference, keep a compact record:

- URL / exact example or revision; date read.
- Gap it filled, adopted rule/code, adaptations, affected files.
- Tool actually used; relevant license/usage constraint.
- Verification run; deliberately skipped or blocked parts.

Do not copy API keys, private prompts, or unrelated page content into this record.
