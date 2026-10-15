# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> long labels, English and reduced motion
- Location: e2e/navigation.spec.ts:137:1

# Error details

```
Error: browserType.launch: Failed to launch the browser process.
Browser logs:

<launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-bHHGjb -juggler-pipe -silent
<launched> pid=97973
[pid=97973][err] *** You are running in headless mode.
[pid=97973][err] Could not find profile folder.
[pid=97973] <process did exit: exitCode=1, signal=null>
[pid=97973] starting temporary directories cleanup
Call log:
  - <launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-bHHGjb -juggler-pipe -silent
  - <launched> pid=97973
  - [pid=97973][err] *** You are running in headless mode.
  - [pid=97973][err] Could not find profile folder.
  - [pid=97973] <process did exit: exitCode=1, signal=null>
  - [pid=97973] starting temporary directories cleanup
  - [pid=97973] <gracefully close start>
  - [pid=97973] <kill>
  - [pid=97973] <skipped force kill spawnedProcess.killed=false processClosed=true>
  - [pid=97973] finished temporary directories cleanup
  - [pid=97973] <gracefully close end>

```