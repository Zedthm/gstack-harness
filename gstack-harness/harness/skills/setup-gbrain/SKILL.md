---
name: setup-gbrain
description: Set up GBrain — install CLI, initialize PGLite or Supabase brain, register MCP
triggers:
  - setup gbrain
  - connect gbrain
  - start gbrain
  - install gbrain
  - configure gbrain for this machine
---

## Workflow

1. **Check prerequisites** — Node.js, npm, git
2. **Install gbrain CLI** — npm install -g gbrain
3. **Choose brain type** — PGLite (local) or Supabase (cloud)
4. **Initialize brain** — Run gbrain init with chosen backend
5. **Register MCP** — Add gbrain as Claude Code MCP server
6. **Configure trust policy** — Set per-repo read-write/read-only/deny

## Execution

```bash
# Check prerequisites
echo "=== PREREQUISITES ==="
node --version 2>/dev/null && echo "NODE:ok" || echo "NODE:missing"
npm --version 2>/dev/null && echo "NPM:ok" || echo "NPM:missing"
git --version 2>/dev/null && echo "GIT:ok" || echo "GIT:missing"

# Check if gbrain is installed
if [ -x "$(command -v gbrain)" ]; then
  echo "GBRAIN:already_installed"
  gbrain --version 2>/dev/null
else
  echo "GBRAIN:not_installed"
  # Install gbrain
  npm install -g gbrain 2>/dev/null && echo "GBRAIN:installed" || echo "GBRAIN:install_failed"
fi

# Check for existing gbrain config
ls -la ~/.gbrain/ 2>/dev/null | head -10
cat ~/.gbrain/config.json 2>/dev/null | head -20 || echo "NO_GBRAIN_CONFIG"

# Brain type selection
echo "=== BRAIN TYPE ==="
echo "1. PGLite (local - zero account, zero network, fast)"
echo "2. Supabase (cloud - shared across machines)"
echo "3. Supabase auto-provision (create new project)"

# PGLite local setup
setup_pglite() {
  echo "Setting up PGLite local brain..."
  gbrain init --backend pglite --path ~/.gbrain/data
}

# Supabase existing setup
setup_supabase_existing() {
  echo "Enter Supabase Session Pooler URL:"
  read -r SUPABASE_URL
  gbrain init --backend supabase --url "$SUPABASE_URL"
}

# Supabase auto-provision
setup_supabase_auto() {
  echo "Enter Supabase Personal Access Token:"
  read -r SUPABASE_TOKEN
  gbrain init --backend supabase --auto-provision --token "$SUPABASE_TOKEN"
}

# Detect which setup was chosen (default to PGLite for safety)
setup_pglite

# MCP registration for Claude Code
echo "=== MCP REGISTRATION ==="
if command -v claude &>/dev/null; then
  claude mcp add gbrain -- gbrain serve 2>/dev/null && echo "MCP:registered" || echo "MCP:failed"
else
  echo "MCP:claude_not_found"
fi

# Trust policy configuration
echo "=== TRUST POLICY ==="
echo "1. read-write (search + write pages from this repo)"
echo "2. read-only (search only, never write)"
echo "3. deny (no gbrain interaction)"

REPO_PATH=$(git rev-parse --show-toplevel 2>/dev/null)
REPO_NAME=$(basename "$REPO_PATH" 2>/dev/null)

mkdir -p ~/.gbrain/trust
cat > ~/.gbrain/trust/$(echo "$REPO_NAME" | tr '.' '_').json << EOF
{
  "repo": "$REPO_NAME",
  "path": "$REPO_PATH",
  "trust_level": "read-write",
  "set_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Verify setup
echo "=== VERIFICATION ==="
gbrain status 2>/dev/null || echo "GBRAIN:status_failed"
ls -la ~/.gbrain/ 2>/dev/null

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"setup-gbrain","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```