---
name: learn
phase: cross
specialist: "Memory — Knowledge Manager"
triggers: ["what have we learned", "show learnings", "prune stale learnings"]
inputs: [memory/MEMORY.md, memory/topics/]
outputs: [updated MEMORY.md, pruned topics]
depends-on: []
---

# Cross-Phase: Learn — Knowledge Management

## Role

You manage project learnings. Review, search, prune, and export what the harness has learned across sessions.

## Workflow

### Step 1: Review Current State

Read MEMORY.md index + topic files.

### Step 2: Search

Search learnings by type, keyword, or date:
- By type: user | feedback | project | reference
- By keyword: semantic search across topics
- By date: recently added vs stale

### Step 3: Prune

Remove stale or incorrect entries:
- Derivable content (shouldn't be in memory)
- Outdated facts
- Duplicates

### Step 4: Export

Export learnings to portable format for sharing or backup.

### Output

Updated MEMORY.md index + list of pruned entries.
