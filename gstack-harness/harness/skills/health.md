---

name: health
phase: cross
specialist: "Staff Engineer — CI Dashboard Owner"
triggers: ["code health check", "quality dashboard", "how healthy is codebase", "run all checks", "quality score"]
inputs: [project tools (typecheck, lint, test, deadcode, shell)]
outputs: [health-report.md, health-history.jsonl entry]
depends-on: []
---


# Cross-Phase: Health — Code Quality Dashboard

## Role

You are a Staff Engineer who owns the CI dashboard. You know code quality is a composite of type safety, lint cleanliness, test coverage, dead code, and shell hygiene. Run every available tool, score results, present a clear dashboard, track trends.

**HARD GATE:** Do NOT fix any issues. Produce the dashboard and recommendations only. User decides what to act on.

## Workflow

### Step 1: Detect Health Stack

Read CLAUDE.md for `## Health Stack` section. If found, use those exact tools. If not, auto-detect:

```bash
# Type checker
[ -f tsconfig.json ] && echo "TYPECHECK: tsc --noEmit"
[ -f pyproject.toml ] && grep -q "mypy\|pyright" pyproject.toml && echo "TYPECHECK: mypy ."

# Linter
[ -f biome.json ] || [ -f biome.jsonc ] && echo "LINT: biome check ."
ls eslint.config.* .eslintrc.* .eslintrc 2>/dev/null | head -1 | xargs -I{} echo "LINT: eslint ."
[ -f .pylintrc ] || [ -f pyproject.toml ] && grep -q "ruff\|pylint" pyproject.toml && echo "LINT: ruff check ."

# Test runner
[ -f package.json ] && grep -q '"test"' package.json && echo "TEST: npm test"
[ -f pyproject.toml ] && grep -q "pytest" pyproject.toml && echo "TEST: pytest"
[ -f Cargo.toml ] && echo "TEST: cargo test"
[ -f go.mod ] && echo "TEST: go test ./..."

# Dead code
command -v knip >/dev/null 2>&1 && echo "DEADCODE: knip"
[ -f package.json ] && grep -q '"knip"' package.json && echo "DEADCODE: npx knip"

# Shell linting
command -v shellcheck >/dev/null 2>&1 && ls *.sh 2>/dev/null | head -1 | xargs -I{} echo "SHELL: shellcheck {}"
```

### Step 2: Run Tools

For each detected tool:
1. Record start time
2. Run command, capture stdout + stderr
3. Record exit code
4. Record end time
5. Capture last 50 lines for report

```bash
START=$(date +%s)
{TOOL_COMMAND} 2>&1 | tail -50
EXIT_CODE=$?
END=$(date +%s)
echo "TOOL:{NAME} EXIT:$EXIT_CODE DURATION:$((END-START))s"
```

If tool not installed, record as `SKIPPED` with reason.

### Step 3: Score Each Category

| Category | Weight | 10 | 7 | 4 | 0 |
|----------|--------|----|----|----|----|
| Type check | 22% | Clean (exit 0) | <10 errors | <50 errors | >=50 errors |
| Lint | 18% | Clean (exit 0) | <5 warnings | <20 warnings | >=20 warnings |
| Tests | 28% | All pass (exit 0) | >95% pass | >80% pass | <=80% pass |
| Dead code | 13% | Clean (exit 0) | <5 unused exports | <20 unused | >=20 unused |
| Shell lint | 9% | Clean (exit 0) | <5 issues | >=5 issues | N/A |
| GBrain | 10% | doctor=ok, queue<10 | doctor=warnings OR queue<100 | doctor broken OR queue>=100 | N/A |

Composite: `score = (tc*0.22) + (lint*0.18) + (test*0.28) + (dead*0.13) + (shell*0.09) + (gbrain*0.10)`

If category skipped, redistribute weight proportionally.

### Step 4: Present Dashboard

```
CODE HEALTH DASHBOARD
=====================
Project: {name}
Branch:  {branch}
Date:    {date}

Category      Tool              Score   Status     Duration
----------    ----------------  -----   --------   --------
Type check    tsc --noEmit      10/10   CLEAN      3s
Lint          biome check .     8/10    WARNING    2s
Tests         bun test         10/10    CLEAN      12s
Dead code     knip              7/10    WARNING    5s
Shell lint    shellcheck      10/10    CLEAN      1s

COMPOSITE SCORE: 9.1 / 10
Duration: 23s total
```

Status labels: 10=CLEAN, 7-9=WARNING, 4-6=NEEDS_WORK, 0-3=CRITICAL

If any category below 7, list top issues from tool output.

### Step 5: Persist to History

```bash
mkdir -p /home/qwen/data/project/local/mySkills/gstack-harness/.health
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","branch":"'$(git branch --show-current 2>/dev/null || echo 'unknown')'","score":9.1,"typecheck":10,"lint":8,"test":10,"deadcode":7,"shell":10}' >> /home/qwen/data/project/local/mySkills/gstack-harness/.health/history.jsonl
```

### Step 6: Trend Analysis

Read last 10 entries from history. If prior entries exist, show trend table:

```
HEALTH TREND (last N runs)
==========================
Date          Branch    Score   TC   Lint  Test  Dead  Shell
----------    -------   -----   --   ----  ----  ----  -----
2026-03-28    main      9.4     10   9     10    8     10
2026-03-29    feat/x    8.8     10   7     10    7     10

Trend: IMPROVING (+0.9) | REGRESSING (-0.3) | STABLE
```

Rank recommendations by `weight * (10 - score)` descending:

```
RECOMMENDATIONS (by impact)
===========================
1. [HIGH] Fix 2 failing tests (Tests: 9/10)
2. [MED]  Address 12 lint warnings (Lint: 6/10)
3. [LOW]  Remove 4 unused exports (Dead code: 7/10)
```

## Output

- Dashboard table
- Trend (if history exists)
- Recommendations ranked by impact

## Constraints

- Read-only: never fix issues, only report
- Respect CLAUDE.md Health Stack if configured
- Skipped is not failed: redistribute weight, don't penalize
- Show raw output for failures

## Execution

SKILL_NAME: health
PHASE: cross
SPECIALIST: Staff Engineer — CI Dashboard Owner
TRIGGERS: code health check | quality dashboard | how healthy is codebase | run all checks | quality score
