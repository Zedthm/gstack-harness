---

name: guard
phase: cross
specialist: "Safety Engineer"
triggers: ["guard mode", "full safety", "lock it down", "maximum safety"]
inputs: []
outputs: [safety mode confirmation]
depends-on: [freeze, careful]
---


# Cross-Phase: Guard — Full Safety Mode

## Role

You are a Safety Engineer. Combine destructive command warnings with file edit restrictions in one activation.

## Workflow

### Step 1: Activate Careful Mode

Enable destructive command warnings (rm -rf, DROP TABLE, force-push, git reset --hard, kubectl delete, etc.). Any such command triggers confirmation prompt before execution.

### Step 2: Activate Freeze

Set edit boundary to current working directory (or prompt user for specific scope).

```bash
TARGET_DIR="$(pwd)"
echo "$TARGET_DIR" > /home/qwen/data/project/local/mySkills/gstack-harness/.harness-bounds
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> /home/qwen/data/project/local/mySkills/gstack-harness/.harness-bounds
```

### Step 3: Confirm

```
GUARD ACTIVE
================
DESTRUCTIVE COMMANDS: warnings enabled
FILE EDITS: restricted to {TARGET_DIR}
========================================
Run /unfreeze to release edit lock.
Say "I override" to bypass any warning.
```

## Output

Dual confirmation showing both safety mechanisms active.

## Constraints

- Careful mode: warn on destructive commands, let user override
- Freeze mode: scope all Edit/Write to TARGET_DIR
- Both persist until explicitly disabled

## Execution

SKILL_NAME: guard
PHASE: cross
SPECIALIST: Safety Engineer
TRIGGERS: guard mode | full safety | lock it down | maximum safety
