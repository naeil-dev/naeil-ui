# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> mouse click still closes on leave while keyboard keeps the menu open
- Location: e2e/navigation.spec.ts:54:1

# Error details

```
Error: browserType.launch: Failed to launch the browser process.
Browser logs:

<launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-cEnx2f -juggler-pipe -silent
<launched> pid=97877
[pid=97877][err] *** You are running in headless mode.
[pid=97877][err] Could not find profile folder.
[pid=97877] <process did exit: exitCode=1, signal=null>
[pid=97877] starting temporary directories cleanup
Call log:
  - <launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-cEnx2f -juggler-pipe -silent
  - <launched> pid=97877
  - [pid=97877][err] *** You are running in headless mode.
  - [pid=97877][err] Could not find profile folder.
  - [pid=97877] <process did exit: exitCode=1, signal=null>
  - [pid=97877] starting temporary directories cleanup
  - [pid=97877] <gracefully close start>
  - [pid=97877] <kill>
  - [pid=97877] <skipped force kill spawnedProcess.killed=false processClosed=true>
  - [pid=97877] finished temporary directories cleanup
  - [pid=97877] <gracefully close end>

```