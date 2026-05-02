---
name: plan-ceo-review
description: CEO/founder-mode plan review — rethink the problem, find the 10-star product
triggers:
  - think bigger
  - expand scope
  - strategy review
  - rethink this
  - is this ambitious enough
  - plan-ceo-review
---

## Workflow

1. **Read design doc** — Load the output from /office-hours or existing plan
2. **Problem reframe** — Challenge the stated problem, find the real one
3. **Scope modes** — SCOPE EXPANSION, SELECTIVE EXPANSION, HOLD SCOPE, or SCOPE REDUCTION
4. **10-star filter** — What would make this genuinely great, not just functional?
5. **Premise audit** — List assumptions, challenge each
6. **Implementation alternatives** — Generate 3+ approaches with trade-offs
7. **Output** — Revised design doc with recommendations

## Execution

```bash
# Find the design doc to review
ls -t DESIGN*.md .sisyphus/plans/*.md *.md 2>/dev/null | grep -i 'design\|plan\|office' | head -5

# Read design doc content
for f in DESIGN.md DESIGN_DEV.md DESIGN_v2.md; do [ -f "$f" ] && echo "=== $f ===" && cat "$f" && break; done

# Check for existing CEO review notes
ls -t .sisyphus/plans/*.md 2>/dev/null | head -3

# Git context
git log --oneline -5
git diff --stat HEAD~3..HEAD 2>/dev/null | tail -5

# Project metadata
[ -f package.json ] && cat package.json | grep -E '"name"|"version"' | head -2
[ -f VERSION ] && cat VERSION
[ -f pyproject.toml ] && grep -E 'name.*=|version.*=' pyproject.toml | head -2

# Analyze scope — check for frontend/backend split
git diff --name-only HEAD~5..HEAD 2>/dev/null | grep -E '\.(jsx?|tsx?|vue|svelte)$' | wc -l | xargs echo "FRONTEND_FILES:"
git diff --name-only HEAD~5..HEAD 2>/dev/null | grep -E '\.(go|rs|py|java|ts)$' | wc -l | xargs echo "BACKEND_FILES:"

# Decision context
~/.claude/skills/gstack/bin/gstack-learnings-search --limit 5 --topic scope 2>/dev/null || true

# Telemetry
_TEL_START=$(date +%s)
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"plan-ceo-review","event":"started","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```