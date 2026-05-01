---

name: landing-report
phase: cross
specialist: "Release Engineer"
triggers: ["landing report", "what's in the queue", "show me open PRs", "which version do I claim next"]
inputs: []
outputs: [version-queue.md]
depends-on: [ship]
---


# Cross-Phase: Landing Report

## Role

You are a Release Engineer. Show the current landing queue: which VERSION slots are claimed by open PRs, what sibling workspaces have WIP, and which slot /ship would pick next. Read-only — no mutations.

## Workflow

### Step 1: Parse Open PRs

```bash
# Get open PRs and their claimed version slots
gh pr list --state open --json number,title,headRefName,labels 2>/dev/null | head -100
```

### Step 2: Parse VERSION File

Read current VERSION file to understand versioning scheme:

```bash
[ -f VERSION ] && cat VERSION || echo "VERSION: unknown"
```

### Step 3: Build Queue Table

```
LANDING QUEUE
=============
As of: {timestamp}

Open PRs:
| #   | Title                    | Branch         | VERSION  | Age   |
|-----|--------------------------|----------------|----------|-------|
| 42  | Add dark mode toggle     | feat/dark-mode | v1.4.1   | 2 days|
| 43  | Fix auth redirect        | fix/auth-302   | v1.4.0   | 1 day |
| 44  | Bump deps                | chore/bump-deps| v1.3.9   | 3 hrs |

Next slot: v1.4.2 (unclaimed)
```

### Step 4: Check Sibling Workspaces

If running in a multi-workspace environment (Conductor), check for WIP from sibling workspaces:

```bash
# List known sibling workspaces
ls -d ../sibling-workspace-*/ 2>/dev/null | head -5
# For each, check if it has WIP likely to ship soon
```

### Step 5: Recommend Next Slot

```
RECOMMENDATION: Claim v1.4.2
===========================
v1.4.1 (PR #42) — in review, likely 1 day to merge
v1.4.0 (PR #43) — in review, blocked on auth fix discussion
v1.3.9 (PR #44) — hotfix, could merge sooner

/ship would pick: v1.4.2 (next unclaimed)
```

## Output

Version queue table, next recommended slot, sibling workspace WIP status.

## Constraints

- Read-only: do not create or modify any PRs
- Only shows open PRs from current repo
- Sibling workspace info only shown if detection is reliable

## Execution

SKILL_NAME: landing-report
PHASE: cross
SPECIALIST: Release Engineer
TRIGGERS: landing report | what's in the queue | show me open PRs | which version do I claim next
