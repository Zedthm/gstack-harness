# Memory Persistence — Deep Dive

## Instruction Hierarchy

Four scopes of instruction memory:

1. **Organization/Team** — Shared conventions for all team members
2. **User** — Personal workflow preferences spanning all projects
3. **Project** — Project-specific conventions (committed to repo)
4. **Local** — Private overrides (never committed — `.gitignore`'d)

Files concatenated in ascending priority: org → user → project → local. Local appears last in prompt, gets most model attention.

### Include Directive

Instruction files support: `@include instructions/rules/ai-safety.md`

This allows large configurations to be composed from smaller fragments without duplicating content.

## Auto-Memory Taxonomy

| Type | Contains | Example |
|------|---------|---------|
| user | Who user is, working patterns | "prefers tab indents over spaces" |
| feedback | Behavioral corrections | "use bun, not npm" |
| project | Context not derivable from code | "API key format changed in v2" |
| reference | Stable reference facts | "deploy URL: api.example.com" |

**Excluded:** Anything derivable from the codebase or version history (architecture, code patterns, git log). These waste index space and go stale.

## Team Memory

Shared extension of auto-memory within the same project slug. Same four-type taxonomy, same index structure. Requires auto-memory enabled — disabling auto-memory also disables team memory.

## Cross-Layer Review

Audits across all layers and proposes promotions:
- Auto → Project conventions (team-visible, committed)
- Auto → Personal instructions (user-only, persistent)
- Auto → Team memory (shared across team)
- Clean up (stale, derivable, miscategorized)
- Ambiguous (needs user judgment)

Proposal format: structured report with action groupings. Never auto-apply.
