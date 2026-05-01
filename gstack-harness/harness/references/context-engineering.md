# Context Engineering — Deep Dive

## Select Pattern: JIT Context Loading

Promise memoization + three-tier progressive disclosure + manual cache invalidation.

**Key insight:** Context builders are expensive. Memoize them. But manually invalidate the cache at known mutation points — not reactively. If you add a context source without adding invalidation, the model sees stale data forever.

### Three Tiers

| Tier | Content | When Loaded | Cost |
|------|---------|-------------|------|
| 0 | Metadata | Always | ~1KB |
| 1 | Instructions | On skill activation | ~5-20KB |
| 2 | Resources | On demand (file read) | Variable |

## Compress Pattern: Reactive Compaction

When session window fills up:
1. Keep last 3 turns fully
2. Summarize earlier turns
3. Mark snapshot data as snapshots
4. Add recovery pointers: "for full context, read `{file}`"

### Recovery Pointer Format
`[compressed — full content available via ReadTool: {filepath}]`

## Isolate Pattern: Delegation Boundaries

Three isolation levels:

| Level | Inheritance | Use Case |
|-------|------------|----------|
| Zero-inheritance | Only explicit prompt | Reviewers, verifiers |
| Single-level fork | Full parent history + guard | Parallel research |
| Filesystem (worktree) | Separate working copy | Destructive experiments |

### Fork Cache Optimization

When forking, all sibling workers must have:
- Byte-identical shared prefix (system prompt, message history, tool definitions)
- Only the final directive block differs per child
- Removing the fork tool from child schemas would change tool set → breaks cache alignment
- Keep fork tool present but BLOCK at call time with clear error
