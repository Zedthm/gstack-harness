# Plan: gstack-harness Real Skill Execution Layer

## TL;DR

Build the actual skill execution engine that replaces the simulation stub. Skills become callable functions that execute real workflow steps.

> **Quick Summary**: Replace `coordinator._execute_skill()` simulation with `SkillExecutor` that parses `## Workflow` sections, executes steps, collects output, and integrates hooks + gates.
>
> **Deliverables**:
> - `harness/runtime/executor.py` — real skill execution engine with step parsing
> - `StepPlanner` — parses `### Step N` into executable step objects
> - `ContextAwareExecutor` — injects context budget into each step
> - Hook integration — hooks actually intercept at phase boundaries
> - Quality gate integration — P1=0 enforced at each step boundary
> - Refactored `Coordinator` that uses real `SkillExecutor`
>
> **Estimated Effort**: Medium (2-3 hours)
> **Critical Path**: executor → StepPlanner → ContextAwareExecutor → integration

---

## Context

### Problem: Simulation Stub

Current `coordinator._execute_skill()` is a stub:

```python
# Current (fake):
def _execute_skill(self, skill, context) -> DispatchResult:
    return DispatchResult(
        status="DONE",
        output={
            "skill": skill.name,
            "workflow": "executed (simulation)",  # ← NOT REAL
        },
    )
```

Skills' `## Workflow` sections are never parsed or executed. Steps never run.

### Goal

Build `SkillExecutor` that:
1. Reads `## Workflow` section from skill markdown
2. Parses `### Step N: Description` into `Step` objects
3. Executes each step in sequence
4. Collects output, errors, concerns
5. Integrates hooks (can intercept at step boundaries)
6. Integrates quality gates (P1=0 enforced between steps)
7. Returns real `DispatchResult` with actual execution data

### Research Findings

**Skill step format** (from existing skills):
```markdown
## Workflow

### Step 1: Confirm Target
Ask user which directory to freeze (or confirm they mean the current working directory).

### Step 2: Validate Path
```bash
TARGET="/path/to/dir"
[ -d "$TARGET" ] && echo "VALID" || echo "INVALID"
```

### Step 3: Set Boundary
Write boundary to marker file.
```

Each step has:
- Number (Step 1, Step 2, ...)
- Title/description
- Action (markdown text or code block)

### Metis Review

1. **Step parsing** — regex to extract `### Step N: Title\n\nContent`
2. **Step types** — distinguish: Bash, AskUserQuestion, Read/Write, conditional
3. **Execution** — subprocess for Bash, structured output for questions
4. **Hook placement** — before/after each step
5. **Gate placement** — after each step, before next

---

## Work Objectives

### Core Objective

Replace simulation stub with real `SkillExecutor`:
- Parse workflow section → `Step[]` objects
- Execute each step → collect results
- Hooks fire at step boundaries (can intercept)
- Gates enforce P1=0 between steps
- Context budget applied to each step

### Concrete Deliverables

1. **`harness/runtime/executor.py`**

   - `Step`: name, description, step_type, content, expected_output
   - `StepResult`: step, status, output, errors, duration_seconds
   - `SkillExecutor`: skill, steps, hooks, context, gate
     - `parse_workflow(skill_body)` → `Step[]`
     - `execute_step(step)` → `StepResult`
     - `execute_all()` → `DispatchResult`

2. **`harness/runtime/step_planner.py`**

   - `StepPlanner`: parses workflow markdown into `Step[]`
   - `step_type()`: classify as Bash/AskUserQuestion/Read/Write/Conditional
   - `parse_step_number()`: extract "Step 1" from "### Step 1: Title"
   - `parse_step_content()`: extract code blocks vs prose

3. **`harness/runtime/context_aware_executor.py`**

   - Injects context budget into step execution
   - Pre-loads always_on context before first step
   - Loads skill instructions before execution
   - Enforces budget between steps
   - Truncates if budget exceeded

4. **Hook integration**

   - `before_step(step)` → fires `on_step_start` hook
   - `after_step(step, result)` → fires `on_step_end` hook
   - Hook can set `intercept=True` to stop execution

5. **Gate integration**

   - `evaluate_step_result(result)` → after each step
   - `GateResult` checked — if P1>0, raise `BlockedError`
   - Continue only if verdict PASS or WARN

6. **Refactored `Coordinator`**

   - Uses real `SkillExecutor` instead of simulation
   - All existing methods (run_skill, run_parallel, run_swarm) work unchanged

### Definition of Done

- [ ] `python -c "from harness.runtime import SkillExecutor; e=SkillExecutor(); print(e)"` → no import error
- [ ] `executor.parse_workflow(skill_body)` → returns `Step[]` with correct count
- [ ] `executor.execute_step(Step(type='bash'))` → runs subprocess, returns output
- [ ] Hook fires before/after each step
- [ ] P1>0 blocks execution at step boundary
- [ ] `coordinator.run_skill('review')` → returns DispatchResult with real execution data

---

## Execution Strategy

### Sequential (dependencies)

```
StepPlanner (foundation) → SkillExecutor (orchestration) → ContextAwareExecutor (enhancement) → Hook integration → Gate integration → Coordinator refactor
```

### Agent Dispatch

- **T1**: `deep` — SkillExecutor + StepPlanner (complex, needs architecture)
- **T2**: `unspecified-high` — ContextAwareExecutor, Hook integration
- **T3**: `unspecified-high` — Gate integration, Coordinator refactor

---

## TODOs

- [ ] 1. **step_planner.py** — parse workflow markdown into Step[]

  **What to do**:
  - Class `Step`: name, description, step_type, content
  - Class `StepPlanner`: parse_workflow(body) → list[Step]
  - `step_type()`: classify step as bash/ask/conditional/read/write
  - `parse_step_number()`: extract "Step 1" from "### Step 1: Title"
  - `parse_step_content()`: extract code blocks vs prose

  **File**: `harness/runtime/step_planner.py`

  **Acceptance Criteria**:
  - [ ] `StepPlanner().parse_workflow(body)` → returns correct number of steps
  - [ ] `Step(step_type='bash')` identified correctly

- [ ] 2. **executor.py** — real skill execution engine

  **What to do**:
  - Class `StepResult`: step, status, output, errors, duration_seconds
  - Class `SkillExecutor`: skill, steps, hooks, context, gate
  - `parse_workflow(skill_body)` → Step[]
  - `execute_step(step)` → StepResult
  - `execute_all()` → DispatchResult

  **File**: `harness/runtime/executor.py`

  **Acceptance Criteria**:
  - [ ] `SkillExecutor().execute_step()` runs real subprocess
  - [ ] Hook fires before/after step
  - [ ] Errors collected in StepResult

- [ ] 3. **context_aware_executor.py** — inject context budget

  **What to do**:
  - Inherits from SkillExecutor
  - Pre-loads always_on before first step
  - Loads skill instructions before execution
  - Enforces budget between steps

  **File**: `harness/runtime/context_aware_executor.py`

  **Acceptance Criteria**:
  - [ ] Context budget applied to step execution
  - [ ] Budget exceeded → truncate or reject

- [ ] 4. **Hook integration** — hooks can intercept

  **What to do**:
  - `before_step(step)` → emit hook, check intercept flag
  - `after_step(step, result)` → emit hook, check intercept flag
  - Hook can set `intercept=True` to stop execution

  **Acceptance Criteria**:
  - [ ] `on_step_start` hook fires before step
  - [ ] `on_step_end` hook fires after step
  - [ ] Hook returning intercept=True stops execution

- [ ] 5. **Gate integration** — P1=0 enforced

  **What to do**:
  - `evaluate_step_result(result)` → after each step
  - If P1>0 → raise `BlockedError`
  - Report gate results in DispatchResult

  **Acceptance Criteria**:
  - [ ] Step with P1>0 → execution blocked
  - [ ] `BlockedError` raised with step name
  - [ ] Gate report included in DispatchResult

- [ ] 6. **Coordinator refactor** — use real executor

  **What to do**:
  - Replace `coordinator._execute_skill()` stub with `SkillExecutor`
  - Keep same interface (run_skill, run_parallel, run_swarm)
  - All existing calls work unchanged

  **Acceptance Criteria**:
  - [ ] `coordinator.run_skill('review')` → real execution
  - [ ] `coordinator.run_skill('office-hours')` → real execution
  - [ ] Output includes actual step results, not simulation

---

## Success Criteria

```bash
# StepPlanner
python -c "from harness.runtime import StepPlanner; p=StepPlanner(); s=p.parse_workflow('## Workflow\\n\\n### Step 1: Test\\ncontent\\n\\n### Step 2: Done\\ncontent'); print(len(s))"

# SkillExecutor
python -c "from harness.runtime import SkillExecutor; e=SkillExecutor(); r=e.execute_all(); print(r.status)"

# Hook interception
python -c "from harness.runtime import HookManager, SkillExecutor; h=HookManager(); h.register_hook(Hook(name='blocker', phase='*', event='before', callback=lambda d: {'intercept': True})); e=SkillExecutor(hooks=h); r=e.execute_all(); print(r.status)"

# P1=0 gate
python -c "from harness.runtime import QualityGate, SkillExecutor; e=SkillExecutor(gate=QualityGate()); r=e.execute_all(); print(r.status)"
```

---

## Commit Strategy

- **1**: `feat(runtime): StepPlanner + SkillExecutor` — step_planner.py, executor.py
- **2**: `feat(runtime): ContextAwareExecutor + hook integration` — context_aware_executor.py, hook integration
- **3**: `feat(runtime): gate integration + coordinator refactor` — gates in executor, coordinator.py updated