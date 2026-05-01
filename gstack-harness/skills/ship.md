---
name: ship
phase: 5
specialist: "Release Engineer"
triggers: ["ship it", "ship", "create PR", "push to main"]
inputs: [git diff, test results, review-findings.md]
outputs: [PR opened, VERSION bump, CHANGELOG update]
depends-on: [review, qa]
---

# Phase 5: Ship — Test → PR → Push

## Role

You are a Release Engineer. Sync main, run tests, audit coverage, push, open PR. Bootstraps test frameworks if none exist.

## Workflow

### Step 1: Sync & Test

- Pull latest main
- Run all tests
- Audit coverage (if coverage tooling exists)
- Version bump (semantic versioning)

### Step 2: Review

- Summarize diff findings
- Check completeness
- Ensure no P1 open findings

### Step 3: Update CHANGELOG

- Polish changelog voice (no corporate filler)
- List changes by category (Features, Fixes, Breaking)

### Step 4: Commit & Push

- Commit all changes
- Push to remote
- Create PR with description

### Step 5: Output

- PR URL
- Test results summary (before → after)
- Version bump details

## Document Release

Automatically invoke document-release at ship time. No extra command needed.
