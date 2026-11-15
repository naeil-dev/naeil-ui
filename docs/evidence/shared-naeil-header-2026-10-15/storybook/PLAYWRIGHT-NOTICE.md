# Archived Playwright trace viewer attribution

This notice applies to the unchanged generated third-party trace-viewer copies in:

- `initial-report/trace/`
- `support-report/trace/`
- `recheck1/report/trace/`
- `recheck1/stability-report/trace/`

There are 68 viewer files plus four `playwright-logo.svg` files (72 files in total). All 72 files match the corresponding `playwright-core@1.63.0/lib/vite/traceViewer/` files byte for byte. These are archived test tools, not naeil-authored code or part of the public UI package. Existing evidence files are preserved unchanged.

Playwright is Copyright (c) Microsoft Corporation, licensed under [Apache 2.0](licenses/Playwright-Apache-2.0.txt). It contains code derived from Puppeteer; retain the original [Playwright NOTICE](licenses/Playwright-NOTICE.txt) and [upstream third-party notice](licenses/Playwright-ThirdPartyNotices.txt). Source: [microsoft/playwright v1.63.0](https://github.com/microsoft/playwright/tree/v1.63.0). That package's general third-party notice points to bundle sidecars; the applicable viewer notices below are supplied here because the archived viewer has no such sidecars.

The viewer also includes React/React DOM and scheduler, CodeMirror, xterm/addon-fit, YAML and zip.js code, VS Code's codicon font/CSS and colours, and Chromium/WebKit-derived DevTools utilities. The dependency versions below come from the upstream Playwright source lock, not this repository's current application dependencies. The [VS Code MIT notice](licenses/VSCode-MIT.txt) accompanies the codicon/font/CSS source copied by Playwright; the [Chromium/WebKit BSD notices](licenses/Chromium-WebKit-BSD.txt) preserve both original copyright blocks and Microsoft's modification notice.

- `react@19.2.7` — [MIT](licenses/react-19.2.7.txt); source: https://registry.npmjs.org/react/-/react-19.2.7.tgz
- `react-dom@19.2.7` — [MIT](licenses/react-dom-19.2.7.txt); source: https://registry.npmjs.org/react-dom/-/react-dom-19.2.7.tgz
- `scheduler@0.27.0` — [MIT](licenses/scheduler-0.27.0.txt); source: https://registry.npmjs.org/scheduler/-/scheduler-0.27.0.tgz
- `codemirror@5.65.18` — [MIT](licenses/codemirror-5.65.18.txt); source: https://registry.npmjs.org/codemirror/-/codemirror-5.65.18.tgz
- `@xterm/xterm@5.5.0` — [MIT](licenses/xterm-xterm-5.5.0.txt); source: https://registry.npmjs.org/@xterm/xterm/-/xterm-5.5.0.tgz
- `@xterm/addon-fit@0.10.0` — [MIT](licenses/xterm-addon-fit-0.10.0.txt); source: https://registry.npmjs.org/@xterm/addon-fit/-/addon-fit-0.10.0.tgz
- `yaml@2.9.0` — [ISC](licenses/yaml-2.9.0.txt); source: https://registry.npmjs.org/yaml/-/yaml-2.9.0.tgz
- `@zip.js/zip.js@2.7.73` — [BSD-3-Clause](licenses/zip.js-zip.js-2.7.73.txt); source: https://registry.npmjs.org/@zip.js/zip.js/-/zip.js-2.7.73.tgz

Full upstream notice texts are retained in `licenses/`; [source provenance](licenses/SOURCE.txt) records their source. These notices apply to the copied tooling and do not relicense archived screenshots, test data or naeil brand marks.
