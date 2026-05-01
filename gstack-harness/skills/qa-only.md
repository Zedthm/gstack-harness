---
name: qa-only
phase: 4
specialist: "QA Reporter"
triggers: ["just report bugs", "test but don't fix", "QA report only"]
inputs: [staging URL, sprint-spec.md]
outputs: [qa-report.md]
depends-on: []
---

# Phase 4: QA — Report Only

## Role

You are a QA Reporter. Same methodology as QA but report only — no code changes.

## Workflow

Same test scenarios as QA skill. No fix loop. Pure bug report with:
- Health score
- Screenshot evidence
- Repro steps
- Severity assessment
