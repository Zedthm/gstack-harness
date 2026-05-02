---
name: context-save
description: Save working context — captures git state, decisions, remaining work for future sessions
triggers:
  - save progress
  - save state
  - context save
  - save my work
  - checkpoint
---

## Workflow

1. **Capture git state** — Current branch, uncommitted changes, recent commits
2. **Document decisions** — Save architectural choices and rationale
3. **List remaining work** — Capture TODOs and incomplete tasks
4. **Save to checkpoint** — Write structured checkpoint file
5. **Optionally push** — Push WIP commits if enabled

## Execution

```bash
# Capture git state
BRANCH=$(git branch --show-current)
echo "BRANCH:$BRANCH"

# Uncommitted changes
git status --porcelain | head -20

# Recent commits
git log --oneline -10

# Last 5 commits with full messages
git log --format="%h %s%n%b" -5

# Stash list
git stash list | head -5

# Current diff summary
git diff --stat HEAD | head -10

# Document decisions
echo "=== DECISIONS ==="
cat .sisyphus/decisions.md 2>/dev/null | tail -20 || echo "NO_DECISIONS_FILE"

# Remaining work
echo "=== REMAINING WORK ==="
grep -n 'TODO\|FIXME\|WIP\|in progress' TODO.md TODOS.md *.md 2>/dev/null | head -20 || echo "NO_TODOS"

# Current working context
CONTEXT_FILE=".sisyphus/checkpoints/checkpoint-$(date +%Y%m%d_%H%M%S).md"
mkdir -p .sisyphus/checkpoints

cat > "$CONTEXT_FILE" << EOF
# Checkpoint - $(date)

## Git State
- Branch: $BRANCH
- Last commit: $(git log -1 --format="%h %s")
- Uncommitted: $(git status --porcelain | wc -l | tr -d ' ') files

## Recent Decisions
-

## Remaining Work
1. 
2. 

## Notes
-

EOF

echo "CHECKPOINT_SAVED:$CONTEXT_FILE"

# Optional: Create WIP commit
if [ "$1" = "--commit" ]; then
  git add -A
  git commit -m "WIP: $(date) checkpoint" 2>/dev/null && echo "COMMIT:success" || echo "COMMIT:failed"
fi

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"context-save","event":"completed","branch":"'"$BRANCH"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```