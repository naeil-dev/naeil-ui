# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: brand.spec.ts >> built Storybook Docs is reachable
- Location: e2e/brand.spec.ts:68:1

# Error details

```
Error: browserType.launch: Failed to launch the browser process.
Browser logs:

<launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-cT3elr -juggler-pipe -silent
<launched> pid=97519
[pid=97519][err] *** You are running in headless mode.
[pid=97519][err] Could not find profile folder.
[pid=97519] <process did exit: exitCode=1, signal=null>
[pid=97519] starting temporary directories cleanup
Call log:
  - <launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-cT3elr -juggler-pipe -silent
  - <launched> pid=97519
  - [pid=97519][err] *** You are running in headless mode.
  - [pid=97519][err] Could not find profile folder.
  - [pid=97519] <process did exit: exitCode=1, signal=null>
  - [pid=97519] starting temporary directories cleanup
  - [pid=97519] <gracefully close start>
  - [pid=97519] <kill>
  - [pid=97519] <skipped force kill spawnedProcess.killed=false processClosed=true>
  - [pid=97519] finished temporary directories cleanup
  - [pid=97519] <gracefully close end>

```