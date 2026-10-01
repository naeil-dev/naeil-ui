# Tool routes and setup

Reference links were checked 2026-09-29; the official 21st README was read again 2026-10-02. Recheck before changing installations; the original Threads setup instructions may age.

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

The normal reference route uses `get_usage`, `search`, and, when code inspection is needed and usage is authorized, `get_component`. Discovery may also expose publishing, deleting, profile/media editing, bookmarks or feedback tools; their presence is not permission to change account state. Inspect any other tool's current schema and purpose before use. Account mutations and hosted generation need explicit applicable authorization; preserve authorization already provided.

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

## Portable read-only client (optional)

The repository includes `scripts/twenty_first.py`; Python 3 is required. It supports **status and metadata search only** and does not register an MCP server in your agent. Prefer native MCP tools when available. This route supplies no credentials and assumes no private launcher exists.

1. Obtain **your own** key at https://21st.dev/mcp. The official setup instructions and HTTP endpoint are documented in https://github.com/21st-dev/magic-mcp/blob/main/README.md (read 2026-10-02). Legacy keys may need replacement.
2. Make `API_KEY_21ST` available to the process using your credential manager, or enter it locally without echo/history in Bash or Zsh:

   ```sh
   read -r -s 'API_KEY_21ST?21st API key: '
   export API_KEY_21ST
   ```

   The prompt syntax above is Zsh. In Bash use `read -r -s -p '21st API key: ' API_KEY_21ST`. Never paste the key into chat, committed files, CLI arguments, or screenshots. A terminal export may not reach a GUI agent. For persisted credentials use your own secret store; protect any local credential file with directory mode 0700 and file mode 0600 and keep it outside the repository.
3. If you authorize npm to download/run the official compatibility proxy, use this **explicit** command from the repository root:

   ```sh
   python3 skills/frontend-reference-workflow/scripts/twenty_first.py status \
     --command npx --yes @21st-dev/magic@0.2.3
   python3 skills/frontend-reference-workflow/scripts/twenty_first.py search \
     --query "data table filter toolbar" \
     --command npx --yes @21st-dev/magic@0.2.3
   unset API_KEY_21ST
   ```

   Node.js/npm are needed for this proxy. `npx --yes` can install into npm's cache; it is an optional, explicit tool installation, separate from UI consumption. The pinned proxy uses the environment variable, not an argument containing the key. Review the official package/version before changing the pin. An already installed stdio executable can instead be passed after `--command`. A user-owned Python launcher can be passed with `--launcher /path/to/your/launcher.py`. The options are mutually exclusive; `--command` must come last because it consumes remaining arguments. With neither option, the helper exits blocked without starting a process.

`status` initializes MCP, lists tools, and calls `get_usage`; success proves that invocation's stdio connection and returned usage data. It does **not** prove native agent MCP discovery, remaining quota, a component download, or future availability. Search also calls the metadata `search` tool. Announce the gap/query first and inspect current usage; the helper does not infer permission from arbitrary usage text.

For no-key use, skip 21st and inspect existing components or public Component Gallery/21st pages with the browser. Record browser reading accurately. Authentication/expired-key errors require local credential correction; rate limits require waiting under the provider's current policy; exhausted quota/payment/AI-access errors stop the dependent operation. Do not silently retry, buy credits, create accounts, or switch to generation. The helper suppresses child stderr/raw error bodies to avoid credential leaks, so use safe provider/account diagnostics separately without printing secrets. Finite positive `--timeout` bounds each protocol call.

The helper does not download code, generate, upload, subscribe, or change account state. For code inspection, use a discovered native retrieval tool under the usage/authorization rules. Its absence is a specific unavailable step, not permission to invent a bridge. Successful metadata search is MCP search evidence, not component adoption.

The helper validates tool-list and result-envelope types and requires nonempty text/structured usage data before search. An absent result object is blocked; a valid empty search content array can mean zero matches. It returns the provider's data for inspection, without interpreting arbitrary text as sufficient quota or permission to retrieve. Timeouts must be finite and positive. Provider tool pricing/semantics still require current discovery; the metadata-search classification is based on the previously inspected schema, not a new live check on every installation.

## Impeccable

Source: https://github.com/pbakaus/impeccable
Historical maintainer check (2026-09-29): `.agents/skills/impeccable` at commit `114ea1d3838fca73b253af45f873b9c4f5f213c8` (skill 4.4.0). That dated installation was from the official repository; this repository does not bundle or prove an installation in your environment.

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
