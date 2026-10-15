# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> shared navigation/footer light 1440
- Location: e2e/navigation.spec.ts:86:3

# Error details

```
Error: browserType.launch: Failed to launch the browser process.
Browser logs:

<launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-Hg2GiH -juggler-pipe -silent
<launched> pid=97927
[pid=97927][err] *** You are running in headless mode.
[pid=97927][err] Could not find profile folder.
[pid=97927] <process did exit: exitCode=1, signal=null>
[pid=97927] starting temporary directories cleanup
Call log:
  - <launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-Hg2GiH -juggler-pipe -silent
  - <launched> pid=97927
  - [pid=97927][err] *** You are running in headless mode.
  - [pid=97927][err] Could not find profile folder.
  - [pid=97927] <process did exit: exitCode=1, signal=null>
  - [pid=97927] starting temporary directories cleanup
  - [pid=97927] <gracefully close start>
  - [pid=97927] <kill>
  - [pid=97927] <skipped force kill spawnedProcess.killed=false processClosed=true>
  - [pid=97927] finished temporary directories cleanup
  - [pid=97927] <gracefully close end>

```