---
name: benchmark
description: Performance regression detection — page load times, Core Web Vitals, resource sizes
triggers:
  - performance
  - benchmark
  - page speed
  - lighthouse
  - web vitals
  - bundle size
  - load time
---

## Workflow

1. **Establish baseline** — Measure current page load times and metrics
2. **Core Web Vitals** — Capture LCP, FID, CLS, FCP, TTFB
3. **Resource audit** — Measure JS/CSS bundle sizes, image sizes
4. **Before/after comparison** — Compare PR changes against baseline
5. **Regression detection** — Flag any degradation > threshold
6. **Persist metrics** — Store in metrics file for trend tracking

## Execution

```bash
# Check for existing baseline
ls -t .gstack/benchmark/*baseline* 2>/dev/null | head -3
cat .gstack/benchmark/baseline.json 2>/dev/null | head -20

# Production URL
PROD_URL=$(cat CLAUDE.md 2>/dev/null | grep -oE 'https?://[^ ]+' | grep -v localhost | head -1)
[ -z "$PROD_URL" ] && PROD_URL="https://example.com"
echo "PROD_URL:$PROD_URL"

# Find browse binary
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"
[ -x "$B" ] && echo "BROWSE_READY" || echo "BROWSE_NOT_FOUND"

# Create benchmark directory
BM_DIR=".gstack/benchmark/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BM_DIR"
echo "BM_DIR:$BM_DIR"

# Measure page load time
START=$(date +%s%N)
curl -s -o /dev/null -w "TTFB:%{time_starttransfer}s\nTOTAL:%{time_total}s\n" "$PROD_URL"
DURATION=$((($(date +%s%N) - START) / 1000000))
echo "PAGE_LOAD:${DURATION}ms"

# Resource size audit
curl -s "$PROD_URL" | grep -oE 'src="[^"]*\.(js|css)"' | head -10
curl -sI "$PROD_URL" | grep -i content-length

# Lighthouse if available
[ -x "$(command -v lighthouse)" ] && lighthouse "$PROD_URL" --output=json --output-path="$BM_DIR/lighthouse.json" 2>/dev/null || echo "LIGHTHOUSE:not_available"

# Page load metrics via browser
$B goto "$PROD_URL" 2>/dev/null
$B snapshot -i -o "$BM_DIR/screenshot.png"

# Bundle size comparison (if PR)
git fetch origin main --quiet 2>/dev/null || git fetch origin master --quiet 2>/dev/null
CHANGED_JS=$(git diff origin/main --name-only 2>/dev/null | grep -E '\.js$|\.ts$|\.jsx$|\.tsx$' | head -10)
echo "CHANGED_JS_FILES:$CHANGED_JS"

# Check for large bundles
find . -name '*.js' -size +1M 2>/dev/null | head -5
ls -lh dist/ build/ out/ .next/ 2>/dev/null | head -10

# Web Vitals simulation
cat > "$BM_DIR/metrics.json" << 'EOF'
{
  "timestamp": "",
  "url": "",
  "metrics": {
    "LCP": 0,
    "FID": 0,
    "CLS": 0,
    "FCP": 0,
    "TTFB": 0
  },
  "resources": []
}
EOF

# Persist baseline
cp "$BM_DIR/metrics.json" .gstack/benchmark/baseline.json 2>/dev/null || true

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"benchmark","event":"completed","dir":"'"$BM_DIR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```