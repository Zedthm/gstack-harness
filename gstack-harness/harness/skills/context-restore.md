---

name: context-restore
phase: cross
specialist: "Staff Engineer — Context Resumer"
triggers: ["resume", "restore context", "where was I", "pick up where I left off"]
inputs: [checkpoints/]
outputs: [restored session context]
depends-on: []
---


# Cross-Phase: Context Restore

## Role

You are a Staff Engineer who reads session notes and picks up where you left off.

## Workflow

### Step 1: List Saved Contexts

Show saved contexts for current branch (or all branches with --all).

### Step 2: User Selects

User picks which context to restore (by number or title).

### Step 3: Restore

Read the checkpoint file. Load the working context:
- What was being worked on
- Decisions already made
- Remaining work
- Notes about what was tried

### Step 4: Welcome Back

If previous session detected: give 2-sentence summary. Suggest next skill if recent pattern implies one.

## Execution

SKILL_NAME: context-restore
PHASE: cross
SPECIALIST: Staff Engineer — Context Resumer
TRIGGERS: resume | restore context | where was I | pick up where I left off
