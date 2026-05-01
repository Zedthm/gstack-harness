# Skill Runtime — Lazy-Loaded Specialist Skills

## Golden Rules

1. **Skills are lazy-loaded instruction sets.** Metadata only (~1% budget) always-on; full body loads only on activation.
2. **Discovery is budget-constrained.** Each skill entry (name + description + when-to-use) capped at fixed chars. Total listing capped at ~1% of context window.
3. **Front-load trigger language.** Tails get truncated — put the most distinctive trigger words first.
4. **Execution can be inline or isolated.** Inline shares parent context; isolated forks with its own budget. Isolation prevents heavy skill from exhausting parent.
5. **Deduplicate by canonical path.** Same skill from overlapping sources appears once.

## GSTACK-HARNESS Skill Architecture

### Skill Discovery (always-on, cheap)

The harness loads a compact listing of all 25+ gstack specialists at startup:

```
Specialist Catalog (loaded ~1KB per skill metadata → capped total ~15KB):
──────────────────────────────────────────────────────────────────
1. office-hours:    YC diagnostic 6 questions → design doc         | startup/intrapreneurship/hackathon
2. plan-ceo-review:  CEO/Founder review → 10-star product          | strategy/scope/think bigger
3. plan-eng-review: Architecture lock → data flow/test matrix      | architecture/edge cases
4. review:          Pre-landing PR review → bugs + side effects    | code review/pre-landing
5. qa:              Browser test → find bugs → fix → verify        | testing/site behavior
... [remaining 20 specialists]
```

Each entry structured: `{index}. {name}: {description} | {triggers}`
- Each entry hard-capped at 248 characters
- Total catalog hard-capped at 15,360 characters (~1% of 128K context)
- No skill description starts with filler — first word is trigger

### Skill Loading (lazy, on-activation)

When user intent matches a skill:
1. Coordinator reads full skill file from `skills/{skill-name}.md`
2. Skill body replaces discovery entry (full instructions loaded)
3. Skill executes per its workflow definition
4. Skill writes output to standard path + creates next handoff

### Skill Sources (ordered by priority)

| Source | Location | Priority |
|--------|----------|----------|
| Project skills | `PROJECT_ROOT/.agents/skills/` | 1 (wins) |
| User skills | `~/.mySkills/skills/` | 2 |
| Bundled skills | This `gstack-harness/skills/` directory | 3 |

Deduplicate by canonical path — same skill from project + bundled appears once (project wins).

### Skill File Format

Each skill at `skills/{name}.md` follows:

```markdown
---
name: skill-name
phase: {0|1|2|3|4|5|6|7}
specialist: {role name}
triggers: [trigger1, trigger2]
inputs: [files it reads]
outputs: [files it writes]
depends-on: [previous phases it needs]
---

# {Specialist Title}

## Phase 0: Preamble
{Quick context gathering — git log, file tree, recent artifacts}

## Phase N: Workflow
{Step-by-step instructions for this specialist}

## Output Format
{What the specialist writes and where}

## Quality Gate
{What "done" looks like — observable conditions}
```

### Inline vs Isolated Execution

| Mode | Context | Cost | Best For |
|------|---------|------|----------|
| Inline | Shares parent context | Low token cost, high context collision | Small specialists (context-save, learn) |
| Isolated (fork) | Fresh context with handoff spec | Higher cost, clean assumptions | Large specialists (review, qa, design) |

Decision rule: If specialist output < 3KB → inline. If > 3KB or needs independent perspective → isolated.

### Graceful Degradation

If skill catalog exceeds budget:
1. Truncate per entry to 60 chars (from 248)
2. Keep only index + name + 1-line description
3. Drop when-to-use hints
4. If still over budget, keep only top 15 specialists by phase relevance to current task

### Gotchas

- **Tail truncation is the default state.** Every entry longer than 200 chars will be cut. Put trigger words in first 60 chars.
- **Fork execution loses parent context.** An isolated skill cannot see what the coordinator discussed before dispatch. All necessary context must be in the handoff.
- **Inline execution shares context budget.** Too many inline skills → parent window exhausted. Monitor total always-on context.
