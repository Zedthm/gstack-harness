# Task Decomposition — Long-Running Work Management

## Golden Rules

1. **Every work unit gets a typed identity.** Typed prefixed IDs: routing, kill dispatch, log filtering all unambiguous.
2. **Strict state machine with permanent terminal states.** running → completed / failed / killed. Terminal = permanent.
3. **Output goes to disk; memory holds only offset.** Constant memory regardless of concurrent agent count.
4. **Eviction is two-phase, gated by notification.** Terminal → disk cleanup (eager) → memory cleanup (after parent notified).

## GSTACK-HARNESS Task Registry

### Typed ID Prefixes

| Prefix | Type | Example |
|--------|------|---------|
| `s-` | Sprint task | `s-abc123` |
| `r-` | Research/review | `r-def456` |
| `i-` | Implementation | `i-ghi789` |
| `q-` | QA/testing | `q-jkl012` |
| `v-` | Verification | `v-mno345` |
| `d-` | Deploy | `d-pqr678` |
| `m-` | Memory extraction | `m-stu901` |

ID format: `{prefix}-{6-char-random}`. Random uses case-insensitive-safe alphabet (~2.8 trillion combinations).

### State Machine

```
             ┌──────────┐
             │ running  │
             └────┬─────┘
                  ├──── completed (terminal)
                  ├──── failed    (terminal)
                  └──── killed    (terminal)
```

No "pending" state — work registers directly as "running".

Canonical terminal check: `status in ('completed', 'failed', 'killed')`

Use this check everywhere. Never inline comparisons.

### Disk-Backed Output

Each task writes to: `PROJECT_ROOT/.agents/tasks/{task-id}.md`

The in-memory state holds only:
- `task-id`
- `status`
- `output_path` (file path)
- `read_offset` (polling delta)

### Two-Phase Eviction

When task reaches terminal state:
1. **Phase 1 (eager):** Mark output file for deletion. Clean up disk within 30s.
2. **Phase 2 (lazy):** Remove in-memory record ONLY after coordinator has been notified.

Notification-gated GC: eviction no-ops if notified flag is false.

### Task Lifecycle in GSTACK-HARNESS Sprint

Sprint tasks are registered at coordinator dispatch:

```
Coordinator dispatches Phase 1 fork:
  → Register: r-ceo-abc123 (CEO review) → running
  → Register: r-eng-def456 (Eng review) → running
  → Register: r-dex-ghi789 (Design review) → running
  
Each writes to: .agents/tasks/{task-id}.md
Coordinator polls delta since last offset
When worker reports → transition to completed
Coordinator notified → two-phase eviction begins
```

### Cleanup Registration

At process init, register cleanup handler:
- Kill all running tasks
- Flush completed task outputs to disk
- Remove temp files
- Drain in-flight extractions

### Gotchas

- **Do not evict before parent notified.** Early eviction = parent never sees result.
- **Retained tasks never auto-evicted.** If task is being viewed, eviction deadline set to infinity. Must clear retain flag.
- **Kill is no-op on non-running.** Guard only acts on "running".
- **Double-kill is safe.** Idempotent guard.
- **Update function must not mutate in-place.** Return new object or original reference. In-place mutations invisible to subscriber pattern.
- **Stale state across async boundary.** Don't store full snapshot before async disk read — concurrent terminal transition during read will be clobbered.