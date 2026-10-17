# Account control correction — 2026-10-17

The owner observed three different authenticated right-hand header controls after deployment. The prior header and footer rollout verified anonymous production chrome; arbitrary consumer authSlot markup remained. The correction gives the selected naeil.dev, Estimate and Jev adapters one `NaeilHeaderAccountControl`. Authentication, save guards, language support and routing stay application-owned. Home/Baby are excluded and standing rollout stays disabled; no npm or hosted Storybook publication is planned.

## Frozen correction

- Source `32108fd8e1cb1db6dae24a09f3ca72ac9a91f618`, UI0.7.1/contract1.
- [Exact archive](frozen/naeil-ui-0.7.1.tgz), SHA256 `ecd656c595fd63516417eef58a5e2624d1f1bf928ba0465761292d05502ab3f8`.
- [Frame reference](frozen/naeil-chrome-0.7.1.json), SHA256 `85bb399a13bba741e9c100d8f08db8ab5c58af3fd2a2614ca9ff24b7e455dfac`:48 matching locale/viewport/theme/footer conditions from clean-source Storybook.
- [Account reference](frozen/naeil-account-0.7.1.json), SHA256 `158dd3bca9d5c4dd8068cf97d70de1c65d7b187f3057f9388409a7685b447bc5`:4 JA390/1440 light/dark conditions, exact source/archive, independently captured shared controls. Fresh clean-source recapture exactly matches all four records.
- Comparator `scripts/account-render.mjs`, SHA256 `709fa8c39f035d7c803c69e8207a3ed44c0ce37271835db6c645439a373c2e2d`; consumer callers must verify actual fonts and package/artifact identity separately.

## Verification so far

Main ran85 unit tests, TypeScript, lint(0errors/1historical warning), contrast, generated-token equality, package/site/actual Storybook builds, and actual packed React/Next consumption. Account states and existing header browser checks pass51 cases across Chromium/Firefox/WebKit, counted as50 first-pass plus one scoped successful WebKit rerun after a static-story load failure. First missing-browser runs and an audit sampled during opening animation were rejected; required browsers were installed and audits now wait for animation/font readiness. No token was changed to conceal an unsettled audit.

Native GPT-6.1-Sol/high workers implement Estimate/Jev adapters and regressions. An independent reviewer found a missing deep-module packaging entry and ignored Supabase returned logout errors. Both were reproduced, fixed and re-reviewed;5 relevant unit tests and2 comparator rejection cases independently pass. The exact archive contains the required internal module. Main checked real diffs, hashes and a rendered dark account menu.

The common neutral circular icon,44px trigger,32px avatar background, menu/logout typography, focus behavior and busy action now come from the package. Real site identity is shown inside the menu. Site Supabase returned errors prevent redirect and use a localized toast; framework redirects still propagate. Estimate retains unsupported locale omission. Focus outlines are retained.

## Deployment state

Before-correction [public identities](evidence/account-correction-2026-10-17/before-identities.json) still show0.7.0 on all three services. Consumer verification, fresh app artifacts, reviewed deployment/recovery and post-deployment identity/render verification are pending. Existing0.7.0 helpers/one-time captures/PIDs are not replayed. Current business data, backups and auth/configuration remain protected; recovery is code-only. Synthetic authenticated acceptance and public production acceptance are reported separately; no protected production datasets or real-provider OAuth are exercised.
