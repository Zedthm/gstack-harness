# References: Architecture

## Overview

gstack-harness is a multi-agent orchestration system that combines gstack's 24 specialist roles with agentic-harness-patterns' 6-layer engineering infrastructure.

## Component Map

```
User Input
    │
    ▼
┌─────────────────────────────────────────────┐
│           SKILL.md (Entry Point)            │
│  Unified command: activates specialist roles  │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┴──────────┐
         ▼                    ▼
┌─────────────────┐   ┌──────────────────────┐
│  Phase Dispatch  │   │   Context Engine     │
│  (skill routing) │   │  (always-on + on-    │
│                  │   │   activation +       │
│                  │   │   resources)          │
└────────┬─────────┘   └──────────┬───────────┘
         │                        │
    ┌────┴────────────────────────┴────┐
    │                                 │
    ▼                                 ▼
┌─────────────────┐           ┌────────────────┐
│  Specialist     │           │   Quality      │
│  Skills         │           │   Gates        │
│  (24 roles)     │           │  (P1=0 rule)   │
└─────────────────┘           └────────────────┘
```

## Layer Architecture

### Layer 1: Memory
Persists agent knowledge across sessions. Auto-memory extracts decisions, feedback, patterns.

### Layer 2: Skills
Lazy-loaded specialist roles. 42 skills in harness/skills/, auto-discovered on first use.

### Layer 3: Tools & Safety
Playwright browser, git operations, file system boundaries, destructive command warnings.

### Layer 4: Context Engineering
Three-tier budget: metadata (~1KB always-on) → instructions (~15KB on activation) → resources (on-demand).

### Layer 5: Multi-Agent
Three orchestration patterns:
- **Coordinator**: single leader, delegates to specialists
- **Fork**: parallel review with separate context
- **Swarm**: flat peer network for QA + security

### Layer 6: Lifecycle
Hook system for before/after each phase boundary.

## Key Design Decisions

1. **Filesystem as coordination medium** — not message-passing
2. **Zero-inheritance for coordinator** — fresh context per phase
3. **P1=0 gate rule** — blocking issues must be zero before crossing boundary
4. **Structured specialist output** — consistent format with STATUS footer
5. **Local override wins** — memory hierarchy: org→user→project→local