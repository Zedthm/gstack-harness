---
name: plan-devex-review
description: Interactive developer experience plan review — personas, TTHW benchmarks, friction tracing
triggers:
  - dx review
  - developer experience audit
  - devex review
  - plan-devex-review
  - API design review
---

## Workflow

1. **Persona exploration** — Define developer personas (Junior, Senior, DevOps)
2. **Competitive benchmarking** — Compare TTHW against competitor products
3. **Magical moment design** — Define the wow moment for developers
4. **Friction tracing** — Step-by-step journey mapping
5. **20-45 forcing questions** — Interactive interview about DX decisions
6. **Three modes** — DX EXPANSION, DX POLISH, DX TRIAGE
7. **Output** — DX plan with scores and improvement targets

## Execution

```bash
# Check existing documentation
ls -t README.md QUICKSTART.md GETTING_STARTED.md 2>/dev/null | head -3
cat README.md 2>/dev/null | head -50

# Analyze current developer journey
[ -f package.json ] && cat package.json | grep -E '"scripts"|"bin"|"dependencies"|"devDependencies"' -A 20 | head -40
[ -f go.mod ] && cat go.mod | head -20
[ -f pyproject.toml ] && cat pyproject.toml | head -30

# Check for existing API docs
ls -t docs/api/ api-reference/ API.md 2>/dev/null | head -5
find docs -name '*.md' -type f | head -10

# CLI analysis
[ -f package.json ] && cat package.json | grep -E '"bin"' -A 10 | head -15
ls bin/ cmd/ 2>/dev/null | head -20

# Error message quality
grep -r 'error\|Error\|throw' --include='*.go' --include='*.ts' --include='*.py' -A 2 2>/dev/null | grep -E '".*"' | head -20

# Competitive analysis
curl -s "https://api.github.com/repos/twitter/bootstrap" 2>/dev/null | grep -oE '"description": "[^"]*"' | head -1 || true
curl -s "https://api.github.com/repos/tailwindcss/tailwindcss" 2>/dev/null | grep -oE '"description": "[^"]*"' | head -1 || true

# Check for existing DX learnings
~/.claude/skills/gstack/bin/gstack-learnings-search --limit 10 --topic devex 2>/dev/null || true

# Create DX plan template
mkdir -p .sisyphus/plans
cat > .sisyphus/plans/devex-review.md << 'EOF'
# DX Plan

## Developer Personas
1. [Persona 1]
2. [Persona 2]

## Competitive Benchmarks
| Product | TTHW |
|---------|------|
| [Competitor A] | X min |
| [Competitor B] | Y min |

## Magical Moment
What makes developers say "wow"?

## Friction Points
1.
2.
3.

## Target Scores
| Dimension | Current | Target |
|-----------|---------|--------|
EOF

# Telemetry
_TEL_START=$(date +%s)
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"plan-devex-review","event":"started","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```