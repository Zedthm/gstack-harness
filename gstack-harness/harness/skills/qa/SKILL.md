---
name: qa
description: Systematically QA test a web app and fix bugs — open real browser, find issues, fix them
triggers:
  - qa test this
  - find bugs on site
  - test the site
---

## Workflow

1. **Setup** — Parse URL/tier/mode/scope/auth from request, detect CDP mode, verify clean working tree, find browse binary
2. **Test framework bootstrap** — Detect or bootstrap test framework if none exists
3. **Authenticate** — Handle login/cookie import if auth is needed
4. **Orient** — Map the application: snapshot, links, console errors, detect framework
5. **Explore** — Visit pages systematically, per-page checklist (visual, interactive, forms, navigation, states, console)
6. **Document** — Capture evidence per issue: screenshots before/after, repro steps
7. **Wrap up** — Compute health score, write top 3 issues, console summary, save baseline
8. **Triage** — Sort by severity, select fixes by tier (Quick/Standard/Exhaustive)
9. **Fix loop** — For each fixable issue: locate source → minimal fix → commit → re-test → regression test → classify
10. **Final QA** — Re-run QA on all fixed pages, compute final health score
11. **Report** — Write report to local + project-scoped locations
12. **TODOS.md update** — Add deferred bugs, mark fixed bugs
13. **Capture learnings** — Log non-obvious patterns and pitfalls

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

# CDP mode detection
$B status 2>/dev/null | grep -q "Mode: cdp" && echo "CDP_MODE=true" || echo "CDP_MODE=false"

# Test framework bootstrap detection
setopt +o nomatch 2>/dev/null || true
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini pyproject.toml phpunit.xml 2>/dev/null

# Create output directories
mkdir -p .gstack/qa-reports/screenshots

# Prior learnings
~/.claude/skills/gstack/bin/gstack-learnings-search --limit 10 2>/dev/null || true

# Test plan context
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)"
ls -t ~/.gstack/projects/$SLUG/*-test-plan-*.md 2>/dev/null | head -1

# Orient: map the application
$B goto <target-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/initial.png"
$B links
$B console --errors

# Explore: per-page QA checklist
$B goto <page-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/page-name.png"
$B console --errors

# Document: capture evidence
$B screenshot "$REPORT_DIR/screenshots/issue-001-step-1.png"
$B click @e5
$B screenshot "$REPORT_DIR/screenshots/issue-001-result.png"
$B snapshot -D

# Fix loop: commit each fix
git add <only-changed-files>
git commit -m "fix(qa): ISSUE-NNN — short description"

# Regression test
{detected test command} {new-test-file}

# Final QA: re-run on fixed pages
$B goto <affected-url>
$B screenshot "$REPORT_DIR/screenshots/issue-NNN-after.png"
$B console --errors
$B snapshot -D

# Report
~/.claude/skills/gstack/bin/gstack-learnings-log '{"skill":"qa","type":"TYPE","key":"KEY","insight":"INSIGHT","confidence":N,"source":"SOURCE"}'

# Telemetry (run last)
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"qa","event":"completed","branch":"'"$(git branch --show-current 2>/dev/null || echo unknown)"'","outcome":"OUTCOME","duration_s":"'"$_TEL_DUR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```
