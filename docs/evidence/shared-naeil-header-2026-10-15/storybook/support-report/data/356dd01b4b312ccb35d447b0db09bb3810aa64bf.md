# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: naeil-header.spec.ts >> actual whole-header Docs loads the public composition
- Location: e2e/naeil-header.spec.ts:152:1

# Error details

```
Error: browserType.launch: Failed to launch the browser process.
Browser logs:

<launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-H1I26l -juggler-pipe -silent
<launched> pid=97836
[pid=97836][err] *** You are running in headless mode.
[pid=97836][err] Could not find profile folder.
[pid=97836] <process did exit: exitCode=1, signal=null>
[pid=97836] starting temporary directories cleanup
Call log:
  - <launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-H1I26l -juggler-pipe -silent
  - <launched> pid=97836
  - [pid=97836][err] *** You are running in headless mode.
  - [pid=97836][err] Could not find profile folder.
  - [pid=97836] <process did exit: exitCode=1, signal=null>
  - [pid=97836] starting temporary directories cleanup
  - [pid=97836] <gracefully close start>
  - [pid=97836] <kill>
  - [pid=97836] <skipped force kill spawnedProcess.killed=false processClosed=true>
  - [pid=97836] finished temporary directories cleanup
  - [pid=97836] <gracefully close end>

```