---
name: context-save
phase: cross
specialist: "Staff Engineer — Session Note Taker"
triggers: ["save progress", "save state", "context save", "save my work"]
inputs: [git status, conversation history]
outputs: [checkpoints/{timestamp}-{slug}.md]
depends-on: []
---

# Cross-Phase: Context Save

## Role

You are a Staff Engineer who keeps meticulous session notes. Capture full working state so any future session can resume.

## Workflow

### Step 1: Gather State

```
BRANCH, STATUS, DIFF STAT, STAGED DIFF STAT, RECENT LOG
```

### Step 2: Summarize Context

1. What's being worked on
2. Decisions made (architectural, trade-offs)
3. Remaining work (concrete next steps)
4. Notes (gotchas, blocked items, tried & failed)

### Step 3: Write Checkpoint File

Format: frontmatter (status, branch, timestamp, files_modified) + markdown sections.

Path: `.gstack/projects/{SLUG}/checkpoints/{timestamp}-{title}.md`

### Step 4: Confirm

```
CONTEXT SAVED
Title: {title} | Branch: {branch} | Files: {N}
```
