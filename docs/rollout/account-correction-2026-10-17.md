# Account control correction — 2026-10-17

The owner observed three different authenticated right-hand header controls after deployment. The prior header and footer rollout verified anonymous production chrome; arbitrary consumer authSlot markup remained. The correction gives the selected naeil.dev, Estimate and Jev adapters one `NaeilHeaderAccountControl`. Authentication, save guards, language support and routing stay application-owned. Home/Baby are excluded and standing rollout stays disabled; no npm or hosted Storybook publication is planned.

## Frozen correction

- Source `32108fd8e1cb1db6dae24a09f3ca72ac9a91f618`, UI0.7.1/contract1.
- [Exact archive](frozen/naeil-ui-0.7.1.tgz), SHA256 `ecd656c595fd63516417eef58a5e2624d1f1bf928ba0465761292d05502ab3f8`.
- [Frame reference](frozen/naeil-chrome-0.7.1.json), SHA256 `85bb399a13bba741e9c100d8f08db8ab5c58af3fd2a2614ca9ff24b7e455dfac`:48 matching locale/viewport/theme/footer conditions from clean-source Storybook.
- [Account reference](frozen/naeil-account-0.7.1.json), SHA256 `158dd3bca9d5c4dd8068cf97d70de1c65d7b187f3057f9388409a7685b447bc5`:4 JA390/1440 light/dark conditions, exact source/archive, independently captured shared controls. Fresh clean-source recapture exactly matches all four records.
- Comparator `scripts/account-render.mjs`, SHA256 `709fa8c39f035d7c803c69e8207a3ed44c0ce37271835db6c645439a373c2e2d`; consumer callers must verify actual fonts and package/artifact identity separately.

## Verification

Main ran85 unit tests, TypeScript, lint(0errors/1historical warning), contrast, generated-token equality, package/site/actual Storybook builds, and actual packed React/Next consumption. Account states and existing header browser checks pass51 cases across Chromium/Firefox/WebKit, counted as50 first-pass plus one scoped successful WebKit rerun after a static-story load failure. First missing-browser runs and an audit sampled during opening animation were rejected; required browsers were installed and audits now wait for animation/font readiness. No token was changed to conceal an unsettled audit.

Native GPT-6.1-Sol/high workers implemented Estimate/Jev adapters and regressions. An independent reviewer found a missing deep-module packaging entry and ignored Supabase returned logout errors. Both were reproduced, fixed and re-reviewed;5 relevant unit tests and2 comparator rejection cases independently pass. The exact archive contains the required internal module. Main checked real diffs, hashes and a rendered dark account menu.

The common neutral circular icon,44px trigger,32px avatar background, menu/logout typography, focus behavior and busy action now come from the package. Real site identity is shown inside the menu. Site Supabase returned errors prevent redirect and use a localized toast; framework redirects still propagate. Estimate retains unsupported locale omission. Focus outlines are retained.

Estimate passes633 units,68 incumbent browser cases,9 final frozen account cases and61 exact-artifact smoke checks. Jev passes69 units and27 final frozen browser cases. Both actual consumers match all4 Japanese account reference conditions. The real site NavWrapper with freshly compiled website CSS/fonts also matches all4, with synthetic session/routing boundaries; this does not certify a real authenticated production session. Main inspected the real consumer screenshots, diffs and archive/source/artifact identities. [Synthetic authenticated evidence](evidence/account-correction-2026-10-17/authenticated-candidate-verification.json) remains distinct from production access.

A final regression found that desktop and mobile auth slots mount separately: app-local pending state reset when the sheet reopened. Jev hoists its request controller above NaeilHeader; site follow-up `805b719` does the same and adds a synchronous request lock. Two website-only real-header browser regressions failed before and pass after the fix;85 units, types/lint and a fresh site build pass. Frozen UI archive/reference bytes are unchanged.

## Deployment state

The [before-correction identities](evidence/account-correction-2026-10-17/before-identities.json) record UI0.7.0. **All selected services now serve UI0.7.1/contract1.** [Final machine-readable outcome](evidence/account-correction-2026-10-17/summary.json) and [fresh public identities](evidence/account-correction-2026-10-17/final-identities.json) establish the one-time deployment, separately from protected production acceptance or standing rollout.

- naeil.dev: [PR11](https://github.com/naeil-dev/naeil-ui/pull/11) merged as `ff372235cda3091fd392dc0c4f53932825428f2c`, whose tree exactly equals reviewed `805b719`. [CI39001439459](https://github.com/naeil-dev/naeil-ui/actions/runs/39001439459) passes85 units, package/site checks,2 site-adapter regressions,380 browser tests and4 expected conditional skips. Both CI package checks reproduce the frozen archive SHA256. Production7134744798 and Vercel `dpl_7zTs8hNcVMTZ7D8YMDsc2j5kYpnx` match the public source/artifact exactly. [Activation/provider binding](evidence/account-correction-2026-10-17/naeil-activation.json). The duplicate post-merge CI39002496935 was still running when the outcome was recorded; no second completed run is claimed.
- Estimate source `8c3e0430293dffc182695cfa2bc050214a750dc9`, release `8c3e0430293d-82280965179e`, build `e5a805e1-a8a6-46e2-9eb4-ae77010b31a2`. Main reviewed new digest-bound input/CLI and reran16 bridge plus8 input tests. Fresh private data/every-backup byte preservation, protected metadata equality, current ownership, graceful stop/natural lock release and unchanged29 server/domain source files passed. The earlier0.7.0 release is retained for code-only rollback. [Activation](evidence/account-correction-2026-10-17/estimate-activation.json).
- Jev source `35dd4746e62d07f1c58e75182160ed40d9c7d115`, release `20261017T040900Z-ui071`, build `Qqngj6d8EWQAChlLZsa6x`. Main reviewed the new exact helper/pins and reran19 synthetic lifecycle tests. Fresh ownership and exact current2141-member code preservation passed; unchanged configuration was reused. Current DB/auth storage was neither read nor replaced. [Activation](evidence/account-correction-2026-10-17/jev-activation.json).

Production checks pass56 login/frame/account conditions:24 naeil.dev,8 Estimate and24 Jev, all supported locales,390/768/1440/1920 and light/dark. Equivalent Japanese login presentations agree across all three.20 site JS/CSS assets return200 with expected types;14 JS/CSS assets in each consumer exactly match installed code. Post-public checks rehash all3056 Estimate and2141 Jev code entries without changes. No live rollback was needed or exercised. The0.7.0 consumed helpers/captures/PIDs were not replayed. A generic reviewed Estimate bridge was invoked with fresh private inputs; Jev used a separately pinned helper and new recovery tree.

Synthetic authenticated acceptance and anonymous production acceptance are separate. No protected production datasets, real-provider OAuth, native assistive technology, physical devices, live rollback or reboot are certified. Home/Baby remain excluded; npm/hosted Storybook and standing automatic rollout remain untouched.


## Retained limits and next work

This correction closes the selected three-service deployment. The wider unattended rollout remains open: standing policy/updater/platform activation and real failure/recovery exercises are not enabled or claimed. Home/Baby stay excluded; unknown services remain registered separately. Maintained guidance now explains owning request state above the two header slots. These outcome/guidance changes do not alter the frozen0.7.1 archive, shared reference or deployed application artifacts.
