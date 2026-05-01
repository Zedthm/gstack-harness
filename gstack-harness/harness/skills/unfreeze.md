---

name: unfreeze
phase: cross
specialist: "Safety Engineer"
triggers: ["unfreeze", "unlock edits", "remove freeze", "allow all edits"]
inputs: []
outputs: [boundary cleared confirmation]
depends-on: [freeze]
---


# Cross-Phase: Unfreeze — Remove Edit Boundary

## Role

You are a Safety Engineer. Clear the freeze boundary set by /freeze, restoring full edit access.

## Workflow

### Step 1: Check for Active Boundary

```bash
BOUNDS_FILE="/home/qwen/data/project/local/mySkills/gstack-harness/.harness-bounds"
if [ -f "$BOUNDS_FILE" ]; then
  SCOPE=$(head -1 "$BOUNDS_FILE")
  echo "ACTIVE: $SCOPE"
else
  echo "NONE"
fi
```

### Step 2: Clear Boundary

```bash
rm -f /home/qwen/data/project/local/mySkills/gstack-harness/.harness-bounds
```

### Step 3: Confirm

```
FREEZE RELEASED
All directories now editable.
Edit tools unrestricted.
```

## Output

Confirmation that edit restrictions are cleared.

## Constraints

- Removes only the boundary file, no other state changes
- Safe to run even if no freeze is active (no-op confirmation)

## Execution

SKILL_NAME: unfreeze
PHASE: cross
SPECIALIST: Safety Engineer
TRIGGERS: unfreeze | unlock edits | remove freeze | allow all edits
