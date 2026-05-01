# References: Sprint Pipeline

## Full Sprint Flow

```
Phase 0: Intent Gate
  → Classify request type (trivial/explicit/exploratory/open-ended/ambiguous)
  → Check for ambiguity
  → Route to appropriate handler

Phase 1: Think
  → /office-hours (product interrogation, 6 forcing questions)
  → Design doc output

Phase 2: Plan
  → /plan-ceo-review (scope, 10-star product)
  → /plan-eng-review (architecture, data flow, edge cases)
  → /plan-design-review (design dimensions 0-10)
  → /plan-devex-review (developer experience)
  → /autoplan (auto-run all reviews)

Phase 3: Build
  → /design-consultation or /design-shotgun → /design-html
  → Implementation by executor agents

Phase 4-6: Review + Test
  → /review (code review, auto-fix)
  → /qa (browser testing + bug fix loop)
  → /health (code quality dashboard)

Phase 7+: Ship
  → /ship (sync, test, audit, push, PR)
  → /land-and-deploy (merge, CI, deploy, verify)
  → /canary (post-deploy monitoring)
  → /benchmark (performance regression)
  → /document-release (update all docs)
  → /retro (weekly retrospective)
```

## Review Routing

| Building for... | Plan stage | Live audit |
|-----------------|------------|------------|
| End users (UI, web app) | /plan-design-review | /design-review |
| Developers (API, CLI, SDK) | /plan-devex-review | /devex-review |
| Architecture | /plan-eng-review | /review |
| All of above | /autoplan | — |

## Quality Gates

- **P1=0 rule**: blocking issues must be zero before crossing phase boundary
- **P2 gate**: <5 issues allowed, must have fix plan
- **P3 gate**: recommendations only, no blocking

## Specialist Activation Triggers

- "brainstorm this" → /office-hours
- "think bigger" → /plan-ceo-review
- "review architecture" → /plan-eng-review
- "audit the design" → /design-review
- "test site" → /qa
- "bugs/error" → /investigate
- "ship it" → /ship
- "save progress" → /context-save
- "resume" → /context-restore