# Memory Persistence — Cross-Session Knowledge

## Golden Rules

1. **Separate layers by scope and durability.** Instruction memory (curated) ≠ auto-memory (agent-written) ≠ session extraction (background-derived).
2. **Local overrides win — always.** org → user → project → local. Local is last in concatenation, gets most attention.
3. **Auto-memory has type taxonomy.** user | feedback | project | reference. Taxonomize, don't chronologize.
4. **Two-step save invariant.** Write topic file first, then update index. Crash between steps → orphaned topic file, index stays consistent.
5. **Index is bounded always-on context; topic files are on-demand.** Max index: 200 lines / 25KB. Truncation appended silently.
6. **Background extraction writes directly.** Extractor runs at session end. If main agent wrote during turn, extractor skips (mutual exclusion per turn).
7. **Propose-not-auto-write for cross-layer promotion.** Proposals require explicit approval.
8. **Derivable content does not belong in memory.** Architecture, code patterns, version history — re-derivable.

## GSTACK-HARNESS Memory Layers

### Instruction Memory (human-curated, always-on)

Discover and concatenate in ascending priority order:

| Scope | File Location | Who Edits |
|-------|--------------|-----------|
| Org-wide | `~/.mySkills/instructions/org.md` | Team/organization |
| User-level | `~/.mySkills/instructions/user.md` | You (global prefs) |
| Project | `PROJECT_ROOT/.agents/instructions/project.md` | You + team |
| Local override | `PROJECT_ROOT/.agents/instructions/local.md` | You only (never committed) |

Include directives supported: `@include instructions/rules/ai-safety.md`

### Auto-Memory (agent-written, capped)

Location: `PROJECT_ROOT/.agents/memory/`

- `MEMORY.md` — index (capped at 200 lines / 25KB)
- `topics/` — individual topic files with YAML frontmatter:
  ```yaml
  ---
  name: "bun not npm"
  type: feedback
  description: "Use bun for all package operations"
  ---
  ```

Four types:
- **user:** Who the user is, their preferences, working patterns
- **feedback:** Behavioral corrections ("always use tabs", "no semicolons")
- **project:** Context not derivable from code (history, decisions, constraints)
- **reference:** Stable reference facts (API versions, deployment URLs)

### Team Memory (shared auto-memory)

Location: `PROJECT_ROOT/.agents/team-memory/`

Requires auto-memory enabled. Same structure, same taxonomy. Shared by all team members.

### Session Extraction (background, post-response)

Runs at end of session:
1. Read session transcript
2. Extract cross-session-worthy knowledge per type taxonomy
3. Write topic files + update index (two-step save)
4. Skip if main agent already wrote during turn (mutual exclusion)
5. Capped at 5 turns — prevents rabbit holes
6. Write-locked to auto-memory directory only

### Review & Promotion

Triggered via `/remember` skill:
- Audits all memory layers
- Proposes promotions (auto → project, auto → user, auto → team)
- Categorized by action: promote to conventions / personal / team / cleanup / ambiguous
- Never applies changes without explicit approval

## Index Entry Format

Each index line: `[type] {title} → {topic-file} | {one-line summary}`

- Max 150 chars per line (detail in topic file)
- Multi-line summary violates budget — use 1-line hook only
- Entry count capped — new entries beyond cap silently displace old ones (FIFO within type)

## Gotchas

- **Index truncation fires silently.** Byte cap can trigger while line count is fine — long entries are the culprit.
- **Extraction timing race.** User starts next turn before extraction completes — overlap guard coalesces.
- **Derivable content wastes space.** "auth uses JWT" when auth.ts clearly shows JWT — agent will try to save it anyway.
- **Orphaned topics accumulate.** Crash after topic write but before index update → orphan. Periodic sweep recommended.
- **Team memory disabled when auto-memory disabled.** Disabling one silently disables both.
