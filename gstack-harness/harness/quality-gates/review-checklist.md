# Review Checklist — Quality Gates

## Purpose

Define what "done" means before any phase boundary is crossed. Every specialist output must pass quality gates before it reaches the coordinator (and before the human sees the result).

## Blocking Issues (P1 — must fix before crossing boundary)

| Category | Check | What To Look For |
|----------|-------|------------------|
| **Factual accuracy** | All claims backed by source evidence | "auth.ts line 47 returns undefined" → verify in code |
| **No hallucinated API** | No invented functions, props, endpoints | Every referenced API actually exists |
| **Self-contained** | Handoff has all needed context | Zero-inheritance worker can execute from handoff alone |
| **Exit criteria met** | Phase success criteria observable and verified | Not "looks good" — specific, testable condition |
| **No regression** | Existing functionality not broken | Tests pass, no breaking changes outside scope |
| **Security** | No secrets, credentials, or paths leaked | No .env, *.pem, AWS keys, JWT secrets in output |
| **User impact clear** | User-visible consequences of changes stated | "This changes the login flow" — not "improved auth" |

## Quality Checks (P2 — should fix, but boundary can be crossed with flag)

| Category | Check | What To Look For |
|----------|-------|------------------|
| **Completeness** | All edge cases and error paths addressed | Not just happy path — what happens on failure? |
| **Cross-runtime portability** | Principles work across different setups | Not tied to a specific OS, version, or config |
| **Trigger phrase accuracy** | Skill triggers match actual user language | "fix the bug" not "investigate anomaly" |
| **Tone & voice** | Direct, concrete, no corporate filler | No "delve", "crucial", "robust", "comprehensive" |
| **Formatting** | Consistent markdown, no broken links | Headings, code blocks, links all valid |

## Cosmetic Checks (P3 — may fix, does not block)

- Spelling, minor grammar
- Consistent capitalization style
- Spacing between sections
- Example accuracy (not correctness, just style)

## Quality Gate Decision

For each specialist output, coordinator evaluates:

```
P1 issues: N
P2 issues: N
P3 issues: N

Gate verdict:
  - P1 = 0 → PASS (proceed to next phase)
  - P1 > 0 → BLOCK (return to specialist for fixes)
  - P1 = 0 but P2 >= 5 → FLAG (proceed with warning)
  - P1 = 0 and P2 <= 4 → PASS (note P2s for future improvement)
```

## User 验收 Gate

For critical decisions, the coordinator asks user via AskUserQuestion:

| Decision Point | What User Decides | Default Recommendation |
|----------------|-------------------|------------------------|
| Sprint scope | Proceed with planned scope or expand/reduce | Proceed (coordinator has synthesized) |
| Design direction | Pick from reviewed options | The option with highest score |
| PR content | Approve PR or request changes | Approve (review has auto-fixed) |
| Deploy | Deploy to production or hold | Hold (if canary shows issues) |

## Anti-Patterns

- **Gate shopping:** Trying different gate interpretations until one passes → coordinator must enforce consistently
- **P2 accumulation:** Many P2s that individually don't block but collectively indicate poor quality → escalate
- **Gate fatigue:** User approving without reading → always include one-sentence summary of what passed
- **Missing success criteria:** Can't verify if gate passed → fix the phase specification, don't skip
