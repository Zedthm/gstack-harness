---
name: context-restore
description: Restore working context from saved checkpoint
triggers:
  - resume
  - restore context
  - where was I
  - pick up where I left off
  - checkpoint resume
---

## Workflow

1. **Find latest checkpoint** — Search for most recent checkpoint file
2. **Load git state** — Checkout branch, apply stashes if any
3. **Restore decisions** — Read and apply saved decisions
4. **Show remaining work** — Display incomplete tasks
5. **Resume** — Continue from saved point

## Execution

```bash
# Find most recent checkpoint
CHECKPOINT_DIR=".sisyphus/checkpoints"
if [ -d "$CHECKPOINT_DIR" ]; then
  LATEST=$(ls -t "$CHECKPOINT_DIR"/checkpoint-*.md 2>/dev/null | head -1)
  if [ -n "$LATEST" ]; then
    echo "LATEST_CHECKPOINT:$LATEST"
    echo "=== CHECKPOINT CONTENT ==="
    cat "$LATEST"
  else
    echo "NO_CHECKPOINTS"
  fi
else
  echo "NO_CHECKPOINT_DIR"
fi

# Also check git worktrees for checkpoints
git worktree list 2>/dev/null | head -5

# Try to find across all branches
git log --all --oneline --source -- "*.md" | grep -i checkpoint | head -5

# Restore git state
echo "=== RESTORING GIT STATE ==="
if [ -n "$LATEST" ]; then
  RESTORED_BRANCH=$(grep 'BRANCH:' "$LATEST" | head -1 | cut -d: -f2 | tr -d ' ')
  if [ -n "$RESTORED_BRANCH" ]; then
    echo "Target branch: $RESTORED_BRANCH"
    git checkout "$RESTORED_BRANCH" 2>/dev/null && echo "CHECKOUT:success" || echo "CHECKOUT:failed"
  fi

  # Apply stash if any
  STASH_COUNT=$(grep 'Uncommitted:' "$LATEST" | grep -oE '[0-9]+' | head -1)
  if [ "$STASH_COUNT" -gt 0 ]; then
    echo "There are uncommitted changes to restore"
    # git stash pop would be used if stashed
  fi
fi

# Show remaining work
echo "=== REMAINING WORK FROM CHECKPOINT ==="
grep -A 20 '## Remaining Work' "$LATEST" 2>/dev/null | head -15

# Recent decisions to recall
echo "=== RECENT DECISIONS ==="
grep -A 10 '## Recent Decisions' "$LATEST" 2>/dev/null | head -10

# Create continuation file
CONTINUATION_FILE=".sisyphus/continuation-$(date +%Y%m%d_%H%M%S).md"
cat > "$CONTINUATION_FILE" << EOF
# Continuation from checkpoint

## Resuming from
Checkpoint: $LATEST
Date: $(date)

## Work to continue
1. 
2. 

## New notes
- 
EOF

echo "CONTINUATION_FILE:$CONTINUATION_FILE"

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"context-restore","event":"completed","checkpoint":"'"$LATEST"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```