---
name: plan-design-review
description: Designer's eye plan review — rate each design dimension 0-10, fix plan to get to 10
triggers:
  - review the design plan
  - design critique
  - plan-design-review
---

## Workflow

1. **Design inventory** — List all UI components and interactions in the plan
2. **Dimension rating** — Rate each dimension 0-10: visual hierarchy, typography, color, spacing, motion, consistency
3. **10-point definition** — For each dimension, define what a perfect 10 looks like
4. **Gap analysis** — Identify what's between current plan and the 10
5. **AI slop detection** — Flag generic patterns, stock phrases, overused metaphors
6. **Edit plan** — Apply fixes to bring each dimension closer to 10
7. **Output** — Revised design plan with ratings and fixes

## Execution

```bash
# Find design doc
ls -t DESIGN*.md .sisyphus/plans/*.md 2>/dev/null | head -5

# Read existing design content
for f in $(ls -t DESIGN*.md 2>/dev/null | head -1); do
  echo "=== REVIEWING DESIGN: $f ===" && cat "$f"
done

# Check for existing screenshots/mockups
ls -t screenshots/ mockups/ designs/ *.fig *.sketch 2>/dev/null | head -10

# Analyze design tokens if they exist
[ -f design-tokens.json ] && cat design-tokens.json
[ -f tokens.json ] && cat tokens.json
[ -f .storybook/theme.ts ] && cat .storybook/theme.ts 2>/dev/null | head -30

# CSS variables / design system
grep -r '\-\-' --include='*.css' --include='*.scss' -l 2>/dev/null | head -5
cat src/styles/variables.css src/theme.css design-system.css 2>/dev/null | head -50

# Component inventory
find . -type f \( -name '*.jsx' -o -name '*.tsx' -o -name '*.vue' -o -name '*.svelte' \) | head -20

# Font usage
grep -rh 'font-family\|font-weight\|@font-face' --include='*.css' --include='*.scss' 2>/dev/null | sort | uniq | head -10

# Color palette
grep -rh 'color:\|background:\|fill:\|stroke:' --include='*.css' --include='*.scss' 2>/dev/null | grep -oE '#[a-fA-F0-9]{3,8}|rgba?\([^)]+\)' | sort | uniq | head -20

# Spacing patterns
grep -rh 'margin:\|padding:\|gap:\|spacing' --include='*.css' --include='*.scss' 2>/dev/null | grep -oE '[0-9]+px|[0-9]+rem' | sort -n | uniq | head -15

# Learnings about design preferences
~/.claude/skills/gstack/bin/gstack-learnings-search --limit 10 --topic design 2>/dev/null || true

# Telemetry
_TEL_START=$(date +%s)
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"plan-design-review","event":"started","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```