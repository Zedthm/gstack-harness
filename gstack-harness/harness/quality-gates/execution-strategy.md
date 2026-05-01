# Execution Strategy — Multi-Agent Parallel Dispatch

## Purpose

Define HOW specialists are dispatched across a sprint. Not what they do (that's the skill files) — how they coordinate, parallelize, and hand off.

## Sprint Dispatch Table

| Phase | Dispatch Pattern | Parallelism | Sync Point | Timeout |
|-------|-----------------|-------------|------------|---------|
| 0: Intent | Single worker | — | Design doc ready | 10 min |
| 1A: CEO Review | Fork (3-way) | CEO ∥ Eng ∥ Design | All three done → synthesize | 15 min each |
| 2: Implementation | Sequential | design-html → review → fix | Each depends on previous | 20 min |
| 3: QA | Fork (2-way) | QA ∥ Security | Both done → merge | 15 min each |
| 4: Ship | Sequential | ship → deploy → canary | Each depends on previous | 10 min each |
| 5: Reflect | Fork (2-way) | Retro ∥ Doc sync | Both done → sprint complete | 10 min each |

## Worker Brief Template

Every worker dispatched by the coordinator receives a brief following this exact structure:

```markdown
# Worker Brief: {specialist-name}

## Role
You are a {specialist title}. Your only job is {one-sentence scope}.

## Task
{Numbered list — concrete actions}

## What to Read
- Path 1: {1-line summary of what's in it}
- Path 2: {1-line summary}

## What to Write
- Output path: {where to put output}
- Expected format: {brief format spec}

## Constraints
- You may NOT: {specific forbidden actions}
- You may: {specific allowed actions}

## Success Criteria
{Observable conditions — "done" means these are all true}

## Phase Context
This is phase {N} of sprint {sprint-id}.
Previous phase output: {path to handoff file}
Next phase worker: {who receives your output}
```

## Parallelism Rules

1. **Fork (full-inheritance) for parallel reviews.** CEO, Eng, Design all inherit Phase 0 output. They diverge on analysis dimension but share the same context source. Fork is single-level — these workers don't fork again.

2. **Swarm (flat roster) for QA + Security.** Both are independent workstreams that coordinate through shared qa-report.jsonl. Neither can spawn sub-workers.

3. **Coordinator (zero-inheritance) for all sequential phases.** Design HTML gets ONLY the synthesized sprint-spec — not raw Phase 1 output. This forces coordinator to synthesize, not delegate understanding.

## Continuation Policy

When a worker's output triggers the next worker type:

| Scenario | Action |
|----------|--------|
| Worker already has loaded context that overlaps next task | Continue (same agent, new task) |
| Next task requires fresh perspective (verification) | Spawn new agent with handoff |
| Worker has accumulated > 80KB context | Spawn new agent (context refresh) |
| Worker is mid-turn on unrelated work | Spawn new agent |

## Error Recovery

When a worker reports failure:

1. **Classify failure:**
   - TRANSIENT (tool timeout, file lock) → retry same worker (max 3 attempts)
   - CONTEXTUAL (missing file, wrong path) → coordinator fixes brief, re-spawn
   - LOGICAL (impossible requirements, contradiction in spec) → escalate to human

2. **After 3 failed attempts:**
   - STOP all parallel workers in the same phase
   - Document what was attempted and what failed
   - Create escalation handoff for human review
   - Do NOT continue with partial phase output

## Progress Tracking

Coordinator maintains task board at `.agents/task-board.md`:

```
| Task-ID | Phase | Specialist | Status | Started | Duration | Handoff |
| s-abc01 | P0 | office-hours | running | 10:00 | 3m | — |
| r-def456 | P1A | CEO review | running | 10:10 | 5m | — |
| r-ghi789 | P1A | Eng review | completed | 10:10 | 12m | handoff_v0_eng.md |
```

Updated at every worker state change. Append-only — never edit existing rows, add new rows for state changes.

## Gotchas

- **Fork context sharing has a race condition.** If parent modifies context after fork, fork children don't see it. All shared context must be frozen before fork dispatch.
- **Swarm peers have no coordination protocol beyond shared file.** Design the shared file carefully — it's the ONLY communication channel.
- **Continuation vs spawn is the most common coordinator failure.** Continuing with stale context is worse than the cost of re-loading from scratch when next task requires different perspective.
- **Timeout is soft guidance, not hard kill.** Workers may exceed timeout for legitimate reasons (complex investigation). Monitor, don't auto-kill.