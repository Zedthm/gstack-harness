---
name: plan-eng-review
description: Eng manager-mode plan review — lock architecture, data flow, diagrams, edge cases, tests
triggers:
  - review the architecture
  - engineering review
  - lock in the plan
  - tech review
  - plan-eng-review
---

## Workflow

1. **Architecture lock** — Define component boundaries and interfaces
2. **Data flow diagrams** — Map input → process → output for each flow
3. **State machines** — Identify all states and transitions
4. **Edge cases** — Enumerate failure modes and error paths
5. **Test coverage matrix** — Map features to test types (unit, integration, e2e)
6. **Security concerns** — Flag authentication, authorization, data handling
7. **Output** — Engineering review document appended to plan

## Execution

```bash
# Check for existing plan/design doc
ls -t DESIGN*.md .sisyphus/plans/*.md 2>/dev/null | head -5

# Read existing plan content
for f in $(ls -t DESIGN*.md .sisyphus/plans/*.md 2>/dev/null | head -1); do
  echo "=== REVIEWING: $f ===" && cat "$f"
done

# Analyze codebase structure
find . -maxdepth 3 -type f \( -name '*.go' -o -name '*.rs' -o -name '*.ts' -o -name '*.py' \) | head -20
ls -la src/ lib/ internal/ cmd/ 2>/dev/null

# Check for existing architecture docs
ls -t ARCHITECTURE.md docs/architecture* 2>/dev/null | head -3

# Test infrastructure
[ -f jest.config.* ] && echo "TEST:junit"
[ -f vitest.config.* ] && echo "TEST:vitest"
[ -f pytest.ini ] || [ -f pyproject.toml ] && echo "TEST:pytest"
[ -f go.mod ] && ls test/ tests/ *_test.go 2>/dev/null | head -5

# API patterns
grep -r 'router\|Route\|api\|endpoint' --include='*.go' --include='*.ts' --include='*.py' -l 2>/dev/null | head -10

# Database schemas
ls -t *schema*.sql *migration* 2>/dev/null | head -5
[ -f prisma/schema.prisma ] && cat prisma/schema.prisma 2>/dev/null | head -30

# Dependencies audit
[ -f package.json ] && cat package.json | grep -A 20 '"dependencies"'
[ -f go.mod ] && cat go.mod | head -20
[ -f Cargo.toml ] && cat Cargo.toml | head -20

# Security patterns
grep -r 'auth\|token\|secret\|password' --include='*.go' --include='*.ts' -l 2>/dev/null | head -10

# Telemetry
_TEL_START=$(date +%s)
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"plan-eng-review","event":"started","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```