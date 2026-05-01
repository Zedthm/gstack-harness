# GSTACK-HARNESS: Multi-Agent Engineering Harness

**A complete fusion of gstack specialists + Agentic Harness Patterns.**

## What This Is

A production-grade multi-agent harness that fuses 25+ gstack specialists with 6 harness pattern layers (Memory, Skills, Tools & Safety, Context Engineering, Multi-agent Coordination, Lifecycle). The result: you describe what you want, the harness routes work to the right specialists, you make 1-2 critical decisions, and you验收 the result.

## Architecture Overview

```
User Request
    │
    ▼
┌─────────────────────────────────────────┐
│  🎯 COORDINATOR (harness/coordinator.md) │
│  - Synthesizes user intent               │
│  - Picks delegation pattern              │
│  - Dispatches Phase 1 workers            │
│  - Synthesizes → writes spec             │
│  - Dispatches Phase 2 workers            │
│  - Dispatches Phase 3 verification       │
└────┬──────────────────────────────┬──────┘
     │                              │
     ▼                              ▼
┌────────────┐              ┌──────────────┐
│ REVIEWERS  │              │ EXECUTORS    │
│ (fresh ctx)│              │ (spec-based) │
│ - Codex for│              │ - Claude for │
│   facts,   │              │   building,  │
│   safety,  │              │   editing,   │
│   UX audit │              │   shipping   │
└────┬───────┘              └──────┬───────┘
     │                             │
     ▼                             ▼
┌─────────────────────────────────────────────┐
│  📁 FILESYSTEM COORDINATION (harness/core/)  │
│  context-map.md  │ task-board.md            │
│  progress-log.md │ handoff_v*.md            │
│  codex_review_*.md                          │
└─────────────────────────────────────────────┘
```

## The Six Harness Layers

| # | Layer | Source | What It Does |
|---|-------|--------|-------------|
| 1 | **Memory** | harness/core/memory.md | Instruction memory (org→user→project→local), auto-memory (type taxonomy), session extraction, propose-not-auto |
| 2 | **Skills** | harness/core/harness-skills.md | Lazy-loaded specialist skills, metadata discovery (~1% budget), activation on intent match |
| 3 | **Tools & Safety** | harness/core/permission-gate.md | Fail-closed default, per-call concurrency, multi-source permission pipeline |
| 4 | **Context Engineering** | harness/core/context-engineering.md | Select (JIT), Write (learning), Compress (reactive), Isolate (delegation) |
| 5 | **Multi-agent** | harness/core/coordinator.md | Coordinator (zero-inheritance), Fork (single-level), Swarm (flat roster) |
| 6 | **Lifecycle** | harness/core/bootstrap.md | Hooks at lifecycle moments, typed task state machines, trust-split init |

## The 25+ Gstack Specialists

Each specialist is a gstack skill adapted to the harness coordination protocol:

| Specialist | Harness Role | Trigger |
|------------|-------------|---------|
| **Office Hours** | Phase 0: Intent → Design Doc | "I want to build..." |
| **CEO Review** | Phase 1: Strategy & Scope | plan-ceo-review |
| **Eng Manager** | Phase 1: Architecture & Tests | plan-eng-review |
| **Design Review** | Phase 1: UX Audit | plan-design-review |
| **Design Consultant** | Phase 1: Design System | design-consultation |
| **Design Shotgun** | Phase 1: Variant Exploration | design-shotgun |
| **Design HTML** | Phase 2: Frontend Implementation | design-html |
| **Review** | Phase 3: Pre-landing PR Review | /review |
| **Investigate** | Phase 3: Root-cause Debug | /investigate |
| **QA Lead** | Phase 4: Browser Testing + Fix | /qa |
| **Security Officer** | Phase 4: OWASP + STRIDE | /cso |
| **Ship** | Phase 5: Test → PR → Push | /ship |
| **Land & Deploy** | Phase 5: CI → Deploy → Verify | /land-and-deploy |
| **Document Release** | Phase 6: Doc Sync | /document-release |
| **Retro** | Phase 7: Weekly Retrospective | /retro |
| **Canary** | Phase 7+: Post-deploy Monitor | /canary |
| **Benchmark** | Phase 7+: Perf Baseline | /benchmark |
| **Context Save** | Cross-phase: State Capture | /context-save |
| **Context Restore** | Cross-phase: State Resume | /context-restore |
| **Codex** | Cross-phase: 2nd Opinion | /codex |
| **Autoplan** | Cross-phase: Auto Review Pipeline | /autoplan |
| **Learn** | Cross-phase: Knowledge Base | /learn |
| **Browse** | Cross-phase: Real Browser Access | /browse |

## User Experience

**You do:**
1. Describe your goal (one sentence or a paragraph)
2. Answer 1-2 AskUserQuestion decision briefs at critical gates
3. 验收 the result — approve, request changes, or accept

**The harness does:**
- Routing: picks the right specialists from gstack
- Context budgets: ensures each agent gets exactly what it needs
- Handoffs: writes clean handoff files between sessions/agents
- Quality gates: enforces review-checklist before any output reaches you
- Memory: accumulates learnings across sessions
- Safety: fail-closed, per-call concurrency, trust boundaries

## Sprint Pipeline

```
Think → Plan → Build → Review → Test → Ship → Reflect → Monitor
 │        │        │       │        │      │       │         │
 office   plan-ceo design  review   qa     ship    retro     canary
 hours    plan-eng html    codex    canary  docs   benchmark
          autoplan  qa-only        security
```

Each phase feeds the next via filesystem handoffs. Nothing falls through.

## Quick Start

1. Read this file
2. Run the coordinator skill: `@harness/coordinator`
3. Describe your goal
4. Answer the AskUserQuestion gates
5. 验收

## Project Structure

```
gstack-harness/
├── SKILL.md                          # Unified entry point
├── AGENTS.md                         # Project-wide agent rules
├── harness/
│   ├── core/
│   │   ├── bootstrap.md              # Init sequence with trust boundary
│   │   ├── coordinator.md            # Multi-agent orchestration (3 patterns)
│   │   ├── handoff-protocol.md       # Agent-to-agent handoff format
│   │   ├── harness-skills.md         # Skill runtime + lazy loading
│   │   ├── memory.md                 # Memory persistence + extraction
│   │   ├── context-engineering.md    # Select/Write/Compress/Isolate
│   │   ├── permission-gate.md        # Tool safety + fail-closed
│   │   └── task-decomposition.md     # Typed IDs + state machines + eviction
│   ├── quality-gates/
│   │   ├── review-checklist.md       # Blocking vs quality checks
│   │   ├── execution-strategy.md     # Parallel dispatch + brief templates
│   │   └── output-format.md          # Structured output specification
│   └── references/
│       ├── agent-orchestration.md    # Deep-dive on 3 patterns
│       ├── bootstrap-sequence.md     # Deep-dive on init ordering
│       ├── context-engineering.md    # Deep-dive on 4 operations
│       ├── hook-lifecycle.md         # Deep-dive on hook types
│       ├── memory-persistence.md     # Deep-dive on memory layers
│       ├── permission-gate.md        # Deep-dive on permission pipeline
│       ├── select-pattern.md         # Deep-dive on JIT loading
│       ├── compress-pattern.md       # Deep-dive on reactive compaction
│       └── isolate-pattern.md        # Deep-dive on delegation isolation
├── skills/
│   ├── office-hours.md               # Phase 0
│   ├── plan-ceo-review.md            # Phase 1A
│   ├── plan-eng-review.md            # Phase 1B
│   ├── plan-design-review.md         # Phase 1C
│   ├── design-consultation.md        # Phase 1C
│   ├── design-shotgun.md             # Phase 1C
│   ├── design-html.md                # Phase 2
│   ├── review.md                     # Phase 3
│   ├── investigate.md                # Phase 3
│   ├── qa.md                         # Phase 4
│   ├── qa-only.md                    # Phase 4
│   ├── codex.md                      # Phase 3
│   ├── security.md                   # Phase 4
│   ├── ship.md                       # Phase 5
│   ├── land-and-deploy.md            # Phase 5
│   ├── document-release.md           # Phase 6
│   ├── retro.md                      # Phase 7
│   ├── canary.md                     # Phase 7+
│   ├── benchmark.md                  # Phase 7+
│   ├── context-save.md               # Cross-phase
│   ├── context-restore.md            # Cross-phase
│   ├── learn.md                      # Cross-phase
│   ├── browse.md                     # Cross-phase
│   └── autoplan.md                   # Cross-phase
├── roles/
│   ├── reviewer-brief.md             # Codex-based reviewer role
│   ├── executor-brief.md             # Claude-based executor role
│   ├── coordinator-brief.md          # Orchestrator role
│   └── qa-brief.md                   # QA specialist role
├── memory/
│   ├── MEMORY.md                     # Auto-memory index (capped)
│   └── topics/                       # Topic files (on-demand detail)
└── docs/
    └── distillation-practice.md       # How this was built
```

## License

MIT — Free forever, open source, fork freely.
