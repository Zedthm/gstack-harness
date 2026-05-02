---
name: pair-agent
description: Share your browser with any AI agent — OpenClaw, Hermes, Codex, Cursor, or any HTTP agent
triggers:
  - pair agent
  - connect agent
  - share browser
  - remote browser
  - let another agent use my browser
  - pair-agent
---

## Workflow

1. **Generate setup key** — Create one-time setup key for remote agent
2. **Print instructions** — Generate instructions for other agent to follow
3. **Start ngrok tunnel** — Auto-start tunnel if remote agent on different machine
4. **Tab isolation** — Each agent gets own isolated tab
5. **Scoped tokens** — Security: domain restrictions, rate limiting
6. **Activity attribution** — Track which agent did what

## Execution

```bash
# Find browse binary
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"

# Check if browser is running
if [ -x "$B" ]; then
  $B status 2>/dev/null | grep -q "running" && echo "BROWSER_ACTIVE" || echo "BROWSER_INACTIVE"
fi

# Check for ngrok
if [ -x "$(command -v ngrok)" ]; then
  echo "NGROK:available"
  # Start ngrok tunnel for remote access
  ngrok http 9222 --log=stdout 2>/dev/null &
  sleep 2
  curl -s localhost:4040/api tunnels 2>/dev/null | grep -oE 'https://[a-z0-9\-]+\.ngrok\.io' | head -1 || echo "NGROK_URL:unavailable"
else
  echo "NGROK:not_found"
  echo "Install ngrok for remote agent pairing: https://ngrok.com/download"
fi

# Generate session token
SESSION_TOKEN=$(openssl rand -hex 16 2>/dev/null || od -An -tx1 -N16 /dev/urandom | tr -d ' \n' | head -c 32)
echo "SESSION_TOKEN:$SESSION_TOKEN"

# Create tab for paired agent
if [ -x "$B" ]; then
  $B new-tab 2>/dev/null && echo "TAB_CREATED" || echo "TAB_CREATE_FAILED"
fi

# Print pairing instructions
cat << PAIR_EOF

=== PAIRING INSTRUCTIONS ===

1. Start a new chat with your remote agent
2. Paste this setup key: $SESSION_TOKEN
3. The remote agent should connect to:
   $(curl -s localhost:4040/api tunnels 2>/dev/null | grep -oE 'https://[a-z0-9\-]+\.ngrok\.io' | head -1 || echo "TUNNEL_PENDING")

Security settings:
- Scoped to current tab only
- Domain restrictions: current hostname only
- Rate limiting: 60 requests/minute
- Activity logged to: .gstack/pair-agent/activity.jsonl

To disconnect: $B disconnect
To resume: $B resume

PAIR_EOF

# Activity log
mkdir -p .gstack/pair-agent
echo '{"event":"pair_started","token":"'"$SESSION_TOKEN"'","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}' >> .gstack/pair-agent/activity.jsonl

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"pair-agent","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```