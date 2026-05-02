---
name: retro
description: Weekly engineering retrospective — per-person breakdowns, shipping streaks, trends
triggers:
  - weekly retro
  - what did we ship
  - engineering retrospective
---

## Workflow

1. **Git history analysis** — Pull commits from last week
2. **Per-person breakdown** — Attribute commits to authors
3. **Shipping streaks** — Track consistency over time
4. **Test health** — Analyze test coverage trends
5. **Growth areas** — Identify skills to improve
6. **Output** — Generate retro summary with metrics

## Execution

```bash
# Analyze last week's commits
git log --since='7 days ago' --format="%h %ae %s" --stat
git log --since='7 days ago' --oneline | wc -l | xargs echo "COMMITS_LAST_WEEK:"

# Per-author breakdown
echo "=== COMMITS BY AUTHOR (last 7 days) ==="
git shortlog --since='7 days ago' -sn

# Per-author file changes
for author in $(git log --since='7 days ago' --format="%ae" | sort -u); do
  count=$(git log --since='7 days ago' --author="$author" --oneline | wc -l | tr -d ' ')
  echo "$author: $count commits"
done

# Shipping streaks (consecutive days with commits)
git log --since='30 days ago' --format="%ai" | awk '{print $1}' | sort -u | tail -10

# Branch activity
git for-each-ref --sort=-committerdate refs/heads/ --format='%(refname:short) %(committerdate:short) %(subject)' | head -10

# PR merge activity
gh pr list --state=merged --limit=20 --json number,title,mergedAt,author -q '.[] | "#\(.number) \(.title) by \(.author.login) merged \(.mergedAt)"' 2>/dev/null || echo "NO_PR_DATA"

# Test coverage trends
ls -t .gstack/qa-reports/*/health*.json 2>/dev/null | head -5 | while read f; do
  echo "=== $f ===" && cat "$f" | head -5
done

# File type changes
echo "=== CHANGES BY TYPE (last 7 days) ==="
git log --since='7 days ago' --name-only --pretty=format: | grep -E '\.(go|rs|ts|js|py)$' | sort | uniq -c | sort -rn | head -10

# New dependencies or major changes
git log --since='7 days ago' --oneline -- package.json go.mod Cargo.toml pyproject.toml | head -5

# Retro summary file
RETRO_DIR=".gstack/retro/$(date +%Y%m)"
mkdir -p "$RETRO_DIR"

cat > "$RETRO_DIR/week-$(date +%Y-%m-%d).md" << 'EOF'
# Weekly Retro

## Summary
- Total commits: X
- Unique authors: Y
- PRs merged: Z

## Top Contributors
1. 

## Shipping Streak
- Current streak: N days
- Longest streak: M days

## Test Health
- Coverage trend: ↑/↓/→
- New tests: X

## Growth Areas
- 
EOF

# Global retro (cross-project)
~/.claude/skills/gstack/bin/gstack-learnings-search --limit 20 --topic retro 2>/dev/null || true

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"retro","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```