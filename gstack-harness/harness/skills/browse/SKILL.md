---
name: browse
description: Fast headless browser for QA testing — navigate, click, screenshot, verify
triggers:
  - open in browser
  - test the site
  - take a screenshot
  - dogfood this
  - browse
---

## Workflow

1. **Browser setup** — Find and verify browse binary
2. **Navigate** — Go to target URL
3. **Interact** — Click, fill forms, handle dialogs
4. **Verify** — Assert element states, check console errors
5. **Document** — Screenshot, capture evidence
6. **Responsive testing** — Test multiple viewport sizes

## Execution

```bash
# Find browse binary
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"

if [ -x "$B" ]; then
  echo "BROWSE_READY:$B"

  # Check browser status
  $B status 2>/dev/null || $B open 2>/dev/null

  # Take initial screenshot
  $B screenshot /tmp/browse_initial.png

  # Navigate to target
  $B goto https://example.com

  # Basic interactions
  $B click "#selector"
  $B type "#input" "text to type"
  $B screenshot /tmp/browse_after.png

  # Get page info
  $B title
  $B url
  $B links

  # Console errors check
  $B console --errors

  # Screenshot with annotation
  $B snapshot -i -a -o /tmp/browse_snapshot.png

else
  echo "BROWSE_NOT_FOUND: $B"
  echo "Available commands when browse is unavailable:"
  echo "  curl -sI https://example.com  # Basic HTTP check"
  echo "  curl -s https://example.com | head -100  # Fetch HTML"
fi

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"browse","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```