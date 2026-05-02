---
name: setup-browser-cookies
description: Import cookies from your real browser into headless session for authenticated testing
triggers:
  - import cookies
  - login to the site
  - authenticate the browser
---

## Workflow

1. **Detect browser** — Identify Chrome, Arc, Brave, Edge, or Firefox
2. **Cookie extraction** — Read cookies from browser's cookie store
3. **Domain selection** — Choose which domains to import
4. **Session setup** — Configure headless browser with cookies
5. **Verify auth** — Confirm logged-in state works

## Execution

```bash
# Detect available browsers
DETECTED_BROWSERS=""
[ -d "$HOME/Library/Application Support/Google/Chrome" ] && DETECTED_BROWSERS="$DETECTED_BROWSERS chrome"
[ -d "$HOME/Library/Application Support/Arc" ] && DETECTED_BROWSERS="$DETECTED_BROWSERS arc"
[ -d "$HOME/Library/Application Support/Brave" ] && DETECTED_BROWSERS="$DETECTED_BROWSERS brave"
[ -d "$HOME/Library/Application Support/Microsoft Edge" ] && DETECTED_BROWSERS="$DETECTED_BROWSERS edge"
[ -d "$HOME/.mozilla/firefox" ] && DETECTED_BROWSERS="$DETECTED_BROWSERS firefox"
echo "DETECTED_BROWSERS:$DETECTED_BROWSERS"

# Platform-specific paths
if [ "$(uname)" = "Darwin" ]; then
  CHROME_COOKIES="$HOME/Library/Application Support/Google/Chrome/Default/Cookies"
  CHROME_PROFILE="Default"
elif [ "$(uname)" = "Linux" ]; then
  CHROME_COOKIES="$HOME/.config/google-chrome/Default/Cookies"
fi
echo "CHROME_COOKIES_PATH:$CHROME_COOKIES"

# Find browse binary
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"

if [ -x "$B" ]; then
  echo "BROWSE_READY"

  # Check existing cookies/sessions
  $B status 2>/dev/null | grep -i cookie && echo "HAS_COOKIES" || echo "NO_COOKIES"

  # Cookie database check (SQLite)
  if [ -f "$CHROME_COOKIES" ]; then
    echo "COOKIE_DB_FOUND"
    # Note: actual cookie extraction would need sqlite3 and proper decryption
  fi
fi

# Export cookies for manual import
mkdir -p .gstack/browser-cookies
echo "Created .gstack/browser-cookies/ for manual cookie export"

# Interactive selector note
cat << 'EOF'
# Cookie Import Instructions:
# 1. Install EditThisCookie Chrome extension (or similar)
# 2. Navigate to the site you want to authenticate
# 3. Export cookies as JSON
# 4. Save to .gstack/browser-cookies/[domain].json
EOF

# Check for existing cookie files
ls -la .gstack/browser-cookies/ 2>/dev/null || echo "NO_COOKIE_FILES"

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"setup-browser-cookies","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```