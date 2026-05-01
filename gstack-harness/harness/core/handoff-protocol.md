# Handoff Protocol — Agent-to-Agent Coordination via Filesystem

## Problem

When agents hand off work to other agents (especially across sessions or with fresh context via the Coordinator pattern), the next agent must know: what exists, what's been done, what needs doing, and what files matter. Without a protocol, the next agent re-discovers or misses critical context — the "telephone game" failure.

## Golden Rules

1. **Handoff is the API between agents.** Each handoff file is a contract. The next agent reads it, executes against it.
2. **Handoff delivers exactly what the next agent needs — nothing more.** Include file paths and change descriptions, not full code.
3. **The handoff is self-contained.** A clean agent with zero prior context must be able to execute from the handoff alone.
4. **Handoff follows the two-step save invariant:** write content file, then update progress-log.
5. **Handoff version must be declared** so future protocol versions can coexist.

## Handoff File Format

Filename: `handoff_v{version}_{phase}.md`

```
---
version: 2
task-id: {typed-prefixed-id, e.g. r-abc123}
timestamp: {ISO-8601}
phase: {phase-name}
next-worker: {specialist-name}
status: {ready|blocked|complete}
---

# Handoff: {phase-name} → {next-worker}

## What I Did
{1-3 sentences describing completed work}

## What You Need to Do
{Numbered list — concrete actions, not vague guidance}

## Files to Read
{File paths the worker must read before acting, with 1-line summary of what each contains}

## Files to Write
{File paths the worker should produce, with expected format}

## Success Criteria
{Observable conditions that determine if the worker succeeded}

## Known Issues
{Anything the worker should be aware of — failed attempts, gotchas, edge cases}

## Artifacts Produced
{List of output files/directories created during this phase}
```

## Progress Log (Append-Only)

All handoffs update the progress-log.md after completion:

```
## Progress Log

| Version | Phase | Task-ID | Timestamp | Status | Summary |
|---------|-------|---------|-----------|--------|---------|
| v0 | Phase 0: Intent | i-abc123 | 2026-05-01T10:00 | done | Design doc: calendar briefing app |
| v0 | Phase 1: Strategy | r-def456 | 2026-05-01T10:30 | done | CEO/Eng review synthesized |
```

## Context Map (Indexed, Not Loaded)

The context-map.md maps the full filesystem to harness layers. It is a navigation aid, not context to load:

```
# Context Map

## /src/auth/ — Authentication
- auth.ts — JWT handling, permission pipeline (P1: trust boundary at line 47)
- middleware.ts — Route guards, fail-closed default
- Session: auto-memory index in ./memory/

## /docs/ — Design Docs
- design-doc.md — Phase 0 output (current sprint)
- DESIGN.md — Design system (if exists)

## .gstack/ — Harness State
- config.yaml — Harness configuration
- memory/MEMORY.md — Auto-memory index
- memory/topics/*.md — Topic files
```

## Worker Loading Protocol

When a worker agent starts from a handoff:

1. **Read the handoff file** — get task-id, phase, success criteria
2. **Read the listed files** — context-map.md + specific files in "Files to Read"
3. **Execute** — do exactly what the handoff specifies
4. **Write outputs** — produce the files listed in "Files to Write"
5. **Update progress-log** — append one-line status
6. **Create next handoff** — or mark as terminal phase

## Handoff Size Limits

- Max handoff: 2KB (trim to essentials)
- Files to Read: max 10 paths (more than 10 means your phase was too broad)
- Files to Write: max 5 paths (more than 5 means you didn't synthesize)
- Known Issues: max 3 items (more than 3 means the phase should have been split)

## Mutual Exclusion

Only one agent writes to a specific handoff file at a time. Phase boundary = mutual exclusion boundary between phases. Parallel workers within a phase write to separate handoff files (e.g., `handoff_v0_ceo.md` and `handoff_v0_eng.md`).

## Versioning

The handoff version is explicit in filename and frontmatter. When protocol changes:
- Increment version number
- New version agents can read old version handoffs (backward compatible)
- Old version agents reject new version handoffs (forward incompatible — spawn fresh)

## Anti-Patterns

- **Passing raw output:** Handoff that says "see the files for what I found" — the next worker must re-discover everything
- **Including full code in handoff:** Handoff is navigation + spec, not data dump
- **Ambiguous success criteria:** "Make it better" — the worker cannot determine if it succeeded
- **Missing file paths:** "Find the auth files" — waste of the worker's first 5 turns
- **Omitting known issues:** Not telling the worker that X approach already failed
