---
name: design-consultation
description: Build a complete design system from scratch — aesthetic, typography, color, layout, motion
triggers:
  - design system
  - brand guidelines
  - create DESIGN.md
---

## Workflow

1. **Research landscape** — Analyze competitors and inspiration
2. **Aesthetic direction** — Propose creative risks and personality
3. **Typography system** — Select fonts, define scale, set hierarchy
4. **Color palette** — Define primary, secondary, accent, semantic colors
5. **Layout & spacing** — Define grid, rhythm, and spacing scale
6. **Motion principles** — Define animation philosophy and patterns
7. **Generate preview** — Create font+color preview pages
8. **Output** — Write DESIGN.md as source of truth

## Execution

```bash
# Check for existing design system
cat DESIGN.md 2>/dev/null
ls -t design-system* tokens* variables* 2>/dev/null | head -5

# Check project type for framework适配
[ -f package.json ] && cat package.json | grep -E 'react|svelte|vue|next|nuxt' | head -3
[ -f package.json ] && cat package.json | grep '"name"' | head -1

# Analyze current styles
find . -maxdepth 3 -type f \( -name '*.css' -o -name '*.scss' -o -name '*.less' \) | head -10
cat src/styles/*.css src/theme.css 2>/dev/null | head -50

# Check for existing fonts
grep -rh '@font-face\|GoogleFonts\|font-family' --include='*.css' --include='*.html' 2>/dev/null | head -20

# Existing color definitions
grep -rh '#\|rgb\|hsl' --include='*.css' --include='*.scss' 2>/dev/null | grep -oE '#[a-fA-F0-9]{3,8}' | sort | uniq | head -20

# Component library
ls src/components/ ui/ components/ 2>/dev/null | head -20

# Research competitors — fetch their design systems
curl -s "https://tailwindcss.com/docs/customizing-colors" 2>/dev/null | grep -oE '#[a-fA-F0-9]{6}' | head -10 || true

# Generate design tokens
mkdir -p .design-tokens
cat > .design-tokens/colors.json << 'EOF'
{
  "primary": { "50": "...", "500": "...", "900": "..." },
  "neutral": { "50": "...", "500": "...", "900": "..." }
}
EOF

# Create preview HTML
cat > DESIGN_PREVIEW.html << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --font-sans: 'Inter', system-ui, sans-serif;
    }
    body { font-family: var(--font-sans); }
  </style>
</head>
<body>
  <h1>Design Preview</h1>
</body>
</html>
HTMLEOF

# Telemetry
_TEL_START=$(date +%s)
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"design-consultation","event":"started","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```