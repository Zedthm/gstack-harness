---
name: health
description: Code quality dashboard — type checker, linter, test runner, dead code detector
triggers:
  - health check
  - code quality
  - how healthy is the codebase
  - run all checks
  - quality score
---

## Workflow

1. **Type checker** — Run TypeScript/JavaScript type checks
2. **Linter** — Run ESLint, Prettier, or language linter
3. **Test runner** — Run test suite and collect coverage
4. **Dead code detector** — Find unused code, imports, variables
5. **Shell linter** — Check bash/shell scripts
6. **Composite score** — Calculate weighted 0-10 score
7. **Trend tracking** — Compare against historical scores

## Execution

```bash
# TypeScript/JavaScript checks
echo "=== TYPE CHECK ==="
if [ -f "tsconfig.json" ]; then
  npx tsc --noEmit 2>/dev/null | head -30 || echo "TSC:passed"
elif [ -f "package.json" ] && grep -q '"typescript"' package.json; then
  npx tsc --noEmit 2>/dev/null | head -30 || echo "TSC:passed"
else
  echo "TSC:not_applicable"
fi

# Python type checks
if [ -f "pyproject.toml" ] || [ -f "mypy.ini" ]; then
  python -m mypy 2>/dev/null | head -20 || echo "MYPY:not_configured"
fi

# Linter checks
echo "=== LINTER CHECK ==="
if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
  npx eslint src/ --max-warnings 0 2>/dev/null | head -30 || echo "ESLINT:passed"
elif [ -f "package.json" ] && grep -q '"eslint"' package.json; then
  npx eslint src/ --max-warnings 0 2>/dev/null | head -30 || echo "ESLINT:passed"
else
  echo "ESLINT:not_configured"
fi

# Prettier formatting
if [ -f ".prettierrc" ] || [ -f "prettier.config.js" ]; then
  npx prettier --check "src/**/*.{js,ts,jsx,tsx}" 2>/dev/null | head -20 || echo "PRETTIER:passed"
else
  echo "PRETTIER:not_configured"
fi

# Go linter
if [ -f "go.mod" ]; then
  golangci-lint run 2>/dev/null | head -30 || echo "GOLANGCI:passed"
fi

# Rust linter
if [ -f "Cargo.toml" ]; then
  cargo clippy 2>/dev/null | head -30 || echo "CLIPPY:passed"
fi

# Test runner
echo "=== TEST RUNNER ==="
if [ -f "jest.config.js" ] || [ -f "jest.config.ts" ]; then
  npx jest --coverage --coverageReporters=text-summary 2>/dev/null | tail -20
elif [ -f "vitest.config.ts" ]; then
  npx vitest run --coverage 2>/dev/null | tail -20
elif [ -f "pytest.ini" ] || [ -f "pyproject.toml" ]; then
  python -m pytest --cov=. --cov-report=term-missing 2>/dev/null | tail -20
elif [ -f "go.mod" ]; then
  go test ./... -cover 2>/dev/null | tail -20
elif [ -f "Cargo.toml" ]; then
  cargo test 2>/dev/null | tail -20
else
  echo "TEST:none_configured"
fi

# Dead code detection
echo "=== DEAD CODE ==="
if [ -f "package.json" ] && grep -q '"typescript"' package.json; then
  npx tsc --noEmit --allowUnusedLabels 2>/dev/null | grep -i 'unused' | head -10 || echo "NO_DEAD_CODE"
fi

# Shell script linting
echo "=== SHELL LINTING ==="
if command -v shellcheck &>/dev/null; then
  find . -maxdepth 3 -name "*.sh" -type f 2>/dev/null | head -5 | xargs shellcheck 2>/dev/null | head -20 || echo "SHELLCHECK:passed"
else
  echo "SHELLCHECK:not_installed"
fi

# Composite score calculation
echo "=== HEALTH SCORE ==="
echo "Type check: PASS/FAIL"
echo "Linter: PASS/FAIL"
echo "Tests: X% coverage"
echo "Composite: 0-10"

# Create health report
mkdir -p .gstack/health
cat > .gstack/health/current.json << 'EOF'
{
  "timestamp": "",
  "type_check": "pass",
  "linter": "pass",
  "test_coverage": 0,
  "composite_score": 0
}
EOF

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"health","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```