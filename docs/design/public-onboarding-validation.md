# Public onboarding validation — 2026-10-02

Scope: Stage 1 public entry documentation, licensing/provenance notices, support templates, metadata, portable optional 21st command selection and historical-document hygiene. Shared UI/build configuration and site code were not changed. No commit, publication, release, merge, remote config mutation or deployment was performed.

## Implemented paths

README separates UI consumption/shared development (no keys), optional agent reference workflow (user-owned key only for optional 21st MCP), and brand/example-site development (separate Supabase auth). Maintained setup is indexed in docs/README.md; dated reports retain their original scope. Metadata points to the actual naeil-dev/naeil-ui origin. Security reporting records that private GitHub reporting was disabled when checked by the orchestrator on 2026-10-02 and does not invent a private contact or deadline.

MIT is present; shadcn's full copied-code notice is preserved; installed Pretendard/Noto OFL notices are copied into licenses/. THIRD_PARTY_NOTICES.md describes local git provenance and unresolved asset/font notice boundaries. Required notice inclusion in the npm tarball is a separate package-stage check.

## Checks run

| Command/check | Result and scope |
| --- | --- |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s skills/frontend-reference-workflow/tests -p 'test_*.py'` | 8/8. Fake local stdio, errors/timeouts, new command CLI connects, absent config blocks, options conflict rejects |
| `node --test skills/frontend-reference-workflow/tests/browser-check.test.cjs skills/frontend-reference-workflow/tests/layout-comparison.test.cjs` | 28/28, local Chromium/axe fixtures; no real product screen certification |
| skill-creator `scripts/quick_validate.py skills/frontend-reference-workflow` | Valid; structural validation only |
| Local Markdown path audit | 137 local targets resolved before this report was added; anchors/external availability not certified |
| Evidence JSON parsing | All 15 checked-in design JSON artifacts parse; numeric results/source hashes retained |
| Manifest comparison to HEAD | Only description, repository, homepage, bugs changed in this stage |
| Public text hygiene scan | 99 scoped text files, zero personal absolute paths, UUID session IDs, or matched known credential shapes; excludes orchestrator task record. Pattern scanning is not a complete secret audit |
| `git diff --check` | Passed |

Workflow revision is `2026-10-02.1`. Changed executable/entrypoint source hashes at validation:

```text
ecada9f24d5ebbce5ac207d5225200ca2d76d08ea9f9f1d3b46d4e956a17d7b8  skills/frontend-reference-workflow/SKILL.md
7b8b76025fc14f690fee4c3115a2b209098f8c3d6f05d1e1d997555b0d5b9e97  skills/frontend-reference-workflow/references/tools.md
0526b4813cc24ac00409efbf10c917763289f0e023852f479452236435aca60c  skills/frontend-reference-workflow/scripts/twenty_first.py
b197986d4ba94284e8411e65f0ccd4aa30d05d5a4aae61dc779a0161b803e1a7  skills/frontend-reference-workflow/tests/test_mcp_client.py
```

## Limits and carry-forward

No real 21st authentication/search/retrieval/generation, native MCP discovery, Impeccable, reference design adoption or Supabase OAuth execution was performed. Official 21st setup and shadcn license bodies were read using research-router; see frontend-sources.md. Documentation is runnable preparation, not evidence those external connections work in a fresh user's environment.

Historical paths/IDs were anonymized, and separate-product audits generalized. Dated test counts/review decisions/source hashes remain historical; hashes do not identify sanitized document bytes. External scratch evidence is unavailable in this repository and was not rerun. Opus/Sol approval remains confined to `2026-09-30.2`; `2026-10-01.1` had direct validation only. Neither approval is extended to this revision.

Site art's original rights/provenance and fetched JetBrains Mono notice verification remain unresolved. A tracked `.DS_Store` exists outside this stage's ownership and should be considered in final repository hygiene. Package/Storybook behavior, packed notices, release automation and publication remain later-stage acceptance checks.
