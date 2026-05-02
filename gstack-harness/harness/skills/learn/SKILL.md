---
name: learn
description: Manage what gstack learned — review, search, prune, export project-specific patterns
triggers:
  - what have we learned
  - show learnings
  - prune stale learnings
  - export learnings
  - learn
---

## Workflow

1. **Review learnings** — Read existing learnings for this project
2. **Search learnings** — Query by topic, skill, or keyword
3. **Prune stale** — Remove outdated or incorrect learnings
4. **Export** — Export learnings for sharing or backup
5. **Persist new learnings** — Add insights from current session

## Execution

```bash
# Check for learnings file
LEARNINGS_FILE="$HOME/.claude/skills/gstack/learnings/projects/$(git rev-parse --show-toplevel 2>/dev/null | tr '/' '_').md"
[ -f "$LEARNINGS_FILE" ] && echo "LEARNINGS_FILE:$LEARNINGS_FILE" || echo "LEARNINGS_FILE:new"

# Project-specific learnings
PROJECT_LEARNINGS=".gstack/learnings.md"
[ -f "$PROJECT_LEARNINGS" ] && echo "PROJECT_LEARNINGS_EXISTS" || echo "PROJECT_LEARNINGS:new"

# Search learnings
~/.claude/skills/gstack/bin/gstack-learnings-search --limit 20 2>/dev/null | head -30 || echo "LEARNINGS_SEARCH:unavailable"

# List all learnings by topic
echo "=== LEARNINGS BY TOPIC ==="
find ~/.claude/skills/gstack -name "learnings*.md" 2>/dev/null | head -10
ls -la .gstack/learnings* 2>/dev/null || echo "NO_PROJECT_LEARNINGS"

# Read recent learnings
echo "=== RECENT LEARNINGS ==="
cat "$PROJECT_LEARNINGS" 2>/dev/null | head -50

# Categorize learnings
echo "=== LEARNINGS CATEGORIES ==="
grep -h '^## ' "$PROJECT_LEARNINGS" 2>/dev/null || grep -h '^### ' "$PROJECT_LEARNINGS" 2>/dev/null | head -20

# Prune stale learnings (older than 6 months)
echo "=== PRUNING STALE LEARNINGS ==="
if [ -f "$PROJECT_LEARNINGS" ]; then
  # Keep recent, mark old for review
  grep -v '##.*[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' "$PROJECT_LEARNINGS" 2>/dev/null | head -50
fi

# Export learnings
EXPORT_DIR=".gstack/exports"
mkdir -p "$EXPORT_DIR"
EXPORT_FILE="$EXPORT_DIR/learnings_$(date +%Y%m%d_%H%M%S).md"

if [ -f "$PROJECT_LEARNINGS" ]; then
  cp "$PROJECT_LEARNINGS" "$EXPORT_FILE"
  echo "EXPORTED:$EXPORT_FILE"
elif [ -f "$LEARNINGS_FILE" ]; then
  cp "$LEARNINGS_FILE" "$EXPORT_FILE"
  echo "EXPORTED:$EXPORT_FILE"
else
  echo "EXPORTED:none"
fi

# Add new learning entry
mkdir -p .gstack
cat >> .gstack/learnings.md << 'EOF'

## Session Learnings

### [Topic]
**Insight:** 
**Evidence:** 
**Confidence:** 
**Date:** 
EOF

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"learn","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```