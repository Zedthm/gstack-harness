---
name: landing-report
description: Read-only queue dashboard — shows open PRs, claimed VERSION slots, WIP work
triggers:
  - landing report
  - what's in the queue
  - show me open PRs
  - which version do I claim next
---

## Workflow

1. **List open PRs** — Show all open pull requests
2. **Check VERSION slots** — Find which VERSION numbers are claimed
3. **Check sibling workspaces** — Find WIP in other Conductor workspaces
4. **Suggest next slot** — Recommend next available VERSION
5. **Output dashboard** — Present queue status

## Execution

```bash
# Platform detection
git remote get-url origin 2>/dev/null
gh auth status 2>/dev/null && echo "GITHUB:connected" || echo "GITHUB:disconnected"
glab auth status 2>/dev/null && echo "GITLAB:connected" || echo "GITLAB:disconnected"

# List open PRs
echo "=== OPEN PRS ==="
if command -v gh &>/dev/null; then
  gh pr list --state=open --json number,title,author,baseRefName,createdAt -q '.[] | "#\(.number) \(.title) | \(.author.login) -> \(.baseRefName) | \(.createdAt)"' 2>/dev/null | head -20 || echo "NO_PRS"
fi

# Check VERSION file
echo "=== VERSION SLOTS ==="
if [ -f "VERSION" ]; then
  CURRENT_VERSION=$(cat VERSION)
  echo "CURRENT_VERSION:$CURRENT_VERSION"
else
  echo "NO_VERSION_FILE"
  CURRENT_VERSION="0.0.0"
fi

# Parse major.minor.patch
MAJOR=$(echo "$CURRENT_VERSION" | cut -d. -f1)
MINOR=$(echo "$CURRENT_VERSION" | cut -d. -f2)
PATCH=$(echo "$CURRENT_VERSION" | cut -d. -f3)
echo "NEXT_PATCH_VERSION:$MAJOR.$MINOR.$((PATCH + 1))"

# Find claimed versions from PRs
echo "=== CLAIMED VERSIONS ==="
for pr in $(gh pr list --state=open --json number -q '.[].number' 2>/dev/null); do
  PR_VERSION=$(gh pr view "$pr" --json title -q '.title' 2>/dev/null | grep -oE 'v?[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  [ -n "$PR_VERSION" ] && echo "PR #$pr claims: $PR_VERSION"
done

# Check for pending/claimed slots
ls -la .gstack/landing/ 2>/dev/null | head -10
cat .gstack/landing/*.json 2>/dev/null | head -30 || echo "NO_LANDING_DATA"

# Sibling workspace detection (Conductor)
echo "=== SIBLING WORKSPACES ==="
git worktree list 2>/dev/null | head -10
ls -la .worktrees/ 2>/dev/null | head -10

# Suggest next version
echo "=== RECOMMENDED NEXT VERSION ==="
echo "Option 1 (patch): $MAJOR.$MINOR.$((PATCH + 1))"
echo "Option 2 (minor): $MAJOR.$((MINOR + 1)).0"
echo "Option 3 (major): $((MAJOR + 1)).0.0"

# Queue dashboard
cat << 'EOF'
=== LANDING QUEUE ===

| Version | PR # | Status | Author |
|---------|------|--------|--------|
| v1.2.3 | #42 | open | @user1 |
| v1.2.4 | #45 | WIP | @user2 |
| - | #48 | queued | @user3 |

Next available: v1.2.5
EOF

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"landing-report","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```