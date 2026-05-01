# Context Engineering — Select / Write / Compress / Isolate

## Golden Rules

1. **Treat context as a budget, not a dump.** Every token must earn its place via: select, write, compress, or isolate.
2. **Load just-in-time, not all-at-once.** Three tiers: metadata (always), instructions (activated), resources (on-demand).
3. **Memoize expensive builders, invalidate at known mutation points.** Not reactively. Add context source without invalidation point → stale data forever.
4. **Compress with recovery pointers.** Truncation tells model: "call this tool for full output."
5. **Zero-inheritance default for delegation.** Coordinator workers start with only explicit prompt — no parent context leaks.
6. **Fork is single-level only.** Recursive forks multiply context cost exponentially.

## GSTACK-HARNESS Context Budget

Always-on budget: ~15KB total
- Harness bootstrap: ~2KB
- Memory index: up to 25KB (truncated to fit)
- Skill catalog: up to 15KB (truncated to fit)
- Config: ~1KB
- AGENTS.md: ~5KB

### Select (Just-in-Time Loading)

Context loads in three tiers:

**Tier 0 — Metadata (always present)**
- Skill catalog (~1% budget) — names + triggers only
- Memory index — one line per entry
- Config — key settings

**Tier 1 — Instructions (loaded on activation)**
- Full skill body — when specialist activates
- Relevant memory topics — recalled by type
- AGENTS.md — project-wide rules

**Tier 2 — Resources (loaded on demand)**
- File contents — when specialist needs to read specific files
- Previous handoffs — when resuming work
- Deep-dive references — only when harness patterns needed

### Write (Learning Loop)

Context is not read-only. The agent writes back to persistent storage:
- Auto-memory entries (during session or at extraction)
- Task state (typed, prefixed IDs, disk-backed)
- Permission rules (when user changes rules)
- Progress log (append-only, every phase boundary)

### Compress (Reactive Compaction)

When session exceeds context budget:
1. Mark recent turns (last 3) as "keep" — always present
2. Summarize older turns (earlier turns) with recovery pointers
3. Label snapshot data as snapshots — model knows to re-fetch
4. Write compressed turn to history
5. Recovery pointer format: "For full context, refer to `handoff_v{phase}.md`"

### Isolate (Delegation Boundaries)

Three isolation levels in GSTACK-HARNESS:

| Level | What Inherited | When Used |
|-------|---------------|-----------|
| Zero-inheritance | Only handoff spec | Coordinator workers (review, investigation, qa) |
| Single-level fork | Full parent history, single depth | Fork phases (CEO + Eng + Design in parallel) |
| Filesystem isolation | Worktree copy | When worker modifies files that shouldn't affect main branch |

Isolation is critical for the review-then-execute pattern:
- Reviewers MUST start zero-inheritance → fresh perspective → catches what executor misses
- Executors MUST NOT inherit reviewer's criticism → executor might "defend" rather than fix
- Synthesis happens in coordinator, not in workers

### Context Cache Management

Expensive context builders are memoized. Invalidation points:

| Context Builder | Mutation Point (triggers invalidation) |
|----------------|----------------------------------------|
| File tree list | File create/delete/renamed detected |
| Git log | New commit detected |
| Memory index | Memory write detected |
| Skill catalog | New skill installed or skill file changed |
| AGENTS.md | AGENTS.md file modified |

If you add a new context builder, you MUST add a corresponding invalidation point, or the model sees stale data for the entire session.

### Truncation Recovery

When any context block exceeds its budget:
1. Truncate to budget limit
2. Append recovery pointer: `"[truncated — full output in {file}]"`
3. Model instructed to call specific tool when full context needed

### Gotchas

- **Progressive disclosure means late reasoning.** Model can't reason about a skill's full capabilities until it's activated. This is a design trade — saves tokens but means the model won't proactively consider the skill.
- **Manual invalidation is error-prone.** Adding a context source without adding invalidation → stale data for entire session. This is the most common context engineering bug.
- **Fork cache alignment is fragile.** When forking, all siblings must have byte-identical shared prefix. Any customization in shared region destroys cache benefit.
