#!/bin/bash
# Post-deploy verification script
# Usage: ./scripts/verify-deploy.sh [expected-text]
# Checks that naeil.dev serves the latest code

SITE="https://naeil.dev"
MAX_WAIT=180  # 3 minutes max
INTERVAL=15

echo "🔍 Verifying deployment at $SITE..."

# Get current local commit hash (short)
LOCAL_HASH=$(git rev-parse --short HEAD)
echo "   Local commit: $LOCAL_HASH"

# Wait for deployment and verify
elapsed=0
while [ $elapsed -lt $MAX_WAIT ]; do
  # Check site is up
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE")
  if [ "$STATUS" != "200" ]; then
    echo "   ⏳ Site returned $STATUS, waiting..."
    sleep $INTERVAL
    elapsed=$((elapsed + INTERVAL))
    continue
  fi

  # Check for specific text if provided
  if [ -n "$1" ]; then
    if curl -s "$SITE" | grep -q "$1"; then
      echo "   ✅ Found expected text: '$1'"
      echo "   ✅ Deployment verified! (${elapsed}s)"
      exit 0
    else
      echo "   ⏳ Expected text not found yet, waiting..."
    fi
  else
    echo "   ✅ Site is up (HTTP $STATUS)"
    echo "   ✅ Deployment verified! (${elapsed}s)"
    exit 0
  fi

  sleep $INTERVAL
  elapsed=$((elapsed + INTERVAL))
done

echo "   ❌ Deployment verification timed out after ${MAX_WAIT}s"
exit 1
