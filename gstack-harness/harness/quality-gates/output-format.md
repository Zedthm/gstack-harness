# Output Format — Structured Output Specification

## Purpose

Every specialist output follows a structured format so that: (1) the coordinator can parse and synthesize it, (2) the next worker can consume it without re-interpretation, (3) the human can 验收 at a glance.

## All Outputs Share This Structure

```markdown
---
phase: {0|1|2|3|4|5|6|7}
specialist: {skill-name}
task-id: {typed-prefixed-id}
timestamp: {ISO-8601}
status: {completed|in-progress|failed}
duration: {minutes}
---

# {Specialist Title}: {One-line summary}

## Summary
{1-3 sentences — what was done, key findings, outcome}

## Details
{Structured content — varies by specialist type}

## Findings
{Numbered list — each finding has severity tag: P1|P2|P3}

## Decisions Made
{List of decisions + rationale — each decision has a reason}

## Remaining / Next Steps
{Numbered list — concrete actions for the next worker}

## Files Written
- path/to/output-1.md: {1-line description}
- path/to/output-2.json: {1-line description}
```

## Specialist-Specific Sections

### CEO Review
```
## Findings
1. [P1] {issue description}
2. [P2] {issue description}

## 10-Star Product Vision
{Expanded product scope beyond original request}

## Scope Analysis
- HOLD SCOPE / EXPANSION / REDUCTION → {recommendation + reason}
```

### Eng Review
```
## Architecture Summary
{ASCII diagram or bullet-point data flow}

## Test Matrix
| Component | Tests Needed | Edge Cases | Status |
|---|---|---|---|

## Security Concerns
{List of potential vulnerabilities}
```

### Design Review
```
## Dimension Scores
| Dimension | Score | Target | Gap |
|-----------|-------|--------|-----|

## What Makes Each Dimension a 10
{Specific improvement targets per dimension}
```

### Review (PR)
```
## AUTO-FIXED: N issues
| File | Issue | Fix | Status |
|---|---|---|---|

## ASK: N issues requiring human decision
| File | Issue | Recommendation | Options |
|---|---|---|---|
```

### QA
```
## Health Score: N/10
{before: N → after: N}

## Issues Found & Fixed
| Issue | Severity | Fix | Regression Test |
|---|---|---|---|
```

### Security Audit
```
## Confidence Score: N/10
{false positive exclusions applied}

## Findings by OWASP Category
| Category | Finding | Exploit Scenario | Severity |
|---|---|---|---|
```

## Completion Status Footer

Every specialist output ends with:

```
---
STATUS: {DONE|DONE_WITH_CONCERNS|BLOCKED|NEEDS_CONTEXT}
REASON: {one sentence}
ATTEMPTED: {what was tried, if failed}
RECOMMENDATION: {what to do next}
---
```

## Anti-Patterns

- **Unstructured prose:** Output that can't be parsed by the next worker → waste of coordinator synthesis step.
- **Missing severity tags:** Findings without P1/P2/P3 tags → can't gate-cross.
- **No files_written list:** Next worker doesn't know where to look → re-discovers.
- **Verbatim code dumps in finding:** Findings should reference file:line, not paste full code.
- **Multiple statuses in same output:** Each output has exactly one STATUS. If mixed → use highest severity.
