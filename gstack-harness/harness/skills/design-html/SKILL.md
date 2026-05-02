---
name: design-html
description: Turn mockups into production-quality HTML/CSS — text reflows, dynamic layouts, 30KB overhead
triggers:
  - finalize this design
  - turn this into HTML
  - build me a page
  - implement this design
  - design-html
---

## Workflow

1. **Detect input** — Mockup from /design-shotgun, CEO plan, design review, or description
2. **Detect framework** — Identify React/Svelte/Vue/vanilla
3. **Choose pattern** — Select Pretext pattern (landing page, dashboard, form, card)
4. **Generate HTML** — Produce semantic, accessible HTML with computed layout
5. **Responsive verification** — Ensure reflow works at multiple viewport widths
6. **Output** — Shippable code, not demo

## Execution

```bash
# Detect project type
[ -f package.json ] && cat package.json | grep -E 'react|svelte|vue|angular|next|nuxt|solid' | head -3
[ -f vite.config.* ] && echo "BUNDLER:vite"
[ -f next.config.* ] && echo "FRAMEWORK:next"
[ -f svelte.config.js ] && echo "FRAMEWORK:svelte"
[ -f nuxt.config.ts ] && echo "FRAMEWORK:nuxt"

# Check existing components
ls src/components/ ui/ components/ 2>/dev/null | head -20

# Check for existing CSS architecture
find . -maxdepth 3 -name '*.css' -o -name '*.scss' | head -10
cat src/styles/*.css 2>/dev/null | head -30

# Check if Pretext is available
[ -f package.json ] && cat package.json | grep pretext || echo "PRETEXT:not_found"

# Find the mockup or design description
ls -t .gstack/design-shotgun/approvals/* 2>/dev/null | head -1
cat DESIGN.md 2>/dev/null | head -50

# Check design tokens
[ -f design-tokens.json ] && cat design-tokens.json
[ -f tokens.json ] && cat tokens.json

# Framework detection from file extensions
find . -maxdepth 2 -type f \( -name '*.jsx' -o -name '*.tsx' -o -name '*.svelte' \) | head -5

# Get output directory
mkdir -p src/components/ui src/styles

# Create output files with timestamp
OUTPUT_FILE="src/components/ui/GeneratedComponent.tsx"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "OUTPUT:$OUTPUT_FILE TIMESTAMP:$TIMESTAMP"

# Telemetry
_TEL_START=$(date +%s)
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"design-html","event":"started","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```