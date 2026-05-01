# Coordinator — Multi-Agent Orchestration

## Golden Rules

1. **Synthesize, don't delegate understanding.** After research workers report back, read their full results. Extract facts. Compose self-contained specification for implementation workers. "Based on your findings" delegates to blank context — it has no findings.
2. **Choose delegation patterns deliberately.** Coordinator, Fork, Swarm — each solves different problems. Don't mix conflicting assumptions.
3. **Depth must be bounded by design.** Fork children cannot fork. Swarm peers cannot spawn peers. Coordinator workers spawn at most one sub-level.
4. **Workers get only the tools they need.** Filter each worker's tools to minimum required surface.
5. **Verification starts fresh.** Never continue verification from implementer's context.

## Three Delegation Patterns

| Pattern | Context | Depth | Best For |
|---------|---------|-------|----------|
| **Coordinator** | Zero-inheritance | Bounded | Multi-phase: research → synthesize → implement → verify |
| **Fork** | Full inheritance | Single-level only | Quick parallel splits sharing loaded context |
| **Swarm** | Shared task list | Flat roster | Long-running independent workstreams |

## GSTACK-HARNESS Sprint Pipeline

The coordinator dispatches gstack specialists in pipeline order. Each phase is a worker or set of parallel workers.

### Phase 0: Intent → Design Doc
- **Worker:** office-hours specialist
- **Pattern:** Coordinator (one worker, sequential)
- **Output:** design-doc.md with problem statement, user specificity, wedge definition
- **Exit Gate:** Design doc has specificity test — names actual user, actual pain, actual workaround cost

### Phase 1: Strategy + Architecture + Design
- **Workers:** plan-ceo-review, plan-eng-review, plan-design-review (parallel fork)
- **Pattern:** Fork (all three inherit Phase 0 output, diverge on analysis dimension)
- **Outputs:**
  - ceo-review.md (strategy, scope, 10-star product)
  - eng-review.md (architecture, data flow, test matrix, edge cases)
  - design-review.md (dimension scores, improvement targets)
- **Synthesis (coordinator only):** Merge three reviews into sprint-spec.md — a single actionable document containing:
  - What to build (CEO scope → concrete features)
  - How to build it (Eng architecture → concrete interfaces)
  - What it looks like (Design scores → concrete UI specs)

### Phase 2: Implementation
- **Workers:** Design HTML → Review → Fix (sequential coordinator phases)
- **Pattern:** Coordinator (each waits for previous)
- **Inputs:** sprint-spec.md (not raw phase 1 output)
- **Exit Gate:** All design specs implemented, review findings auto-fixed or flagged

### Phase 3: Testing + QA
- **Workers:** qa specialist + csO security audit (parallel)
- **Pattern:** Swarm (flat peers coordinating through qa-report.jsonl)
- **Output:** qa-report.md + security-audit.md
- **Exit Gate:** Health score ≥ 8/10, zero P1 security findings

### Phase 4: Ship
- **Workers:** ship → land-and-deploy
- **Pattern:** Coordinator
- **Output:** PR URL, deploy status, canary report
- **Exit Gate:** PR merged, production verified healthy

### Phase 5: Reflect
- **Workers:** retro + document-release
- **Pattern:** Fork (parallel reads of git log + sprint artifacts)

## Handoff File Format

Every coordinator handoff follows the exact format defined in handoff-protocol.md. The handoff must contain:

1. **Header:** version, task-id, timestamp, phase-name
2. **Context Map:** which files/artifacts the next worker needs to read (with file paths)
3. **Task Board:** what the next worker should do (concrete actions)
4. **Progress Log:** what has been done so far (so the worker doesn't repeat)
5. **Quality Gate:** what "done" looks like for the next worker

**Gotchas:**
- Handoff must be self-contained — the next worker may have zero context
- Include file paths, not abstract descriptions
- Include success criteria, not "do your best"
- Max handoff: 2KB — trim context map to what's actually needed
- Never include full code in handoff — include file paths + change descriptions

## Continue vs Spawn Decision

| Scenario | Action |
|----------|--------|
| Worker's loaded context overlaps next task | Continue worker |
| Next task requires different perspective (e.g., verification) | Spawn fresh |
| Worker has accumulated too much context | Spawn fresh with synthesized spec |
| Worker is mid-turn on unrelated work | Spawn fresh |

## Anti-Patterns (BLOCKING)

- **Lazy delegation:** "Based on your findings, fix it" → coordinator loses 40%+ quality
- **Recursive fork:** Designing prompts that instruct fork children to fork again → wastes turns
- **Verification from implementation context:** Verifier inherits implementer's assumptions → misses bugs
- **Unbounded depth:** Coordinator → worker → sub-worker → sub-sub-worker → impossible to track or cancel
- **Tool overflow:** Giving workers tools they don't need → unintended actions
