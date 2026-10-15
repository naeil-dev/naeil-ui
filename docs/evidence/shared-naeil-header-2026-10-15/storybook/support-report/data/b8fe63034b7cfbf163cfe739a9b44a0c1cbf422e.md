# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: naeil-header.spec.ts >> theme control changes the document theme and Japanese application omits unsupported locale UI
- Location: e2e/naeil-header.spec.ts:126:1

# Error details

```
Error: browserType.launch: Failed to launch the browser process.
Browser logs:

<launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-xOOgtQ -juggler-pipe -silent
<launched> pid=97818
[pid=97818][err] *** You are running in headless mode.
[pid=97818][err] Could not find profile folder.
[pid=97818] <process did exit: exitCode=1, signal=null>
[pid=97818] starting temporary directories cleanup
Call log:
  - <launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-xOOgtQ -juggler-pipe -silent
  - <launched> pid=97818
  - [pid=97818][err] *** You are running in headless mode.
  - [pid=97818][err] Could not find profile folder.
  - [pid=97818] <process did exit: exitCode=1, signal=null>
  - [pid=97818] starting temporary directories cleanup
  - [pid=97818] <gracefully close start>
  - [pid=97818] <kill>
  - [pid=97818] <skipped force kill spawnedProcess.killed=false processClosed=true>
  - [pid=97818] finished temporary directories cleanup
  - [pid=97818] <gracefully close end>

```