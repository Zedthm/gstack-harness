---
name: land-and-deploy
description: Merge PR, wait for CI, verify production health — one command from approved to verified
triggers:
  - merge
  - land
  - deploy
  - merge and verify
  - land it
  - ship it to production
---

## Workflow

1. **Detect PR** — Find the open PR for current branch
2. **Merge base** — Confirm branch is up to date with base
3. **Merge PR** — Perform the merge
4. **Wait for CI** — Poll CI status, wait for all checks to pass
5. **Deploy trigger** — Initiate deployment
6. **Health check** — Poll production endpoint for healthy response
7. **Canary verification** — Run basic smoke tests against production
8. **Report** — Summarize deploy status and any issues

## Execution

```bash
# Detect platform and PR
git remote get-url origin 2>/dev/null
gh auth status 2>/dev/null && echo "GITHUB" || echo "GITHUB:unauthenticated"
glab auth status 2>/dev/null && echo "GITLAB" || true

# Find current branch and PR
BRANCH=$(git branch --show-current)
echo "BRANCH:$BRANCH"

# Get PR info
gh pr view --json number,title,state,url,baseRefName -q '"#\(.number) \(.title) [\(.state)] → \(.baseRefName)"' 2>/dev/null || echo "NO_PR"

# Check CI status before merge
gh pr checks 2>/dev/null || echo "NO_CHECKS"

# Check if branch is up to date with base
BASE=$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || echo "main")
git fetch origin "$BASE" --quiet
LOCAL=$(git rev-parse HEAD)
UPSTREAM=$(git rev-parse "origin/$BASE" 2>/dev/null || echo "none")
[ "$LOCAL" = "$UPSTREAM" ] && echo "UP_TO_DATE:true" || echo "UP_TO_DATE:false"

# Merge PR
gh pr merge --squash --delete-branch 2>/dev/null && echo "MERGED:success" || echo "MERGED:failed"

# Wait for CI
for i in $(seq 1 30); do
  STATUS=$(gh run list --limit 1 --json status,conclusion -q '.[0].status + " " + (.[0].conclusion // "running")' 2>/dev/null)
  echo "CI_STATUS[$i]:$STATUS"
  echo "$STATUS" | grep -q "completed" && break
  sleep 10
done

# Deploy trigger (Fly.io example)
fly deploy 2>/dev/null && echo "DEPLOY:triggered" || echo "DEPLOY:manual"

# Health check
PROD_URL=$(cat CLAUDE.md 2>/dev/null | grep -oE 'https?://[^ ]+' | head -1)
[ -n "$PROD_URL" ] && curl -s -o /dev/null -w "HEALTH:%{http_code}" "$PROD_URL" || echo "PROD_URL:unknown"

# Canary smoke test
curl -s "$PROD_URL/api/health" 2>/dev/null || curl -s "$PROD_URL/" 2>/dev/null | head -c 100

# Persist metrics
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"land-and-deploy","event":"completed","branch":"'"$BRANCH"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```