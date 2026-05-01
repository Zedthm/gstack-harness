---

name: pair-agent
phase: cross
specialist: "Multi-Agent Coordinator"
triggers: ["pair agent", "connect agent", "share browser", "remote browser access", "let another agent use my browser"]
inputs: [remote agent type (openclaw/hermes/codex/cursor)]
outputs: [setup key, connection instructions, paired session]
depends-on: [open-gstack-browser]
---


# Cross-Phase: Pair Agent — Browser Sharing Between AI Agents

## Role

You are a Multi-Agent Coordinator. Share your browser with any AI agent. One command generates a setup key and prints instructions the other agent follows to connect. Works with OpenClaw, Hermes, Codex, Cursor, or any agent that can make HTTP requests.

## Workflow

### Step 1: Generate Setup Key

```bash
# Generate one-time setup key
SETUP_KEY="$(openssl rand -hex 16 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(16))")"
echo "SETUP_KEY: $SETUP_KEY"
SESSION_ID="pair-$(date +%s)"
echo "$SESSION_ID:$SETUP_KEY" > /home/qwen/data/project/local/mySkills/gstack-harness/.pair-sessions/$SESSION_ID
mkdir -p /home/qwen/data/project/local/mySkills/gstack-harness/.pair-sessions
```

### Step 2: Open GStack Browser

Launch GStack Browser in headed mode so user can watch both agents:

```bash
# Launch headed Chromium with GStack extension
# Browser stays alive as long as window is open
echo "LAUNCH_BROWSER: headed-mode"
```

### Step 3: Print Connection Instructions

```
PAIR AGENT SESSION READY
========================
Setup Key: {SETUP_KEY}
Session ID: {SESSION_ID}

To connect your remote agent, paste this into its chat:

---
[Remote Agent Setup]

Your orchestrator wants to share a browser session with you.
Paste this exact command in your agent's chat:

$SESSION_ID:{SETUP_KEY}

This will:
- Create a new browser tab in the shared GStack Browser
- Give your agent scoped access (read+write by default)
- Tab isolated — agents cannot interfere with each other
- Rate limiting and activity attribution enabled

Security: scoped tokens, tab isolation, domain restrictions.
---
```

### Step 4: Wait for Connection

Monitor for remote agent connection:

```bash
# Check for connection
tail -f /home/qwen/data/project/local/mySkills/gstack-harness/.pair-sessions/$SESSION_ID 2>/dev/null || echo "MONITORING"
```

### Step 5: Confirm Paired

```
AGENTS PAIRED
=============
Tab 1: You (local session)
Tab 2: Remote agent ({AGENT_TYPE})
Both agents can browse independently.
Neither can access the other's tab.
```

## Output

- Setup key for remote agent
- Connection instructions to paste into remote agent
- Confirmation when both agents are connected

## Constraints

- Setup key is single-use, expires after 5 minutes if not consumed
- Each remote agent gets isolated tab with scoped access
- Rate limiting prevents tab exhaustion
- User can disconnect either agent at any time via browser UI

## Execution

SKILL_NAME: pair-agent
PHASE: cross
SPECIALIST: Multi-Agent Coordinator
TRIGGERS: pair agent | connect agent | share browser | remote browser access | let another agent use my browser
