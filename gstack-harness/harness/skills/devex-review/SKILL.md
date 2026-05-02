---
name: devex-review
description: Live developer experience audit — test onboarding, time TTHW, screenshot errors
triggers:
  - test the DX
  - dx audit
  - developer experience test
  - devex-review
  - try the onboarding
---

## Workflow

1. **Developer persona setup** — Define the target developer profile
2. **Onboarding flow test** — Navigate docs, try getting started
3. **TTHW measurement** — Time to hello world
4. **Error capture** — Screenshot and log all errors encountered
5. **CLI help text evaluation** — Check help output quality
6. **DX scorecard** — Score: documentation, onboarding, API design, error messages
7. **Compare to plan** — Boomerang check against /plan-devex-review scores

## Execution

```bash
# Check for plan-devex-review scores to compare
ls -t .sisyphus/plans/*devex* .gstack/*devex* 2>/dev/null | head -3
cat .sisyphus/plans/*devex*.md 2>/dev/null | grep -A 5 "TTHW\|score" | head -20

# Detect project type
[ -f package.json ] && cat package.json | grep '"name"' | head -1
[ -f go.mod ] && head -1 go.mod
[ -f Cargo.toml ] && grep name Cargo.toml | head -1
[ -f pyproject.toml ] && grep name pyproject.toml | head -1

# Documentation structure
ls -t README.md QUICKSTART.md GETTING_STARTED.md CONTRIBUTING.md 2>/dev/null | head -5
ls docs/ doc/ documentation/ 2>/dev/null | head -10

# CLI tools
ls bin/ cmd/ scripts/ 2>/dev/null | head -20
[ -f package.json ] && cat package.json | grep -E '"bin"|"scripts"' -A 10 | head -20
[ -f setup.py ] && cat setup.py | grep console_scripts | head -5

# Find browse binary
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"
[ -x "$B" ] && echo "BROWSE_READY" || echo "BROWSE_NOT_FOUND"

# Start TTHW timer
_TTHW_START=$(date +%s)
echo "TTHW_START:$_TTHW_START"

# Test getting started flow
mkdir -p .gstack/devex-audit
$B goto http://localhost:3000 2>/dev/null || $B goto https://docs.example.com 2>/dev/null || true
$B snapshot -i -o ".gstack/devex-audit/00_start.png"
$B screenshot ".gstack/devex-audit/00_start_full.png"

# CLI help evaluation
$B goto https://localhost:3000 2>/dev/null || true
# Navigate to docs
$B goto "https://docs.example.com/getting-started"
$B snapshot -i -o ".gstack/devex-audit/01_docs.png"
$B screenshot ".gstack/devex-audit/01_docs_full.png"

# Run actual CLI commands
timeout 5 npm run help 2>/dev/null || timeout 5 ./bin/cli help 2>/dev/null || echo "CLI_HELP:unavailable"

# Measure TTHW
_TTHW_END=$(date +%s)
_TTHW_DUR=$(( _TTHW_END - _TTHW_START ))
echo "TTHW_SECONDS:$_TTHW_DUR"

# DX Scorecard
cat > .gstack/devex-audit/scorecard.md << 'EOF'
# DX Scorecard

| Dimension | Score (1-10) | Evidence |
|-----------|--------------|----------|
| Documentation | | |
| Onboarding | | |
| API Design | | |
| Error Messages | | |
| CLI Quality | | |

## Findings
EOF

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"devex-review","event":"completed","tthw_s":'"$_TTHW_DUR"',"session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```