---
name: qa-only
description: Report-only QA testing — find bugs, produce structured report, no code changes
triggers:
  - just report bugs
  - qa report only
  - test but don't fix
  - qa-only
---

## Workflow

1. **Setup** — Parse URL/tier/mode/scope/auth, detect CDP mode
2. **Authenticate** — Handle login/cookie import if needed
3. **Orient** — Map application: snapshot, links, console errors
4. **Explore** — Visit pages systematically, per-page checklist
5. **Document** — Capture evidence: screenshots, repro steps, severity
6. **Compute health score** — Score based on issue count and severity
7. **Output** — Structured bug report with all evidence

## Execution

```bash
# Setup: Check working tree (should be clean for qa-only)
git status --porcelain
[ -z "$(git status --porcelain)" ] && echo "CLEAN_TREE:ok" || echo "CLEAN_TREE:dirty"

# Find browse binary
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"
[ -x "$B" ] && echo "BROWSE_READY:$B" || echo "BROWSE_NOT_FOUND"

# CDP mode detection
$B status 2>/dev/null | grep -q "Mode: cdp" && echo "CDP_MODE:true" || echo "CDP_MODE:false"

# Create output directories
REPORT_DIR=".gstack/qa-reports/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$REPORT_DIR/screenshots"
echo "REPORT_DIR:$REPORT_DIR"

# Prior learnings
~/.claude/skills/gstack/bin/gstack-learnings-search --limit 10 2>/dev/null || true

# Auth status
$B status 2>/dev/null | grep -i cookie || echo "NO_COOKIES"

# Orient: map the application
$B goto <target-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/initial.png"
$B links
$B console --errors

# Explore: per-page QA checklist (without fixes)
$B goto <page-1-url>
$B snapshot -i -o "$REPORT_DIR/screenshots/page1.png"
$B console --errors
$B screenshot "$REPORT_DIR/screenshots/page1_full.png"

$B goto <page-2-url>
$B snapshot -i -o "$REPORT_DIR/screenshots/page2.png"
$B console --errors
$B screenshot "$REPORT_DIR/screenshots/page2_full.png"

# Bug severity classification
cat > "$REPORT_DIR/bug_report.md" << 'EOF'
# QA Bug Report

## Severity Classification
- CRITICAL: Blocks core functionality, data loss risk
- HIGH: Major feature broken, no workaround
- MEDIUM: Feature broken, workaround exists
- LOW: Cosmetic, minor UX issue

## Bugs Found

### Bug 1: [Title]
**Severity:** [HIGH/MEDIUM/LOW]
**URL:** 
**Repro Steps:**
1. 
2. 
**Expected:**
**Actual:**
**Screenshot:** 
EOF

# Health score calculation
echo "HEALTH_SCORE:calculate" && echo "CRITICAL:0 HIGH:0 MEDIUM:0 LOW:0"

# Telemetry
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"qa-only","event":"completed","branch":"'"$(git branch --show-current 2>/dev/null || echo unknown)"'","outcome":"reported","duration_s":"'"$_TEL_DUR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```