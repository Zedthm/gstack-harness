---
name: open-gstack-browser
description: Launch GStack Browser — AI-controlled Chromium with sidebar, anti-bot stealth, auto model routing
triggers:
  - open gstack browser
  - launch browser
  - connect chrome
  - open chrome
  - real browser
  - launch chrome
  - side panel
  - control my browser
---

## Workflow

1. **Check prerequisites** — Verify Chrome/Chromium is installed
2. **Launch headed browser** — Start browser in visible mode
3. **Sidebar activation** — Enable AI sidebar panel
4. **Anti-bot stealth** — Apply stealth settings automatically
5. **Cookie import option** — One-click cookie import
6. **Model routing** — Configure Sonnet for actions, Opus for analysis
7. **Session persistence** — Browser stays alive while window open

## Execution

```bash
# Check for Chrome installation
if [ "$(uname)" = "Darwin" ]; then
  CHROME_PATHS="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  CHROME_INSTALLED=$(ls /Applications/Google\ Chrome.app 2>/dev/null && echo "yes" || echo "no")
elif [ "$(uname)" = "Linux" ]; then
  CHROME_PATHS="/usr/bin/google-chrome /usr/bin/google-chrome-stable"
  CHROME_INSTALLED=$(which google-chrome google-chrome-stable 2>/dev/null || echo "no")
fi
echo "CHROME_INSTALLED:$CHROME_INSTALLED"

# Find browse binary
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"

# Check if headed mode is supported
if [ -x "$B" ]; then
  $B status 2>/dev/null | grep -q "headed\|visible\|display" && echo "HEADED_SUPPORTED" || echo "HEADLESS_ONLY"

  # Launch headed browser
  $B open --headed 2>/dev/null || $B open 2>/dev/null

  # Wait for browser to start
  sleep 2

  # Take screenshot to verify
  $B screenshot /tmp/gstack-browser-launch.png 2>/dev/null && echo "BROWSER_LAUNCH:success" || echo "BROWSER_LAUNCH:failed"
fi

# Check for ngrok (needed for remote agent pairing)
[ -x "$(command -v ngrok)" ] && echo "NGROK:available" || echo "NGROK:not_found"

# Anti-bot stealth settings
export GSTACK_STEALTH=1
export GSTACK_ANTI_BOT=1

# Sidebar configuration
export GSTACK_SIDEBAR=1
export GSTACK_MODEL_ROUTING="sonnet:fast,opus:analysis"

# Start the browser with gstack configuration
mkdir -p .gstack/browser-config
cat > .gstack/browser-config/stealth.json << 'EOF'
{
  "stealth": true,
  "anti_bot": true,
  "sidebar": true,
  "model_routing": {
    "fast": "sonnet",
    "analysis": "opus"
  }
}
EOF

# Cleanup command
echo "To disconnect: $B disconnect"

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"open-gstack-browser","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```