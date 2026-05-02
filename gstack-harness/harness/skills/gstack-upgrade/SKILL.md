---
name: gstack-upgrade
description: Upgrade gstack to latest version — detects global vs vendored, syncs, shows what's new
triggers:
  - upgrade gstack
  - update gstack
  - get latest version
  - gstack-upgrade
---

## Workflow

1. **Detect install type** — Global (~/.claude/skills/gstack) or vendored (./.agents/skills/gstack)
2. **Check for updates** — Git fetch and compare versions
3. **Pull latest** — Git pull for global or update symlinks for vendored
4. **Show changelog** — Display what's new in this release
5. **Verify install** — Confirm files are up to date

## Execution

```bash
# Detect install type and location
echo "=== DETECTING GSTACK INSTALL ==="

GLOBAL_PATH="$HOME/.claude/skills/gstack"
VENDORED_PATH="$(git rev-parse --show-toplevel 2>/dev/null)/.agents/skills/gstack"
VENDORED_ALT="$(git rev-parse --show-toplevel 2>/dev/null)/.claude/skills/gstack"

if [ -d "$GLOBAL_PATH/.git" ]; then
  INSTALL_TYPE="global"
  INSTALL_PATH="$GLOBAL_PATH"
  echo "INSTALL_TYPE:global"
  echo "INSTALL_PATH:$GLOBAL_PATH"
elif [ -d "$VENDORED_PATH/.git" ]; then
  INSTALL_TYPE="vendored"
  INSTALL_PATH="$VENDORED_PATH"
  echo "INSTALL_TYPE:vendored"
  echo "INSTALL_PATH:$VENDORED_PATH"
elif [ -d "$VENDORED_ALT/.git" ]; then
  INSTALL_TYPE="vendored"
  INSTALL_PATH="$VENDORED_ALT"
  echo "INSTALL_TYPE:vendored_alt"
  echo "INSTALL_PATH:$VENDORED_ALT"
else
  echo "INSTALL_TYPE:unknown"
fi

# Current version
if [ -n "$INSTALL_PATH" ]; then
  cd "$INSTALL_PATH" && git fetch origin --quiet 2>/dev/null
  CURRENT_BRANCH=$(git branch --show-current)
  LATEST_COMMIT=$(git rev-parse origin/$CURRENT_BRANCH 2>/dev/null)
  CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null)

  echo "CURRENT_COMMIT:$CURRENT_COMMIT"
  echo "LATEST_COMMIT:$LATEST_COMMIT"

  if [ "$CURRENT_COMMIT" != "$LATEST_COMMIT" ]; then
    echo "UPDATE_AVAILABLE:true"
  else
    echo "UPDATE_AVAILABLE:false"
  fi
fi

# Check for local modifications
git status --porcelain 2>/dev/null | head -5

# Get current version from package.json or VERSION file
[ -f "$INSTALL_PATH/package.json" ] && cat "$INSTALL_PATH/package.json" | grep '"version"' | head -1
cat "$INSTALL_PATH/VERSION" 2>/dev/null || echo "NO_VERSION_FILE"

# Show recent changes
echo "=== RECENT CHANGES ==="
git log --oneline origin/$CURRENT_BRANCH -10 2>/dev/null || git log --oneline -10

# Show changelog entry
echo "=== CHANGELOG ==="
[ -f "$INSTALL_PATH/CHANGELOG.md" ] && head -50 "$INSTALL_PATH/CHANGELOG.md" || echo "NO_CHANGELOG"

# Perform upgrade
if [ "$CURRENT_COMMIT" != "$LATEST_COMMIT" ] && [ -n "$INSTALL_PATH" ]; then
  echo "=== PERFORMING UPGRADE ==="
  cd "$INSTALL_PATH" && git pull origin $CURRENT_BRANCH --ff-only 2>/dev/null && echo "UPGRADE:success" || echo "UPGRADE:failed"
fi

# Sync for vendored installs
if [ "$INSTALL_TYPE" = "vendored" ]; then
  echo "=== SYNCING VENDORED ==="
  # Update symlinks if needed
  find . -type l -name 'gstack-*' 2>/dev/null | head -5
fi

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"gstack-upgrade","event":"completed","install_type":"'"$INSTALL_TYPE"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```