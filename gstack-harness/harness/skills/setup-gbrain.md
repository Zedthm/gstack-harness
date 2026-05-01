---

name: setup-gbrain
phase: cross
specialist: "Staff Engineer"
triggers: ["setup gbrain", "connect gbrain", "start gbrain", "install gbrain", "configure gbrain"]
inputs: []
outputs: [gbrain initialized and registered as MCP]
depends-on: []
---


# Cross-Phase: Setup GBrain

## Role

You are a Staff Engineer. Set up gbrain for this coding agent: install CLI, initialize a local PGLite or Supabase brain, register MCP, capture per-remote trust policy.

## Workflow

### Step 1: Check Existing State

```bash
# Check if gbrain is already installed and configured
command -v gbrain >/dev/null 2>&1 && echo "GBRAIN: installed" || echo "GBRAIN: not found"
[ -f "$HOME/.gbrain/config.json" ] && echo "CONFIG: exists" || echo "CONFIG: none"
```

### Step 2: Present Initialization Paths

```
D1 — GBrain Setup
=================
Three initialization paths:

A) PGLite local (recommended for try-first)
   Zero accounts, zero network, ~30s setup
   Brain lives on this machine only
   Great for initial experimentation

B) Supabase existing URL
   Your cloud agent already has a brain provisioned
   Paste Session Pooler URL, this machine connects to same data
   Brain lives in Supabase cloud

C) Supabase auto-provision
   Paste your Supabase Personal Access Token
   Skill creates new project, polls to healthy, gets pooler URL
   ~90 seconds end-to-end

Recommendation: A (try-first) because zero friction, migrate later if needed.
Completeness: A=7/10 (local only), B=9/10 (cross-machine), C=9/10 (cross-machine, fresh)
```

### Step 3: Execute Chosen Path

**Path A (PGLite local):**
```bash
# Initialize local PGLite brain
mkdir -p ~/.gbrain
echo '{"type":"pglite","path":"~/.gbrain/brain.db"}' > ~/.gbrain/config.json
echo "GBRAIN: initialized local (PGLite)"
```

**Path B (Supabase existing):**
```bash
# Prompt for pooler URL
echo "PASTE_SUPABASE_POOLER_URL"
```

**Path C (Supabase auto-provision):**
```bash
# Prompt for Personal Access Token, then provision
echo "PROVISIONING: Supabase project"
```

### Step 4: Register as MCP Server

```bash
# Offer to register gbrain as MCP tool for Claude Code
echo "MCP_OFFER: gbrain serve"
# If user accepts:
# claude mcp add gbrain -- gbrain serve
```

### Step 5: Configure Per-Remote Trust

For each git remote detected, ask trust level:
- `read-write` — agent can search AND write new pages from this repo
- `read-only` — agent can search but never writes (for multi-client consultants)
- `deny` — no gbrain interaction at all

```bash
# Detect git remotes
git remote -v 2>/dev/null | grep fetch | awk '{print $2}' | sort -u
```

## Output

GBrain initialized, MCP registration offered, per-remote trust configured.

## Constraints

- Trust decisions are sticky across worktrees and branches of same remote
- MCP registration is optional — gbrain works without it via shell commands
- Auto-provision requires Supabase Personal Access Token with project creation rights

## Execution

SKILL_NAME: setup-gbrain
PHASE: cross
SPECIALIST: Staff Engineer
TRIGGERS: setup gbrain | connect gbrain | start gbrain | install gbrain | configure gbrain
