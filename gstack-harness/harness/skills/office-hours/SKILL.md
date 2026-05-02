---
name: office-hours
description: YC Office Hours — six forcing questions that reframe your product before you write code
triggers:
  - brainstorm this
  - I have an idea
  - help me think through this
  - office hours
  - is this worth building
---

## Workflow

1. **Demand reality** — Probe for specific pain points with real examples, not hypotheticals
2. **Status quo challenger** — Why can't they solve it themselves today?
3. **Desperate specificity** — Narrow to the narrowest wedge that delivers value
4. **Narrowest wedge** — What single feature ships tomorrow and learns?
5. **Observation** — What's the unexpected insight from their description?
6. **Future-fit** — Will this still matter in 12 months?
7. **Design doc** — Write a design doc capturing the refined vision

## Execution

```bash
# Check for existing design docs
ls -t *.md DESIGN*.md .sisyphus/plans/*.md 2>/dev/null | head -5

# Check for existing learnings that might be relevant
~/.claude/skills/gstack/bin/gstack-learnings-search --limit 5 2>/dev/null || true

# Detect project type
[ -f package.json ] && echo "RUNTIME:node" && cat package.json | grep '"name"' | head -1
[ -f go.mod ] && echo "RUNTIME:go" && head -1 go.mod
[ -f Cargo.toml ] && echo "RUNTIME:rust" && grep name Cargo.toml | head -1
[ -f pyproject.toml ] && echo "RUNTIME:python" && grep name pyproject.toml | head -1

# Initialize design doc if none exists
DESIGN_DOC="DESIGN.md"
[ -f "$DESIGN_DOC" ] && echo "EXISTS:$DESIGN_DOC" || echo "NEW:$DESIGN_DOC"

# Show recent context
git log --oneline -10
git remote get-url origin 2>/dev/null

# Telemetry
_TEL_START=$(date +%s)
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"office-hours","event":"started","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```