# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: brand.spec.ts >> shared Nav/Footer frame and mobile menu (light, 1440)
- Location: e2e/brand.spec.ts:43:36

# Error details

```
Error: browserType.launch: Failed to launch the browser process.
Browser logs:

<launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-LLTFnO -juggler-pipe -silent
<launched> pid=97469
[pid=97469][err] *** You are running in headless mode.
[pid=97469][err] Could not find profile folder.
[pid=97469] <process did exit: exitCode=1, signal=null>
[pid=97469] starting temporary directories cleanup
Call log:
  - <launching> /Users/jaymini/Library/Caches/ms-playwright/firefox-1543/firefox/Nightly.app/Contents/MacOS/firefox -no-remote -headless -profile /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/playwright_firefoxdev_profile-LLTFnO -juggler-pipe -silent
  - <launched> pid=97469
  - [pid=97469][err] *** You are running in headless mode.
  - [pid=97469][err] Could not find profile folder.
  - [pid=97469] <process did exit: exitCode=1, signal=null>
  - [pid=97469] starting temporary directories cleanup
  - [pid=97469] <gracefully close start>
  - [pid=97469] <kill>
  - [pid=97469] <skipped force kill spawnedProcess.killed=false processClosed=true>
  - [pid=97469] finished temporary directories cleanup
  - [pid=97469] <gracefully close end>

```