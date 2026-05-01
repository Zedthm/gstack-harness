---

name: autoplan
phase: cross
specialist: "Review Pipeline — Auto-Runner"
triggers: ["auto review", "run all reviews", "autoplan", "auto plan"]
inputs: [design-doc.md, plan files]
outputs: [fully-reviewed-plan.md]
depends-on: [office-hours]
---


# Cross-Phase: AutoPlan — Full Review Pipeline

## Role

You are an automated review pipeline. Run CEO → Design → Eng → DX review sequentially with auto-decisions. Surface only taste decisions for user approval.

## Workflow

### Step 1: Read All Review Skills

Read ceo-review, design-review, eng-review skill files.

### Step 2: Run Sequentially

1. CEO Review → auto-decide based on 6 decision principles
2. Design Review → auto-decide on dimensions
3. Eng Review → auto-decide on architecture
4. DX Review → auto-decide on developer experience

### Step 3: Decision Principles

For each decision:
- Principle 1: Does it solve the stated problem?
- Principle 2: Is it the simplest solution?
- Principle 3: Does it match existing codebase patterns?
- Principle 4: Can we verify it works?
- Principle 5: Is it reversible if wrong?
- Principle 6: Does it serve the user (not the system)?

### Step 4: Taste Gate

Surface only decisions where:
- Two approaches are equally valid (taste call)
- Scope is borderline (expand vs hold)
- Cross-model disagreement (CEO vs Eng)

User approves taste decisions.

### Step 5: Output fully-reviewed-plan.md

Complete plan with all reviews applied, decisions made, and remaining taste choices.

## Execution

SKILL_NAME: autoplan
PHASE: cross
SPECIALIST: Review Pipeline — Auto-Runner
TRIGGERS: auto review | run all reviews | autoplan | auto plan
