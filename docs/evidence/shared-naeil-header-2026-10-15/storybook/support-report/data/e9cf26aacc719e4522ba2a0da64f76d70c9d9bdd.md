# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> shared navigation/footer light 2560
- Location: e2e/navigation.spec.ts:86:3

# Error details

```
Error: browserType.launch: Failed to launch the browser process.
Browser logs:

<launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-W3mAjD -juggler-pipe -silent
<launched> pid=97937
[pid=97937][err] *** You are running in headless mode.
[pid=97937][err] Could not find profile folder.
[pid=97937] <process did exit: exitCode=1, signal=null>
[pid=97937] starting temporary directories cleanup
Call log:
  - <launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-W3mAjD -juggler-pipe -silent
  - <launched> pid=97937
  - [pid=97937][err] *** You are running in headless mode.
  - [pid=97937][err] Could not find profile folder.
  - [pid=97937] <process did exit: exitCode=1, signal=null>
  - [pid=97937] starting temporary directories cleanup
  - [pid=97937] <gracefully close start>
  - [pid=97937] <kill>
  - [pid=97937] <skipped force kill spawnedProcess.killed=false processClosed=true>
  - [pid=97937] finished temporary directories cleanup
  - [pid=97937] <gracefully close end>

```