---
name: design-shotgun
description: Generate multiple AI design variants, open comparison board, collect feedback, iterate
triggers:
  - explore designs
  - show me options
  - design variants
  - visual brainstorm
  - I don't like how this looks
---

## Workflow

1. **Gather context** — Read existing design docs, mockups, or descriptions
2. **Generate variants** — Create 4-6 design variants using GPT Image
3. **Open comparison board** — Launch browser with all variants side-by-side
4. **Collect feedback** — Note preferences, revision requests
5. **Taste memory** — Log approved patterns to learn your preferences
6. **Iterate** — Generate new round based on feedback
7. **Finalize** — Hand off to /design-html

## Execution

```bash
# Gather context
ls -t DESIGN*.md .sisyphus/plans/*.md 2>/dev/null | head -3
cat DESIGN.md 2>/dev/null | head -100

# Check existing assets
ls -t screenshots/ mockups/ designs/ 2>/dev/null | head -10

# Find browse binary
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"
[ -x "$B" ] && echo "BROWSE_READY" || echo "BROWSE_NOT_FOUND"

# Check taste profile
~/.claude/skills/gstack/bin/gstack-learnings-search --limit 10 --topic taste 2>/dev/null || echo "NO_TASTE_PROFILE"

# Open comparison board with variants
$B status 2>/dev/null | grep -q "running" && echo "BROWSER_ACTIVE" || echo "BROWSER_INACTIVE"

# Create variant output directory
mkdir -p .gstack/design-shotgun/variants
mkdir -p .gstack/design-shotgun/feedback

# Generate variant descriptions for prompt building
cat > .gstack/design-shotgun/prompt-context.md << 'PROMPT_EOF'
# Design Context for Shotgun
## Product description:
## Target users:
## Key actions:
## Brand personality:
PROMPT_EOF

# Telemetry
_TEL_START=$(date +%s)
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"design-shotgun","event":"started","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```