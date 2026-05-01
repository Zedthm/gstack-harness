# GSTACK-HARNESS — The One Command

## What This Is

A complete multi-agent harness that fuses gstack's 25+ specialist roles with harness engineering patterns (memory, skills, safety, context engineering, multi-agent coordination, lifecycle). 

**You describe what you want. The harness routes to the right specialists. You make 1-2 key decisions. You 验收 the result.**

## When To Use

| You say... | This activates |
|---|---|
| "I want to build X" | Full sprint: Think → Plan → Build → Review → Test → Ship → Reflect |
| "Add feature X" | Phases 1-5 (skip Phase 0 if context already clear) |
| "Fix this bug" | Phase 3: Investigate → QA → Ship |
| "Review this PR" | Phase 3: Review + Codex + QA |
| "Test this app at URL" | Phase 4: QA + Security |
| "Ship this feature" | Phase 5: Ship → Deploy → Document |
| "How are we doing?" | Phase 7: Retro + Benchmark |

## How It Works — The Coordination Protocol

### Step 0: Bootstrap

Run the bootstrap sequence (see `harness/core/bootstrap.md`):
1. Check if request is trivial (dispatch immediately if yes)
2. Parse config
3. Establish trust boundary
4. Initialize subsystems
5. Output ready state

### Step 1: Intent Routing

Read the user's request. Route to the sprint pipeline:

| User Intent | Sprint Phases | Coordinator Pattern |
|---|---|---|
| Build new thing | 0→1→2→3→4→5→7 | Coordinator (phased) |
| Add feature to existing | 1→2→3→4→5 | Coordinator (phased) |
| Fix bug | 3→4→5 | Coordinator (fast-track) |
| Review PR | 3→4 | Fork (review ∥ codex) |
| Test at URL | 4 | Swarm (qa ∥ security) |
| Ship | 5→7 | Coordinator (phased) |
| Retro | 7 | Fork (retro ∥ docs) |

### Step 2: Phase Dispatch

For each activated phase:
1. Read the worker brief from `harness/quality-gates/execution-strategy.md`
2. Launch specialist agent (fresh context per coordinator pattern)
3. Wait for handoff completion
4. Apply quality gate from `harness/quality-gates/review-checklist.md`
5. If gate passes → synthesize and dispatch next phase
6. If gate fails → return to specialist with specific fix requests (max 3 attempts)

### Step 3: Human Gate

At critical decision points, ask the user via AskUserQuestion:
- **D1:** Sprint scope confirmation (after Phase 1 synthesis)
- **D2:** Design direction (if multiple viable options)
- **D3:** Deploy approval (before production push)

All other decisions are auto-decided by the coordinator using the review-checklist criteria.

### Step 4: 验收

After the sprint completes:
```
SPRINT COMPLETE
════════════════════════════════════
Goal: {original user request}
Phases run: {Phase list}
Artifacts produced: {count}
Issues found & fixed: {count}
P1 issues remaining: {0 expected}
Duration: {total time}

STATUS: DONE / DONE_WITH_CONCERNS / BLOCKED
═══════════════════════════════════════════════
```

## Available Specialists

Full specialist roster with triggers, inputs, outputs in `harness/core/harness-skills.md`.

Quick reference:

| # | Specialist | Phase | Triggers |
|---|---|---|---|
| 1 | office-hours | 0 | "build X", "I want to", "idea for" |
| 2 | plan-ceo-review | 1 | "think bigger", "expand scope" |
| 3 | plan-eng-review | 1 | "architecture", "how to build" |
| 4 | plan-design-review | 1 | "this looks bad", "polish this" |
| 5 | design-consultation | 1 | "design system", "brand guidelines" |
| 6 | design-shotgun | 1 | "show me options", "design variants" |
| 7 | design-html | 2 | "build the page", "implement design" |
| 8 | review | 3 | "review this", "code review" |
| 9 | investigate | 3 | "fix this bug", "why is this broken" |
| 10 | qa | 4 | "test this site", "find bugs" |
| 11 | security | 4 | "security audit", "threat model" |
| 12 | ship | 5 | "ship it", "deploy", "create PR" |
| 13 | document-release | 6 | "update docs", "sync README" |
| 14 | retro | 7 | "weekly retro", "what did we ship" |
| 15 | canary | 7+ | "monitor deploy", "check production" |

## Memory & Learning

Read the full memory system at `harness/core/memory.md`. Summary:
- **Instruction memory:** Your enduring rules (org→user→project→local)
- **Auto-memory:** Agent-learned knowledge, capped index, type taxonomy
- **Session extraction:** Background agent writes learnings after each session
- **Cross-session recall:** `/context-restore` resumes from saved state

## Quality

Every specialist output passes through the quality gate before reaching you:
- P1 (blocking): factual accuracy, no hallucination, self-contained, security
- P2 (should fix): completeness, portability, tone, formatting
- P3 (cosmetic): spelling, spacing, consistency

Gate verdict: P1=0 → pass. P1>0 → return for fixes.

## Harness Patterns

This system is built on 6 harness engineering patterns:
1. **Memory** — layered persistence with auto-learning
2. **Skills** — lazy-loaded specialists with budget-constrained discovery
3. **Tools & Safety** — fail-closed, per-call concurrency, permission pipeline
4. **Context Engineering** — select/write/compress/isolate operations
5. **Multi-agent** — coordinator/fork/swarm patterns
6. **Lifecycle** — hooks, task state machines, trust-split init

Deep dives in each pattern: `harness/core/{name}.md`
