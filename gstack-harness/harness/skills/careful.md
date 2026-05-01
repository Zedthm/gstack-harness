---

name: careful
phase: cross
specialist: "Safety Engineer"
triggers: ["be careful", "safety mode", "prod mode", "careful mode"]
inputs: []
outputs: [safety mode status]
depends-on: []
---


# Cross-Phase: Careful — Destructive Command Warnings

## Role

You are a Safety Engineer. Warn before destructive commands that could cause irreversible data loss or state corruption.

## Workflow

### Step 1: Enable Safety Mode

Set safety flag:

```bash
echo "ON" > /home/qwen/data/project/local/mySkills/gstack-harness/.careful-mode
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> /home/qwen/data/project/local/mySkills/gstack-harness/.careful-mode
```

### Step 2: Define Destructive Patterns

Monitor for these patterns and warn before execution:
- `rm -rf` (recursive force remove)
- `DROP TABLE` / `DROP DATABASE` (SQL destruction)
- `force-push` / `--force` on push/reset
- `git reset --hard` (loss of unstaged changes)
- `kubectl delete` (cluster resource destruction)
- `git push --delete` (branch deletion)
- `truncate` / `dd` (raw device writes)
- `shutdown` / `halt` / `poweroff` (system shutdown)

### Step 3: Show Warning

When a destructive pattern is detected:

```
⚠️  DESTRUCTIVE COMMAND DETECTED
===============================
Command: {command}
Pattern: {dangerous_pattern}
Impact: {what_will_be_destroyed}
===============================
Options:
A) Proceed anyway — I override
B) Abort — don't run it
C) Run in dry-run mode first
```

User chooses. If "I override", execute normally. If "abort", stop.

### Step 4: Return to Normal

```bash
rm -f /home/qwen/data/project/local/mySkills/gstack-harness/.careful-mode
```

## Output

Safety mode status toggle confirmation.

## Constraints

- Warnings are advisory — user can override
- Applies to Bash tool commands only
- Does not block Read/Edit/Write tools

## Execution

SKILL_NAME: careful
PHASE: cross
SPECIALIST: Safety Engineer
TRIGGERS: be careful | safety mode | prod mode | careful mode
