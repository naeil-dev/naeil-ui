# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: brand.spec.ts >> shared Nav/Footer frame and mobile menu (dark, 390)
- Location: e2e/brand.spec.ts:43:36

# Error details

```
Error: browserType.launch: Failed to launch the browser process.
Browser logs:

<launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-iGBfv8 -juggler-pipe -silent
<launched> pid=97487
[pid=97487][err] *** You are running in headless mode.
[pid=97487][err] Could not find profile folder.
[pid=97487] <process did exit: exitCode=1, signal=null>
[pid=97487] starting temporary directories cleanup
Call log:
  - <launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-iGBfv8 -juggler-pipe -silent
  - <launched> pid=97487
  - [pid=97487][err] *** You are running in headless mode.
  - [pid=97487][err] Could not find profile folder.
  - [pid=97487] <process did exit: exitCode=1, signal=null>
  - [pid=97487] starting temporary directories cleanup
  - [pid=97487] <gracefully close start>
  - [pid=97487] <kill>
  - [pid=97487] <skipped force kill spawnedProcess.killed=false processClosed=true>
  - [pid=97487] finished temporary directories cleanup
  - [pid=97487] <gracefully close end>

```