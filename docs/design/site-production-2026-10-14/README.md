# naeil.dev production application — 2026-10-14 (JST)

User explicitly authorized commit, PR, merge and production deployment after reviewing the prepared candidate.

- PR: https://github.com/naeil-dev/naeil-ui/pull/5
- Candidate commit: `aa094e75a6427a49002521323ca2276eb1ce95d7`
- Squash merge: `00a17a81264dba43266f5670453f6585669f7384`; candidate and merge trees are identical.
- PR CI: https://github.com/naeil-dev/naeil-ui/actions/runs/38464362156 — success;51 unit tests,263 browser tests passed,4 conditional forced-colors tests skipped in Firefox/WebKit. The new navigation cases ran in all three engines.
- Main CI: https://github.com/naeil-dev/naeil-ui/actions/runs/38465644474 — success.
- Vercel Production: deployment7049743975; success for the exact merge SHA. Recorded Vercel environment URL: https://design-system-7kjiy6cd3-naeils-projects.vercel.app . Actual checks below use https://naeil.dev .

## Scope and preservation

Shared Navigation/SiteFooter, home project section, blog, login, design-system introduction and localized metadata are live. Desktop project hover opens, crossing into the panel keeps it open, and leaving closes it even after mouse click. Keyboard and touch behavior remain supported. Full footer content and existing hero assets are retained. Project-specific bodies, Naeil Home, npm publication and public Storybook deployment are excluded.

## Live verification

The check scripts in this directory are the local-review checks with the destination/output paths changed to production and this separate evidence directory. Historical local results are untouched.

- `hover-site.json`:48 Chromium/WebKit conditions across3 locales,2 themes and4 widths pass hover/click-leave, keyboard, tap, focus trap, desktop two columns, overflow and page-error checks.
- `site-flows.json`:4 desktop/touch flows pass locale query/hash retention, document language/title, theme, blog navigation/back, local font delivery, login error alert and intercepted Google authorization request. Full provider sign-in/session/logout was not performed.
- Main visually inspected actual production desktop home, mobile design introduction and menu captures.

Full route matrix:288 conditions pass with zero failures;20 axe audits report zero violations. `metadata.json`:21 route metadata checks, a consistent service favicon, sitemap,48 comparable frame groups and active-project indication pass. `preservation.json` verifies excluded page bodies and hero files are unchanged between the previous and deployed commit. Physical devices/VoiceOver remain unverified. Firefox is now covered by Linux CI for shared components, not by this actual-site Chromium/WebKit matrix.

Production records were initially retained locally after the code merge. The user subsequently requested repository preservation and workspace closeout. The port3010 preview has now stopped and its Tailscale HTTPS6448 proxy is removed; other proxies are unchanged. These documentation-only records are included in the closeout PR. Repository Git integration may rebuild the unchanged runtime when these records merge.
