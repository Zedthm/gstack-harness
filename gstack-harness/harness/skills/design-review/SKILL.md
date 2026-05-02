---
name: design-review
description: Visual design QA — find design issues, fix them with atomic commits, re-verify with screenshots
triggers:
  - visual design audit
  - design qa
  - fix design issues
---

## Workflow

1. **Setup** — Parse URL/scope/depth/auth, detect CDP mode, check DESIGN.md, verify clean working tree, find browse binary and design binary
2. **Prior learnings** — Search learnings for relevant design patterns
3. **First Impression** — Gut reaction: snapshot, first-impression narrative, 3-things-eye-goes-to, one-word verdict
4. **Design System Extraction** — Extract fonts, color palette, heading hierarchy, touch target audit, performance baseline
5. **Page-by-Page Visual Audit** — Per-page: snapshot annotated, responsive screenshots, console errors, perf, 10-category checklist (hierarchy, typography, color, spacing, interaction states, responsive, motion, content, AI slop, performance)
6. **Interaction Flow Review** — Walk key flows: response feel, transition quality, feedback clarity, goodwill reservoir
7. **Cross-Page Consistency** — Compare nav, footer, component reuse, tone, spacing across pages
8. **Compile Report** — Dual headline scores (Design + AI Slop), per-category grades, regression output
9. **Design Outside Voices** — Codex availability check, dispatch Codex + Claude subagent in parallel
10. **Triage** — Sort findings by impact (High/Medium/Polish), select fixes
11. **Fix loop** — For each fixable finding: locate source → optional target mockup → minimal fix → commit → re-test → regression test → classify
12. **Final Design Audit** — Re-run audit on fixed pages, compare against target mockups, final scores
13. **Report** — Write report to local + project-scoped locations
14. **TODOS.md update** — Add deferred findings, mark fixed findings
15. **Capture learnings** — Log design patterns and pitfalls

## Execution

```bash
# Setup: Check working tree
git status --porcelain

# Find browse binary
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"
[ -x "$B" ] && echo "READY: $B" || echo "NEEDS_SETUP"

# Find design binary
D=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/design/dist/design" ] && D="$_ROOT/.claude/skills/gstack/design/dist/design"
[ -z "$D" ] && D="$HOME/.claude/skills/gstack/design/dist/design"
[ -x "$D" ] && echo "DESIGN_READY: $D" || echo "DESIGN_NOT_AVAILABLE"

# CDP mode detection
$B status 2>/dev/null | grep -q "Mode: cdp" && echo "CDP_MODE=true" || echo "CDP_MODE=false"

# Create output directories
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)"
REPORT_DIR="$HOME/.gstack/projects/$SLUG/designs/design-audit-$(date +%Y%m%d)"
mkdir -p "$REPORT_DIR/screenshots"
echo "REPORT_DIR: $REPORT_DIR"

# Prior learnings
~/.claude/skills/gstack/bin/gstack-learnings-search --limit 10 2>/dev/null || true

# Phase 1: First Impression
$B goto <target-url>
$B screenshot "$REPORT_DIR/screenshots/first-impression.png"

# Phase 2: Design System Extraction
$B js "JSON.stringify([...new Set([...document.querySelectorAll('*')].slice(0,500).map(e => getComputedStyle(e).fontFamily))])"
$B js "JSON.stringify([...new Set([...document.querySelectorAll('*')].slice(0,500).flatMap(e => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]).filter(c => c !== 'rgba(0, 0, 0, 0)'))])"
$B js "JSON.stringify([...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => ({tag:h.tagName, text:h.textContent.trim().slice(0,50), size:getComputedStyle(h).fontSize, weight:getComputedStyle(h).fontWeight})))"
$B js "JSON.stringify([...document.querySelectorAll('a,button,input,[role=button]')].filter(e => {const r=e.getBoundingClientRect(); return r.width>0 && (r.width<44||r.height<44)}).map(e => ({tag:e.tagName, text:(e.textContent||'').trim().slice(0,30), w:Math.round(e.getBoundingClientRect().width), h:Math.round(e.getBoundingClientRect().height)})).slice(0,20))"
$B perf

# Phase 3: Page-by-Page Visual Audit
$B goto <page-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/{page}-annotated.png"
$B responsive "$REPORT_DIR/screenshots/{page}"
$B console --errors
$B perf

# Phase 4: Interaction Flow
$B snapshot -i
$B click @e3
$B snapshot -D

# Design Outside Voices: Codex availability
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"

# Codex design voice
TMPERR_DESIGN=$(mktemp /tmp/codex-design-XXXXXXXX)
_REPO_ROOT=$(git rev-parse --show-toplevel)
codex exec "Review the frontend source code..." -C "$_REPO_ROOT" -s read-only -c 'model_reasoning_effort="high"' --enable web_search_cached < /dev/null 2>"$TMPERR_DESIGN"
cat "$TMPERR_DESIGN" && rm -f "$TMPERR_DESIGN"

# Fix loop: commit each fix
git add <only-changed-files>
git commit -m "style(design): FINDING-NNN — short description"

# Re-test
$B goto <affected-url>
$B screenshot "$REPORT_DIR/screenshots/finding-NNN-after.png"
$B console --errors
$B snapshot -D

# Design mockup generation (if D is available)
$D generate --brief "<description>" --output "$REPORT_DIR/screenshots/finding-NNN-target.png"

# Report: log review result
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"design-outside-voices","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE"}'

# Learnings capture
~/.claude/skills/gstack/bin/gstack-learnings-log '{"skill":"design-review","type":"TYPE","key":"KEY","insight":"INSIGHT","confidence":N,"source":"SOURCE"}'

# Telemetry (run last)
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"design-review","event":"completed","branch":"'"$(git branch --show-current 2>/dev/null || echo unknown)"'","outcome":"OUTCOME","duration_s":"'"$_TEL_DUR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```
