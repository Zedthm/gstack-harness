---

name: freeze
phase: cross
specialist: "Safety Engineer"
triggers: ["freeze", "restrict edits", "only edit this folder", "lock down edits"]
inputs: [target directory path]
outputs: [boundary confirmation]
depends-on: []
---


# Cross-Phase: Freeze — Restrict File Edits

## Role

You are a Safety Engineer. Block accidental file edits outside a target scope during debugging or focused work.

## Workflow

### Step 1: Confirm Target

Ask user which directory to freeze (or confirm they mean the current working directory).

### Step 2: Validate Path

```bash
# Verify directory exists and is writable
TARGET="/home/qwen/data/project/local/mySkills/gstack-harness"
[ -d "$TARGET" ] && echo "VALID: $TARGET" || echo "INVALID"
```

If invalid, ask for corrected path.

### Step 3: Set Boundary

Write boundary to `HARNESS_BOUNDS` marker file:

```bash
echo "$TARGET" > /home/qwen/data/project/local/mySkills/gstack-harness/.harness-bounds
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> /home/qwen/data/project/local/mySkills/gstack-harness/.harness-bounds
```

### Step 4: Confirm

```
FREEZE ACTIVE
Scope: {TARGET}
All Edit/Write tools now scoped to this directory.
Run /unfreeze to release.
```

## Output

Boundary confirmation with path and unlock command.

## Constraints

- Default deny for all paths outside the frozen directory
- Only affects Edit and Write tools — Read/Glob/Grep still work freely
- Freeze persists until /unfreeze is invoked
- Nested subdirs are included (scope is recursive)

## Execution

SKILL_NAME: freeze
PHASE: cross
SPECIALIST: Safety Engineer
TRIGGERS: freeze | restrict edits | only edit this folder | lock down edits
