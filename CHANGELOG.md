# Changelog

## 0.3.0 — unreleased

- Demand-led Radix Tabs and native Textarea with exact shared deep entries, standalone guides/Docs/Usage and packed behavior checks. Native field/radio composition remains consumer-owned; no FormField/RadioGroup API or dependency added.

- Shared UI v2: approved neutral light/dark tokens, typography, density, content widths, restrained motion, and Radix Select/Switch/Checkbox. The design generation name “v2” is independent of npm versioning.
- `/ui` is the React core entry. React and ReactDOM come from the host; Next.js and next-intl are optional compatibility peers. Next themes remains a React runtime dependency.
- Preserve root brand/theme/heading names and documented shared deep imports. Replace open-ended deep exports with an explicit allowlist and compiled JavaScript/types.
- Exclude website authentication/Supabase, MDX/blog code, hero/Three/cursor scenes, application wrappers and website messages from the tarball and installed runtime dependencies. See the [migration guide](docs/design/v2-migration.md#03-package-boundary).
- Include CSS side-effect metadata, migration/design guidance and third-party notices/licenses. Verify isolated tarball consumers and add package/site/Storybook/browser CI.

This version is prepared locally and has not been published. npm `latest` was `0.2.0` when checked on 2026-10-02. Changes to the 0.x API boundary use a minor increment; there is no npm 2.0 release implied by UI v2.

## 0.2.0 — published 2026-03-22

Registry baseline: root, `/ui`, `/utils`, theme/global CSS, and declared wildcard component/lib/i18n paths. The actual 15-file tarball did not contain the source targets for its wildcard exports. It installed website dependencies and marked all files side-effect-free. These registry facts are distinct from later repository-only implementation work.
