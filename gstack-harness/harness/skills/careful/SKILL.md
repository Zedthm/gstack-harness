---
name: careful
description: Safety guardrails — warns before destructive commands (rm -rf, DROP TABLE, force-push)
triggers:
  - be careful
  - safety mode
  - prod mode
  - careful mode
---

## Workflow

1. **Activate guardrails** — Enable destructive command warnings
2. **Watch for dangerous patterns** — Monitor for rm -rf, DROP TABLE, force-push, git reset --hard
3. **Warn before execution** — Show warning with confirmation prompt
4. **User override option** — Allow user to proceed if they confirm
5. **Log all warnings** — Track safety events for review

## Execution

```bash
# Safety patterns to watch for
DANGEROUS_PATTERNS="rm -rf|DROP TABLE|DROP DATABASE|force push|git reset --hard|git push --force|--delete=main|--delete=master|truncate|delete from.*where"

# Check recent git operations
echo "=== RECENT GIT OPERATIONS ==="
git log --oneline -10
git reflog -10 2>/dev/null | head -10

# Check for uncommitted destructive changes
git status --porcelain

# Watchdog script for dangerous commands
cat > .gstack/careful-watchdog.sh << 'EOF'
#!/bin/bash
# Watches command history for dangerous patterns
while true; do
  history -a
  last_cmd=$(tail -1 ~/.bash_history 2>/dev/null || tail -1 ~/.zsh_history 2>/dev/null)
  echo "$last_cmd" | grep -E "$DANGEROUS_PATTERNS" && echo "DANGEROUS_COMMAND_DETECTED: $last_cmd"
  sleep 5
done
EOF

# Safety check before git operations
echo "=== SAFETY CHECK ==="
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Check if we're about to push to protected branch
git remote get-url origin 2>/dev/null
PROTECTED_BRANCHES="main master develop"
for branch in $PROTECTED_BRANCHES; do
  [ "$CURRENT_BRANCH" = "$branch" ] && echo "WARNING: On protected branch '$branch'"
done

# Safety aliases setup
cat << 'EOF'
# Add to ~/.bashrc or ~/.zshrc for persistent safety:
# alias rm='rm -i'    # Interactive rm
# alias gitpush='git push 2>/dev/null || echo "USE --force CAREFULLY"'
EOF

# Safety log
mkdir -p .gstack/safety
echo '{"event":"careful_activated","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","branch":"'"$CURRENT_BRANCH"'"}' >> .gstack/safety/careful.log

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"careful","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```