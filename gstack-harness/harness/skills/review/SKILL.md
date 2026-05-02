---
name: review
description: Systematic PR/代码审查 — find bugs that pass CI but blow up in production
triggers:
  - review this pr
  - code review
  - check my diff
  - pre-landing review
---

## Workflow

1. **Pre-flight** — Detect platform (GitHub/GitLab), determine base branch, verify branch is not base
2. **Scope analysis** — Check scope drift: do diff matches stated intent? Read TODOS.md and PR description
3. **Checklist review** — Read `.claude/skills/review/checklist.md`, fetch Greptile comments if available
4. **Diff analysis** — Fetch latest base, run `git diff`, slop scan, search learnings
5. **Critical pass** — Apply CRITICAL + INFORMATIONAL checklist categories against the diff
6. **Specialist dispatch** — Dispatch testing, maintainability, security, performance, data-migration, API contract, design specialists in parallel (50+ line diffs)
7. **Fix-First review** — Auto-fix mechanical issues, batch-ask about non-mechanical findings
8. **Adversarial review** — Claude subagent + Codex adversarial challenge (always-on), Codex structured review (200+ line diffs)
9. **Persist + learn** — Log review result, capture learnings, run telemetry

## Execution

```bash
# Step 0: Detect platform and base branch
git remote get-url origin 2>/dev/null

# Platform detection logic
# github.com → GitHub, gitlab → GitLab, else check CLI availability

# Step 1: Check branch
git branch --show-current
git fetch origin <base> --quiet && git diff origin/<base> --stat

# Step 1.5: Scope drift — read TODOS.md and PR description
gh pr view --json body -q .body 2>/dev/null || true
git log origin/<base>..HEAD --oneline

# Step 2: Read checklist
cat .claude/skills/review/checklist.md 2>/dev/null || echo "CHECKLIST_NOT_FOUND"

# Step 2.5: Greptile comments
cat .claude/skills/review/greptile-triage.md 2>/dev/null || true

# Step 3: Get the diff
git fetch origin <base> --quiet
git diff origin/<base>

# Step 3.4: Queue status
git show HEAD:VERSION 2>/dev/null || echo "NO_VERSION"
gh pr view --json baseRefName -q .baseRefName 2>/dev/null || echo "main"

# Step 3.5: Slop scan
bun run slop:diff origin/<base> 2>/dev/null || true

# Prior learnings
~/.claude/skills/gstack/bin/gstack-learnings-search --limit 10 2>/dev/null || true

# Step 4: Critical pass — apply checklist categories
# (read diff and checklist, apply CRITICAL + INFORMATIONAL categories)

# Step 4.5: Specialist dispatch
~/.claude/skills/gstack/bin/gstack-specialist-stats 2>/dev/null || true

# Diff scope detection
~/.claude/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null || true

# Step 5.8: Persist review result
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","issues_found":N,"critical":N,"informational":N}'

# Learnings capture
~/.claude/skills/gstack/bin/gstack-learnings-log '{"skill":"review","type":"TYPE","key":"KEY","insight":"INSIGHT","confidence":N,"source":"SOURCE"}'

# Telemetry (run last)
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"review","event":"completed","branch":"'"$(git branch --show-current 2>/dev/null || echo unknown)"'","outcome":"OUTCOME","duration_s":"'"$_TEL_DUR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```
