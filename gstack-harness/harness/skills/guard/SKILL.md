---
name: guard
description: Full safety mode — combines /careful warnings + /freeze directory restriction
triggers:
  - guard mode
  - full safety
  - lock it down
  - maximum safety
---

## Workflow

1. **Activate careful** — Enable destructive command warnings
2. **Activate freeze** — Restrict edits to specified directory
3. **Set maximum safety** — Combine both protections
4. **Confirm boundaries** — Show both freeze dir and active warnings
5. **Monitor** — Watch for violations

## Execution

```bash
# Get freeze directory (default: current)
FREEZE_DIR="${1:-$(pwd)}"

# Activate careful
echo "=== ACTIVATING CAREFUL ==="
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Dangerous patterns to watch
DANGEROUS_PATTERNS="rm -rf|DROP TABLE|DROP DATABASE|force push|git reset --hard|git push --force|--delete=main|--delete=master"

# Create safety log
mkdir -p .gstack/safety
cat > .gstack/safety/guard-status.json << EOF
{
  "activated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "freeze_dir": "$FREEZE_DIR",
  "careful_active": true,
  "branch": "$CURRENT_BRANCH"
}
EOF

# Activate freeze
echo "=== ACTIVATING FREEZE ==="
FREEZE_TIMESTAMP=$(date +%s)
FREEZE_ID="guard_$$_$FREEZE_TIMESTAMP"

mkdir -p .gstack/freeze
cat > .gstack/freeze/current << EOF
FREEZE_DIR=$FREEZE_DIR
FREEZE_ID=$FREEZE_ID
FREEZE_TIMESTAMP=$FREEZE_TIMESTAMP
MODE=guard
EOF

cat > .gstack/freeze/allowed_paths << EOF
$FREEZE_DIR
EOF

# Protection verification
echo "=== GUARD STATUS ==="
echo "Careful: ACTIVE (destructive command warnings)"
echo "Freeze: ACTIVE (edits restricted to $FREEZE_DIR)"
echo "Freeze ID: $FREEZE_ID"

# Show what's in the frozen area
echo "=== FROZEN AREA CONTENTS ==="
ls -la "$FREEZE_DIR" 2>/dev/null | head -10
git -C "$FREEZE_DIR" status --porcelain 2>/dev/null | wc -l | xargs echo "Files to protect:"

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"guard","event":"completed","freeze_dir":"'"$FREEZE_DIR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true

echo ""
echo "Guard mode active. To deactivate, run: /unfreeze"
```