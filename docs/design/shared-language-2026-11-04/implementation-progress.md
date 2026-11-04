# Implementation progress — 2026-11-04

Implementation and local acceptance are recorded below. The separately approved publication and source pushes are complete; production receiver deployment and sender activation remain pending.

Operational update, 2026-11-04:

- User approved npm `next` publication, the new tag/Release, reviewed source pushes and Site main/deployment, then sequential native receiver deployments and conditional sender activation. Baby/Home/DNS remain excluded.
- `@naeil/ui@0.10.0` was published at 04:26:16 UTC. The downloaded registry archive matches the frozen SHA-256, SHA-1, SRI, length and all 175 regular members. Tags remain `latest=0.7.2`, `next=0.10.0`. [Public registry receipt](https://github.com/naeil-dev/naeil-ui/releases/download/v0.10.0/npm-registry-verification.json).
- [v0.10.0](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.10.0) resolves to product source `455f2f9aedb108606af2f429c18281260eafd2dd`; its three release assets have verified digests. Existing tags and GitHub latest are preserved.
- [Site PR 37](https://github.com/naeil-dev/naeil-ui/pull/37) and the reviewed Jev/Estimate branches are pushed. Site account-fixture and focus-marker comparison updates affect tests only. Product/package bytes remain frozen. CI must pass before Site integration.
- Vercel Production/Preview sender flag is `0`; preview output proves preference writes disabled. Production still runs the retained predecessor. Native candidates, predecessor copies and private transition scripts are prepared; no native service stop or switch has occurred.

The following local-candidate results predate publication and remain their own evidence:

- Scope: Site/Jev/Estimate. Aside/Cloudflare inventory is complete (4 DNS records, 1 healthy tunnel, 3 public routes). Baby and Home are excluded. Original checkout, all 23 approved files and frozen 0.7.1 are preserved.
- Shared 0.10.0 archive: `a4a1e312f2f608358a10f9019c248af37a8172bb116d3bc506144442cb963fb4`, 175 files. Final pack reproduces frozen bytes; exact React/Next types/build/SSR/browser and context/bundle checks passed. Before publication, registry was latest 0.7.2 / next 0.9.0.
- Shared/Site: 791 units passed, 5 existing skips; types/contrast/full lint passed (3 inherited warnings). Site JSON has 238 keys per locale including 29 invitation strings, with unchanged protocol transport. Final source `455f2f9` fixes nested password-change titles; final local build passes **223/223** (82 sender-off + 82 sender-on + 59 auth/visual/focused).
- Jev: product `5f4b1fc`, build `G2swU7GBFotEIQR2tJRGv`; 137 units, 26/20 RSC, 16/16 gap suites, 10 proxy and 1 ingress check passed. Cookie denial/two tabs, exact metadata and actual click/new-tab/copied-href covered. Candidate and emergency fallback bytes are durably archived.
- Estimate: 753 keys per locale. Product `cf8ed5e` fixes refreshed-cookie forwarding found in the expanded auth matrix. Final archive `a2ffe5b18d08f0e737db1f41842efad209284ae1cafe840f116aa393010e4885`; 729 units, 23/28 sender/state tests, 16 integrity and 62 smoke passed. All 270 auth rows plus 12 cookie-rotation rows per mode, titles and navigation producers covered. Superseded failure evidence is preserved; tests/docs `a5c0cd2` changes no product bytes.
- Actual Storybook: Chromium 22 passed; Firefox/WebKit 28 passed and 16 external-image cases failed on official whale.png's Vercel 403 challenge. Fonts/initial geometry and blocked-image usability passed. This remains a verification limit.
- The five independent local coverage gaps are mapped in [local-gap-disposition.json](local-gap-disposition.json). Main directly reviewed the title/cookie fixes, final hashes, evidence inventories and source boundaries. Independent auth/request-classification review found no remaining concrete issue.
- Emergency fallbacks passed Site 40, Jev 64 and Estimate 165 probes. Their use can reverse language semantics and retracts completion; normal rollback disables send/preferences on the accepted receiver.
- Current 0.7.x automation intentionally rejects 0.10.0. [The one-release native proposal](native-release-procedure.md) uses current managed ownership and new approval without altering guards or old transactions. Read-only Vercel inspection confirms the retained current Ready production deployment; future rollback eligibility remains separately checked. Site requires a production-bound build; native apps retain tested bytes with runtime configuration.

Next: finish CI, integrate/deploy Site, expose native receivers sequentially with sending disabled, verify live auth/paths and update maintained entry links, then activate sending/preferences. Record deployed §12 acceptance and T+90. Fresh operational ownership/data preservation occurs immediately before each authorized switch; stale PIDs and historical approvals grant no authority. The approved sequence and recovery boundaries remain in [release-preparation.md](release-preparation.md).
