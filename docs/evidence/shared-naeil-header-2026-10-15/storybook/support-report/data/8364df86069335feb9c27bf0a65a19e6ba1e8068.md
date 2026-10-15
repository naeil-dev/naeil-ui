# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> desktop hover preserves focus and the path into the menu
- Location: e2e/navigation.spec.ts:26:1

# Error details

```
Error: browserType.launch: Failed to launch the browser process.
Browser logs:

<launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-oucZDJ -juggler-pipe -silent
<launched> pid=97854
[pid=97854][err] *** You are running in headless mode.
[pid=97854][err] Could not find profile folder.
[pid=97854] <process did exit: exitCode=1, signal=null>
[pid=97854] starting temporary directories cleanup
Call log:
  - <launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-oucZDJ -juggler-pipe -silent
  - <launched> pid=97854
  - [pid=97854][err] *** You are running in headless mode.
  - [pid=97854][err] Could not find profile folder.
  - [pid=97854] <process did exit: exitCode=1, signal=null>
  - [pid=97854] starting temporary directories cleanup
  - [pid=97854] <gracefully close start>
  - [pid=97854] <kill>
  - [pid=97854] <skipped force kill spawnedProcess.killed=false processClosed=true>
  - [pid=97854] finished temporary directories cleanup
  - [pid=97854] <gracefully close end>

```