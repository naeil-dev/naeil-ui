#!/usr/bin/env bash
set -euo pipefail
# Exact identity + route inventory + actual browser reference are required.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/rollout/verify-deploy.mjs" "$@"
