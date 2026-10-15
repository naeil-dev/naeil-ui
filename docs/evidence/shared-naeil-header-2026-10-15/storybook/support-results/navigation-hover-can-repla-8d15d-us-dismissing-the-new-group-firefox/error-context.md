# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> hover can replace a keyboard-opened group without focus dismissing the new group
- Location: e2e/navigation.spec.ts:5:1

# Error details

```
Error: browserType.launch: Failed to launch the browser process.
Browser logs:

<launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-tyvJ9p -juggler-pipe -silent
<launched> pid=97845
[pid=97845][err] *** You are running in headless mode.
[pid=97845][err] Could not find profile folder.
[pid=97845] <process did exit: exitCode=1, signal=null>
[pid=97845] starting temporary directories cleanup
Call log:
  - <launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-tyvJ9p -juggler-pipe -silent
  - <launched> pid=97845
  - [pid=97845][err] *** You are running in headless mode.
  - [pid=97845][err] Could not find profile folder.
  - [pid=97845] <process did exit: exitCode=1, signal=null>
  - [pid=97845] starting temporary directories cleanup
  - [pid=97845] <gracefully close start>
  - [pid=97845] <kill>
  - [pid=97845] <skipped force kill spawnedProcess.killed=false processClosed=true>
  - [pid=97845] finished temporary directories cleanup
  - [pid=97845] <gracefully close end>

```