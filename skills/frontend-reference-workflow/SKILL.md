---
name: frontend-reference-workflow
description: Use when building a new frontend page, when the user dislikes or requests a substantial improvement to its design, or explicitly mentions Refero, awesome-design-md, 21st.dev, Component Gallery, Kinetics, or Impeccable. Skip reference discovery for routine copy, spacing, and bug fixes unless explicitly requested.
---

# Frontend references

Use real references to fill a concrete design gap. Making every service available does not mean using every service on every task. Preserve the user's current authorization and choices.

## Start with the existing product

Read applicable project instructions, DESIGN.md, existing tokens/components and the target screen. Identify the missing decision before browsing. A shared library and a product's page composition are different scopes. Keep existing APIs and accessible primitives unless the requested change requires otherwise.

If the existing design answers the question, reuse it. Do not reselect its style or install dependencies for a typo or small fix. For new direction, show a concise, concrete proposal with source URLs or images before applying it; wait only for decisions not already authorized. Show proposed durable instruction additions before writing them, honoring approval already given in the session.

## Reference routes

1. **Style — [Refero](https://styles.refero.design) or [awesome-design-md](https://github.com/VoltAgent/awesome-design-md).** Read the actual candidate DESIGN file. Preserve the source URL and chosen revision where available. Integrate approved rules into root DESIGN.md; do not overwrite an established design wholesale. Claude projects can import it with `@DESIGN.md` in CLAUDE.md; AGENTS.md should direct Codex to read it. Marketing-page analyses are references, not official product specifications or accessibility evidence.
2. **Components — [21st.dev](https://21st.dev), then [Component Gallery](https://component.gallery).** First identify the missing component and announce the query and intended retrieval. Discover the actual MCP tools; check account access/remaining allowance before code retrieval. Current setup is in [tools.md](references/tools.md). Search does not authorize paid retrieval or hosted generation. Authorized use of an existing included allowance does not need repeated approval; additional charges or a new subscription do. Compare behavior and accessibility examples in Component Gallery. Reuse existing project primitives; adapt only needed structure into its tokens. Inspect license, dependencies, keyboard behavior and responsive states before incorporating code.
3. **Motion — [Kinetics](https://kinetics.colorion.co).** Use when motion serves the requested interaction. Read the specific example and its actual CSS/React/prompt before adopting it. Retain reduced-motion support and the existing motion budget. If an example conflicts with an approved restrained style, report that it was considered and not adopted. Do not add springs or decoration just to use the site.
4. **Finish — [Impeccable](https://impeccable.style).** Invoke the installed official `impeccable` skill and its actual `polish` or `distill` playbook when substantial work needs finishing. `bolder` is available for an explicitly requested stronger direction, not a default pass. Preserve the approved palette, type, functionality and task scope even if generic advice recommends another aesthetic. Follow its bounded verification passes.

## Missing access and truthful evidence

- Check available tools/skills before claiming execution. If a required tool is absent, explain the exact missing dependency and prepare a reviewable setup; ask to install only if installation is not already authorized. Never pretend a manual pass ran a tool.
- If a page fails, try the available authorized browser. If still unreadable, stop the source-dependent step and request pasted content or another accessible source. Continue only independent work; do not fill unread source content from memory.
- API keys stay in a local environment or approved credential store, never chat, committed config, logs, or URLs. No account creation, subscription, paid call, or hosted code upload without its needed authorization.
- When adopting external material, report **source → what was used/adapted → affected files**. For substantial work, record it in the project's design source notes. Distinguish read, installed, executed, adopted, skipped, and blocked.
- Verify the rendered result at representative desktop/mobile sizes, keyboard/focus, long/localized text, relevant states and reduced motion. Use the project's tests; do not claim checks that were not run.

Read [tools.md](references/tools.md) for current installation, invocation, and authentication details. Site counts, prices, and free quotas are mutable: check live information rather than repeating the Threads numbers as guarantees.
