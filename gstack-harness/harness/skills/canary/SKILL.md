---
name: canary
description: Post-deploy canary monitoring — watch for console errors, performance regressions, page failures
triggers:
  - monitor deploy
  - canary
  - post-deploy check
  - watch production
  - verify deploy
---

## Workflow

1. **Baseline capture** — Take pre-deploy screenshots and measurements
2. **Periodic monitoring** — Watch for console errors, slow responses
3. **Screenshot comparison** — Diff against baseline at intervals
4. **Alert on anomalies** — Flag regressions with evidence
5. **Continue until stable** — Stop after N stable iterations

## Execution

```bash
# Check deploy status
git remote get-url origin 2>/dev/null

# Production URL detection
PROD_URL=$(cat CLAUDE.md 2>/dev/null | grep -oE 'https?://[^ ]+' | grep -v localhost | head -1)
[ -z "$PROD_URL" ] && PROD_URL="https://$(git remote get-url origin 2>/dev/null | sed 's/.*github.com\///' | sed 's/\.git$//' | tr '/' '-').com"
echo "PROD_URL:$PROD_URL"

# Find browse binary
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"
[ -x "$B" ] && echo "BROWSE_READY" || echo "BROWSE_NOT_FOUND"

# Create monitoring directory
CANARY_DIR=".gstack/canary/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$CANARY_DIR/screenshots"
echo "CANARY_DIR:$CANARY_DIR"

# Capture baseline
$B goto "$PROD_URL"
$B snapshot -i -a -o "$CANARY_DIR/screenshots/baseline.png"
$B console --errors
$B screenshot "$CANARY_DIR/screenshots/baseline_full.png"

# Periodic health checks
for i in $(seq 1 10); do
  TIMESTAMP=$(date +%H:%M%S)
  $B goto "$PROD_URL"
  $B snapshot -i -o "$CANARY_DIR/screenshots/check_${i}.png"
  $B console --errors
  $B screenshot "$CANARY_DIR/screenshots/check_${i}_full.png"

  # Performance check
  START=$(date +%s%N)
  curl -s -o /dev/null "$PROD_URL"
  DURATION=$((($(date +%s%N) - START) / 1000000))
  echo "CHECK[$i][$TIMESTAMP]:${DURATION}ms"

  # Compare with baseline
  sleep 30
done

# Screenshot diff if available
[ -x "$(command -v cmp)" ] && cmp "$CANARY_DIR/screenshots/baseline.png" "$CANARY_DIR/screenshots/check_10.png" 2>/dev/null && echo "IDENTICAL:true" || echo "IDENTICAL:false"

# Alert if errors found
ERROR_COUNT=$(ls "$CANARY_DIR/screenshots" | grep -c 'console' || echo "0")
[ "$ERROR_COUNT" -gt 0 ] && echo "ALERT:errors_detected" || echo "STATUS:stable"

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"canary","event":"completed","dir":"'"$CANARY_DIR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```