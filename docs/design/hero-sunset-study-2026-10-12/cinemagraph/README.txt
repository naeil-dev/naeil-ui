Rebuild the approved real-footage water loop

Requires Python3.13, FFmpeg8.1.1 with libx264 and requirements.txt.
From repository root:
  python3 -m venv /tmp/naeil-video-venv
  /tmp/naeil-video-venv/bin/pip install -r docs/design/hero-sunset-study-2026-10-12/cinemagraph/requirements.txt
  /tmp/naeil-video-venv/bin/python docs/design/hero-sunset-study-2026-10-12/cinemagraph/build-loop.py /path/to/source.mov
  /tmp/naeil-video-venv/bin/python docs/design/hero-sunset-study-2026-10-12/cinemagraph/verify-encoded.py

The user-provided MOV is deliberately not published with the repository.
Use its SHA-256 in build-report.json to identify the exact source. Rebuilding
requires authorized access to that original; the checksum is not a download.
Approved production WebP images supply the theme colors and still composition.

build-loop.py writes production MP4s, build-report.json and local review previews.
Run check.mjs against an existing local server on3107, or set HERO_URL to an
authorized Korean page URL. It writes local screenshots and browser-results.json.

Raw PNG studies, rejected captures and full-size preview videos remain local
and are ignored by Git. They are not required to serve the production hero.
The release report supersedes earlier local report.txt and verification records.
