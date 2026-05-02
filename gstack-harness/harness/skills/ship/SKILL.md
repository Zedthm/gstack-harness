---
name: ship
description: Fully automated ship workflow — merge base, run tests, review diff, bump VERSION, update CHANGELOG, push, create PR
triggers:
  - ship it
  - create a pr
  - push to main
  - deploy this
---

## Workflow

1. **Pre-flight** — Verify not on base branch, check git status, display Review Readiness Dashboard, check distribution pipeline
2. **Merge base** — Fetch and merge base branch into feature branch (before tests)
3. **Test bootstrap** — Detect or bootstrap test framework if none exists
4. **Run tests** — Run all test suites in parallel on merged code; triage failures (in-branch vs pre-existing)
5. **Eval suites** — Run affected eval suites if prompt-related files changed
6. **Coverage audit** — Subagent: trace codepaths, map user flows, generate coverage tests, apply coverage gate
7. **Plan completion** — Subagent: extract plan items, cross-reference against diff, classify DONE/PARTIAL/NOT DONE
8. **Plan verification** — Run /qa-only inline using plan's verification section; gate on results
9. **/review inline** — Run pre-landing review with specialists, Fix-First, adversarial review
10. **/design-review-lite** — Run lite design review if frontend files changed
11. **VERSION bump** — Auto-bump based on change type; queue drift detection
12. **CHANGELOG update** — Auto-generate from diff using conventional commit analysis
13. **Commit** — Squash WIP commits, stage intentional changes, commit with semantic message
14. **Push** — Push to origin with upstream tracking
15. **Documentation sync** — Subagent: run /document-release for full doc sync
16. **Create PR** — Generate PR with full body (summary, coverage, review, design, eval, Greptile, scope drift, plan, verification, TODOS, documentation)
17. **Persist metrics** — Log coverage, plan completion, verification results to ship metrics file

## Execution

```bash
# Step 0: Platform detection
git remote get-url origin 2>/dev/null
gh auth status 2>/dev/null && echo "GITHUB" || echo "UNKNOWN"
glab auth status 2>/dev/null && echo "GITLAB" || true

# Step 1: Pre-flight - check branch
git branch --show-current
git fetch origin <base> --quiet && git diff origin/<base> --stat

# Review Readiness Dashboard
~/.claude/skills/gstack/bin/gstack-review-read

# Distribution pipeline check
git diff origin/<base> --name-only | grep -E '(cmd/.*/main\.go|bin/|Cargo\.toml|setup\.py|package\.json)' | head -5

# Step 3: Merge base branch
git fetch origin <base> && git merge origin/<base> --no-edit

# Step 4: Test framework bootstrap
setopt +o nomatch 2>/dev/null || true
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini pyproject.toml phpunit.xml 2>/dev/null

# Step 5: Run tests in parallel
bin/test-lane 2>&1 | tee /tmp/ship_tests.txt &
npm run test 2>&1 | tee /tmp/ship_vitest.txt &
wait

# Step 6: Eval suites (if prompt files changed)
git diff origin/<base> --name-only | grep -E '(prompt_builder|generation_service|evaluator|scorer|system_prompts)' || echo "NO_PROMPT_FILES"
EVAL_JUDGE_TIER=full bin/test-lane --eval test/evals/<suite>_eval_test.rb 2>&1

# Step 7: Coverage audit (subagent) - see Step 7 subagent prompt in skill file

# Step 8: Plan completion audit (subagent) - see Step 8 subagent prompt in skill file

# Step 8.1: Plan verification - check dev server
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || echo "NO_SERVER"

# Step 11: VERSION bump
cat VERSION 2>/dev/null || echo "NO_VERSION"
git diff origin/<base> --name-only | head -20
~/.claude/skills/gstack/bin/gstack-next-version --base <base> --bump patch 2>/dev/null || echo "OFFLINE"

# Step 12: CHANGELOG update - auto-generate from commits
git log origin/<base>..HEAD --oneline
git diff origin/<base> --stat

# Step 13: Commit
git add .
git commit -m "<type>: <summary>" || echo "ALREADY_COMMITTED"

# Step 14: Push
git fetch origin <branch> 2>/dev/null
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/<branch> 2>/dev/null || echo "none")
[ "$LOCAL" = "$REMOTE" ] && echo "ALREADY_PUSHED" || git push -u origin <branch>

# Step 16: Create PR
gh pr view --json url,number,state -q 'if .state == "OPEN" then "PR #\(.number): \(.url)" else "NO_PR" end' 2>/dev/null || echo "NO_PR"
gh pr create --base <base> --title "v<VERSION> <type>: <summary>" --body "$(cat <<'EOF'
<PR body>
EOF
)"

# Step 17: Persist metrics
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)" && mkdir -p ~/.gstack/projects/$SLUG
echo '{"skill":"ship","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","coverage_pct":COVERAGE,"plan_items_total":PLAN_TOTAL,"plan_items_done":PLAN_DONE}' >> ~/.gstack/projects/$SLUG/$BRANCH-reviews.jsonl

# Telemetry (run last)
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"ship","event":"completed","branch":"'"$(git branch --show-current 2>/dev/null || echo unknown)"'","outcome":"OUTCOME","duration_s":"'"$_TEL_DUR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```
