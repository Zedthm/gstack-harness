---
name: freeze
description: Restrict file edits to one directory — prevent accidental changes outside scope
triggers:
  - freeze
  - restrict edits
  - only edit this folder
  - lock down edits
---

## Workflow

1. **Confirm directory** — Get the directory to freeze edits to
2. **Set edit boundary** — Configure allowed edit paths
3. **Enable blocking** — Block Edit/Write outside allowed path
4. **Verify boundary** — Confirm edits are restricted
5. **Auto-freeze option** — Optionally freeze module being investigated

## Execution

```bash
# Get current directory or specified freeze target
FREEZE_DIR="${1:-$(pwd)}"
echo "FREEZE_DIR:$FREEZE_DIR"

# Verify directory exists
[ -d "$FREEZE_DIR" ] && echo "DIR_EXISTS:true" || echo "DIR_EXISTS:false"

# Create freeze marker
FREEZE_TIMESTAMP=$(date +%s)
FREEZE_ID="freeze_$$_$FREEZE_TIMESTAMP"

mkdir -p .gstack/freeze

cat > .gstack/freeze/current << EOF
FREEZE_DIR=$FREEZE_DIR
FREEZE_ID=$FREEZE_ID
FREEZE_TIMESTAMP=$FREEZE_TIMESTAMP
EOF

# Set restricted paths
cat > .gstack/freeze/allowed_paths << EOF
$FREEZE_DIR
EOF

# Create protection wrapper
cat > .gstack/freeze/edit-blocker.sh << 'EOF'
#!/bin/bash
# Block edits outside allowed directories
REQUESTED_PATH="$1"
ALLOWED_PATH=$(cat .gstack/freeze/current | grep FREEZE_DIR | cut -d= -f2)

echo "$REQUESTED_PATH" | grep -q "^$ALLOWED_PATH" && exit 0 || exit 1
EOF
chmod +x .gstack/freeze/edit-blocker.sh

# Git status to show what's in frozen area
git -C "$FREEZE_DIR" status --porcelain 2>/dev/null | head -10

# Show freeze status
echo "=== FREEZE ACTIVE ==="
echo "Directory: $FREEZE_DIR"
echo "Freeze ID: $FREEZE_ID"
echo "Allowed paths: $(cat .gstack/freeze/allowed_paths)"

# Auto-freeze for investigate skill
if [ -f ".gstack/investigate/module.txt" ]; then
  INVESTIGATE_MODULE=$(cat .gstack/investigate/module.txt)
  echo "AUTO_FREEZE_MODULE:$INVESTIGATE_MODULE"
fi

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"freeze","event":"completed","dir":"'"$FREEZE_DIR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```