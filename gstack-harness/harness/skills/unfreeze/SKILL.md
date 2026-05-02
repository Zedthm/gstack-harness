---
name: unfreeze
description: Remove the /freeze boundary — allow edits to all directories again
triggers:
  - unfreeze
  - unlock edits
  - remove freeze
  - allow all edits
---

## Workflow

1. **Check freeze status** — Verify a freeze is active
2. **Remove boundaries** — Delete freeze marker files
3. **Clear allowed paths** — Reset edit restrictions
4. **Verify removal** — Confirm edits are now unrestricted
5. **Log action** — Track unfreeze event

## Execution

```bash
# Check freeze status
if [ -f ".gstack/freeze/current" ]; then
  echo "=== FREEZE FOUND ==="
  cat .gstack/freeze/current
  FROZEN_DIR=$(grep FREEZE_DIR .gstack/freeze/current | cut -d= -f2)
  FREEZE_ID=$(grep FREEZE_ID .gstack/freeze/current | cut -d= -f2)
  echo "Was frozen: $FROZEN_DIR"
  echo "Freeze ID: $FREEZE_ID"
else
  echo "NO_ACTIVE_FREEZE"
fi

# Remove freeze boundaries
echo "=== REMOVING FREEZE ==="
rm -f .gstack/freeze/current
rm -f .gstack/freeze/allowed_paths
rm -f .gstack/freeze/edit-blocker.sh

# Clean up empty freeze directory
rmdir .gstack/freeze 2>/dev/null || rm -rf .gstack/freeze

# Verify removal
if [ -f ".gstack/freeze/current" ]; then
  echo "FREEZE_REMOVAL:failed"
else
  echo "FREEZE_REMOVAL:success"
fi

# Show git status
echo "=== EDITABLE NOW ==="
git status --porcelain | head -10

# Log unfreeze event
mkdir -p .gstack/safety
echo '{"event":"unfreeze","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","previous_freeze":"'"$FROZEN_DIR"'"}' >> .gstack/safety/careful.log

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"unfreeze","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true

echo ""
echo "Unfreeze complete. All directories are now editable."
```