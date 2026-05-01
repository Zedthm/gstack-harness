# Plan: gstack-harness Runtime Implementation

## TL;DR

Build a real, executable runtime engine that fuses gstack skills with agentic-harness-patterns into a working system. Skills become callable functions, coordinator becomes a dispatch engine, memory/context/hooks become real code — not documentation.

> **Quick Summary**: Transform gstack-harness from "两层皮" (two-layer documentation) into a real runtime that solves most coding agent scenarios.
>
> **Deliverables**:
> - `harness/runtime/skill_runner.py` — skill discovery, parsing, invocation engine
> - `harness/runtime/coordinator.py` — multi-agent orchestration (coordinator/fork/swarm)
> - `harness/runtime/memory.py` — layered memory persistence (org→user→project→local)
> - `harness/runtime/context.py` — tiered context budget management
> - `harness/runtime/hooks.py` — lifecycle hook system
> - `harness/runtime/gates.py` — quality gate enforcement (P1=0 rule)
> - `harness/runtime/agent.py` — agent dispatch with profiles
> - `harness/cli.py` — unified CLI entry point
> - Refactored skill files with machine-readable frontmatter + executable workflow YAML
>
> **Estimated Effort**: Large (3-5 days full implementation)
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: skill_runner → coordinator+memory+context → hooks+gates+agent → cli+refactor

---

## Context

### Problem: "Two-Layer Skin" Syndrome

gstack-harness currently has:
1. **gstack-format skill docs** — markdown with YAML frontmatter, but stripped of executable preamble (no bash setup, no real trigger mechanism)
2. **harness-pattern docs** — concept descriptions, not code-level implementation

**Not truly integrated.** Skills can't be invoked. Coordinator can't dispatch. Memory/hooks/gates are descriptions, not behavior.

### Goal

Make gstack-harness a **working runtime** that:
- Accepts user intent → matches to skill trigger → executes workflow → returns structured result
- Orchestrates multiple agents (coordinator/fork/swarm patterns) with real dispatch
- Persists memory across sessions with layered hierarchy
- Manages context budget (1KB always-on → 15KB on-activation → resources on-demand)
- Triggers lifecycle hooks at phase boundaries
- Enforces quality gates (P1=0 blocking rule)

### Research Findings

**gstack source** (`/home/qwen/data/project/github/gstack/`):
- Each skill has full bash preamble + skill invocation logic
- Skills are triggered via slash command in Claude Code
- Output format is standardized with STATUS footer (DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT)

**agentic-harness-patterns source** (`/home/qwen/data/project/github/agentic-harness-patterns-skill/`):
- 6 layers: Memory, Skills, Tools/Safety, Context Engineering, Multi-agent, Lifecycle
- Each layer has reference document + hook lifecycle
- Filesystem as coordination medium (handoff-protocol.md)

**Gap**: Neither source has a working Python runtime. gstack depends on Claude Code CLI. harness-patterns is framework-agnostic concept doc.

### Metis Review Gaps

1. **Trigger matching is fuzzy** — need concrete trigger→skill matching algorithm
2. **Context budget not enforced** — no actual token counting
3. **Hook lifecycle undefined** — which hooks fire at which phase boundaries?
4. **Quality gate integration** — how do gates actually block agent behavior?
5. **Skill dependencies** — `depends-on` field requires topological sort or explicit ordering

---

## Work Objectives

### Core Objective

Build `harness/runtime/` as a Python package that can be imported and executed standalone, providing:
- Skill discovery and invocation (trigger → skill → execute → result)
- Multi-agent orchestration with 3 patterns
- Memory persistence with 4 layers
- Context budget with 3 tiers
- Hook lifecycle with 6 phases
- Quality gates with P1=0 rule

### Concrete Deliverables

1. **`harness/runtime/__init__.py`** — exports all runtime classes
2. **`harness/runtime/skill_runner.py`** — SkillSpec + SkillRunner
3. **`harness/runtime/coordinator.py`** — Coordinator + OrchestrationMode + DispatchTable
4. **`harness/runtime/memory.py`** — MemoryLayer hierarchy + AutoMemory
5. **`harness/runtime/context.py`** — ContextBudget + tier management
6. **`harness/runtime/hooks.py`** — HookManager + built-in hooks
7. **`harness/runtime/gates.py`** — QualityGate + P1Rule
8. **`harness/runtime/agent.py`** — AgentProfile + AgentPool
9. **`harness/cli.py`** — `#!/usr/bin/env python3` CLI
10. **All skills refactored** — machine-readable frontmatter + executable workflow YAML

### Definition of Done

- [ ] `python -c "from harness.runtime import SkillRunner; print(SkillRunner().discover())"` → prints skill count
- [ ] `python harness/cli.py discover` → lists all skill names
- [ ] `python harness/cli.py run office-hours` → executes skill and returns JSON result
- [ ] `python -c "from harness.runtime import Coordinator; c = Coordinator(); c.run_skill('review')"` → runs review skill
- [ ] Memory persists across process restarts
- [ ] Context budget enforces size limits
- [ ] Hooks fire at correct phase boundaries
- [ ] P1=0 gate blocks when blocking issues exist

### Must Have

- Real Python imports, not stubs
- Actual file I/O for memory persistence
- Configurable via `harness/config.yaml`
- CLI that works standalone

### Must NOT Have

- gstack bash preamble (removed for harness compatibility)
- Claude Code dependency
- Hard-coded absolute paths outside project

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: NO — build from scratch
- **Automated tests**: YES (tests-after)
- **Framework**: pytest
- **Test locations**: `tests/test_*.py`

### QA Policy

Every module gets:
- Happy path: module loads, core method works
- Edge case: invalid input handled gracefully
- Integration: modules compose together

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — can start immediately):
├── T1: skill_runner.py — skill discovery + parsing (Foundation)
├── T2: memory.py — layered persistence (Foundation)
└── T3: context.py — tiered budget (Foundation)

Wave 2 (Orchestration + Enforcement — after Wave 1):
├── T4: coordinator.py — dispatch + orchestration (depends: T1, T2, T3)
├── T5: hooks.py — lifecycle hook system (depends: T1)
├── T6: gates.py — quality gate enforcement (depends: T1)
└── T7: agent.py — agent dispatch profiles (depends: T1)

Wave 3 (Integration + CLI — after Wave 2):
├── T8: cli.py — unified entry point (depends: T1, T4)
└── T9: Refactor ALL skills to machine-readable format (depends: T1)

Wave FINAL (Verification):
├── T10: Write integration tests
├── T11: Run discover test
└── T12: Run skill invocation test
```

### Dependency Matrix

| Task | Blocks | Blocked By |
|------|--------|------------|
| T1 skill_runner | T4, T5, T6, T7, T8, T9 | — |
| T2 memory | T4 | T1 |
| T3 context | T4 | T1 |
| T4 coordinator | T8 | T1, T2, T3 |
| T5 hooks | — | T1 |
| T6 gates | — | T1 |
| T7 agent | — | T1 |
| T8 cli | T10 | T1, T4 |
| T9 refactor skills | — | T1 |
| T10 tests | T11, T12 | T8 |

### Agent Dispatch Summary

- **1**: **3** — T1 (deep), T2 (unspecified-high), T3 (unspecified-high)
- **2**: **4** — T4 (deep), T5 (unspecified-high), T6 (unspecified-high), T7 (unspecified-high)
- **3**: **2** — T8 (unspecified-high), T9 (quick)
- **FINAL**: **3** — T10 (unspecified-high), T11 (quick), T12 (quick)

---

## TODOs

- [x] 1. **skill_runner.py** ✅ DONE

  **What to do**:
  - Class `SkillSpec`: name, phase, specialist, triggers, inputs, outputs, depends_on, frontmatter, steps, output_discipline
  - Class `SkillInvocation`: skill, trigger, context, started_at
  - Class `SkillRunner`: discover(), find_by_trigger(query), find_by_name(name), find_by_phase(phase), list_all()
  - `_split_frontmatter(content)`: split at first "---" boundary
  - `_parse_skill(path)`: parse YAML frontmatter + extract workflow steps
  - `_extract_steps(body)`: find "## Workflow" section, extract "### Step N" lines
  - `_extract_output_discipline(body)`: find "## Output" section text
  - File: `harness/runtime/skill_runner.py`

  **Must NOT do**:
  - Bash preamble code
  - Claude Code specific tool calls
  - Hard-coded paths

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Foundation module, needs careful design
  - **Skills**: []
    - No skills needed for pure Python

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3)
  - **Blocks**: T4, T5, T6, T7, T8, T9
  - **Blocked By**: None

  **References**:
  - `harness/skills/office-hours.md` — example skill format to parse
  - `harness/config.yaml` — config that should drive runner

  **Acceptance Criteria**:
  - [ ] `from harness.runtime import SkillRunner` → no import error
  - [ ] `runner = SkillRunner(); specs = runner.discover()` → dict with skill names as keys
  - [ ] `runner.find_by_trigger("brainstorm this")` → returns office-hours SkillSpec
  - [ ] `runner.find_by_name("review")` → returns review SkillSpec
  - [ ] `runner.find_by_phase("cross")` → returns list of cross-phase skills
  - [ ] `runner.list_all()` → returns list of all skill names

  **QA Scenarios**:

  ```
  Scenario: skill discovery
    Tool: Bash
    Command: cd /home/qwen/data/project/local/mySkills/gstack-harness && python -c "from harness.runtime import SkillRunner; r = SkillRunner(); specs = r.discover(); print(len(specs))"
    Expected: integer > 0 (skill count)
    Failure: "ModuleNotFoundError" or "0 skills"

  Scenario: trigger matching
    Tool: Bash
    Command: cd /home/qwen/data/project/local/mySkills/gstack-harness && python -c "from harness.runtime import SkillRunner; r = SkillRunner(); s = r.find_by_trigger('brainstorm this'); print(s.name if s else 'NONE')"
    Expected: "office-hours"
    Failure: "NONE" (trigger matching broken)

  Scenario: phase filter
    Tool: Bash
    Command: cd /home/qwen/data/project/local/mySkills/gstack-harness && python -c "from harness.runtime import SkillRunner; r = SkillRunner(); phases = r.find_by_phase('cross'); print(len(phases))"
    Expected: integer > 0
    Failure: "0" (phase filter broken)
  ```

- [x] 2. **memory.py** ✅ DONE

  **What to do**:
  - Class `MemoryLayer` (ABC): get(key), set(key, value), delete(key), search(query), list_keys()
  - Class `OrgMemory(MemoryLayer)`: loads from `~/.gstack-harness/org/`
  - Class `UserMemory(MemoryLayer)`: loads from `~/.gstack-harness/user/`
  - Class `ProjectMemory(MemoryLayer)`: loads from `~/.gstack-harness/projects/{slug}/`
  - Class `LocalMemory(MemoryLayer)`: loads from `./.gstack-harness/`
  - Class `AutoMemory`: extracts decisions, feedback, patterns from conversation
  - Class `MemoryIndex`: maintains search index over all layers
  - Local override wins: lookup order org→user→project→local
  - Persist to JSONL files
  - File: `harness/runtime/memory.py`

  **Must NOT do**:
  - Cloud dependencies
  - Database (use JSONL + SQLite for search index)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3)
  - **Blocks**: T4
  - **Blocked By**: T1

  **Acceptance Criteria**:
  - [ ] `from harness.runtime import MemoryLayer` → no import error
  - [ ] Memory persists across process restarts
  - [ ] `local_override_wins()` test: local value shadows project value

  **QA Scenarios**:

  ```
  Scenario: local override
    Tool: Bash
    Preconditions: Set project value "key=proj_val", local value "key=local_val"
    Command: cd /home/qwen/data/project/local/mySkills/gstack-harness && python -c "from harness.runtime import LocalMemory, ProjectMemory; lm = LocalMemory(); pm = ProjectMemory(); print(lm.get('key') or pm.get('key'))"
    Expected: "local_val" (local wins)
    Failure: "proj_val" (override not working)
  ```

- [x] 3. **context.py** ✅ DONE

  **What to do**:
  - Class `ContextBudget`: manages 3 tiers
  - Class `ContextSection`: metadata/instructions/resources with size limits
  - `max_always_on`: 50000 bytes (configurable)
  - `max_per_section`: metadata=25000, instructions=15360, agents_md=5120, config=1024
  - `compression`: recent_turns_keep=3, recovery_pointer=True
  - `get_always_on()`: return always-on context
  - `load_instructions(skill_name)`: load skill instructions
  - `load_resources(on_demand)`: load specific resources
  - `enforce_budget()`: check sizes, raise if exceeded
  - File: `harness/runtime/context.py`

  **Must NOT do**:
  - Actual token counting (use byte approximations)
  - LLM API calls

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2)
  - **Blocks**: T4
  - **Blocked By**: T1

  **Acceptance Criteria**:
  - [ ] `from harness.runtime import ContextBudget` → no import error
  - [ ] `ctx = ContextBudget(); ctx.get_always_on()` → returns string
  - [ ] `ctx.enforce_budget()` → no error for valid sizes

 marked as done by sed

  **What to do**:
  - Class `Coordinator`: orchestrates skill execution, manages context, enforces hooks
  - Enum `OrchestrationMode`: COORDINATOR/FORK/SWARM
  - Class `DispatchTable`: maps skill → agent profile
  - `run_skill(skill_name, context)`: invoke single skill
  - `run_parallel(skills)`: fork pattern — run skills in parallel
  - `run_swarm(skills)`: swarm pattern — flat peer network
  - `load_context()`: restore from memory layer
  - `save_context()`: persist to memory layer
  - `emit_hook(phase, event)`: trigger before/after hooks
  - File: `harness/runtime/coordinator.py`

  **Must NOT do**:
  - Actually spawn subprocess agents (that's agent.py's job)
  - Blocking synchronous orchestration

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core orchestration logic, complex state management
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: T8
  - **Blocked By**: T1, T2, T3

  **Acceptance Criteria**:
  - [ ] `from harness.runtime import Coordinator` → no import error
  - [ ] `c = Coordinator(); c.run_skill("review")` → returns structured result
  - [ ] `c.run_parallel(["review", "health"])` → returns dict of results

 marked as done by sed

  **What to do**:
  - Class `Hook`: name, phase, before_fn, after_fn, when_fn
  - Class `HookManager`: register_hook, unregister_hook, emit, list_hooks
  - Built-in hooks: on_phase_start, on_phase_end, on_skill_start, on_skill_end, on_error
  - 6 phases: intent_gate, think, plan, build, review_test, ship
  - `emit(phase, event, data)`: fire all matching hooks
  - File: `harness/runtime/hooks.py`

  **Must NOT do**:
  - Sync hooks across processes
  - Blocking hooks (use callbacks)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T6, T7)
  - **Blocks**: None
  - **Blocked By**: T1

  **Acceptance Criteria**:
  - [ ] `from harness.runtime import HookManager` → no import error
  - [ ] HookManager can register and emit hooks
  - [ ] Built-in hooks exist for all 6 phases

 marked as done by sed

  **What to do**:
  - Class `GateResult`: verdict (PASS/FAIL/WARN), P1_count, P2_count, P3_count, issues, recommendations
  - Class `QualityGate`: evaluate(skill_result) → GateResult
  - P1Rule: blocking issues must be zero
  - `enforce(skill_name, result)`: raise if P1>0
  - `report()`: return formatted gate results
  - Severity: P1=blocking, P2=<5 with fix plan, P3=recommendations
  - File: `harness/runtime/gates.py`

  **Must NOT do**:
  - Auto-fix issues (report only)
  - Human-in-loop approval (enforce is code, not question)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T5, T7)
  - **Blocks**: None
  - **Blocked By**: T1

  **Acceptance Criteria**:
  - [ ] `from harness.runtime import QualityGate` → no import error
  - [ ] `gate = QualityGate(); result = gate.evaluate({"P1": 0})` → verdict=PASS
  - [ ] `gate.evaluate({"P1": 3})` → verdict=FAIL

 marked as done by sed

  **What to do**:
  - Class `AgentProfile`: category (coordinator/executor/reviewer/qa/designer), skills, tools, budget
  - Class `AgentPool`: agents dict, register, get, list_by_category
  - `dispatch(skill_name, context)`: → AgentAssignment
  - `agent_for_skill(skill_name)`: returns matching AgentProfile
  - Default profiles: coordinator, executor, reviewer, qa, designer
  - File: `harness/runtime/agent.py`

  **Must NOT do**:
  - Actually spawn subprocess agents (abstract interface only)
  - API calls to LLM providers

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T5, T6)
  - **Blocks**: None
  - **Blocked By**: T1

  **Acceptance Criteria**:
  - [ ] `from harness.runtime import AgentPool` → no import error
  - [ ] `pool = AgentPool(); pool.list_by_category("reviewer")` → returns list
  - [ ] `pool.dispatch("review")` → returns AgentAssignment

 marked as done by sed

  **What to do**:
  - `#!/usr/bin/env python3` CLI
  - `python harness/cli.py discover` — list all skill names
  - `python harness/cli.py run <skill-name>` — invoke skill
  - `python harness/cli.py status` — show harness state
  - `python harness/cli.py help` — show usage
  - File: `harness/cli.py`

  **Must NOT do**:
  - Interactive prompts (stateless CLI)
  - GUI

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: T10
  - **Blocked By**: T1, T4

  **Acceptance Criteria**:
  - [ ] `python harness/cli.py help` → shows usage
  - [ ] `python harness/cli.py discover` → lists skills
  - [ ] `python harness/cli.py run office-hours` → executes and returns JSON

 marked as done by sed

  **What to do**:
  For each skill in `harness/skills/*.md` (except AGENTS.md):
  - Ensure frontmatter has: name, phase, specialist, triggers[], inputs[], outputs[], depends-on[]
  - Add `## Workflow` section with `### Step N: Description` format
  - Add `## Execution` section at end with: SKILL_NAME, PHASE, SPECIALIST, TRIGGERS
  - Verify all skills parse correctly with SkillRunner
  - File: each skill file in harness/skills/

  **Must NOT do**:
  - Change skill semantics (preserve original workflow)
  - Add bash preamble code
  - Make breaking format changes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward format standardization
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T1

  **Acceptance Criteria**:
  - [ ] All skills have valid frontmatter
  - [ ] All skills have Workflow section in correct format
  - [ ] `python -c "from harness.runtime import SkillRunner; r = SkillRunner(); print(len(r.discover()))"` → 41 skills

 marked as done by sed

  **What to do**:
  Create `tests/test_runtime.py`:
  - `test_skill_runner_discovers_all`
  - `test_trigger_matching`
  - `test_memory_persists`
  - `test_context_budget`
  - `test_coordinator_run_skill`
  - `test_quality_gate_blocks_p1`
  - `test_hook_fires`
  - `test_cli_run_skill`
  - File: `tests/test_runtime.py`

  **Must NOT do**:
  - Mock everything (use real implementations)
  - Test external APIs

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: FINAL
  - **Blocks**: None
  - **Blocked By**: T8, T9

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_runtime.py` → all pass
  - [ ] Coverage > 70%

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — all TODOs checked
- [ ] F2. **Code Quality Review** — `python -m py_compile` on all .py files
- [ ] F3. **Integration Test** — run full CLI test
- [ ] F4. **Scope Fidelity Check** — no additional features added

---

## Success Criteria

### Verification Commands

```bash
# Core imports work
python -c "from harness.runtime import SkillRunner, Coordinator, MemoryLayer, ContextBudget, HookManager, QualityGate, AgentPool"

# Skill discovery
python harness/cli.py discover | wc -l  # should be 41

# Skill invocation
python harness/cli.py run office-hours | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))"

# Memory persistence
python -c "from harness.runtime import LocalMemory; m=LocalMemory(); m.set('test','value'); print(m.get('test'))"

# Context budget
python -c "from harness.runtime import ContextBudget; c=ContextBudget(); print(len(c.get_always_on()) < 50000)"

# Quality gate
python -c "from harness.runtime import QualityGate; g=QualityGate(); r=g.evaluate({'P1':0,'P2':0,'P3':0}); print(r.verdict)"
```

---

## Implementation Notes

### Why This Will Actually Work

1. **Skill runner is foundation** — once discovery+parsing works, everything else builds on it
2. **Memory uses filesystem** — JSONL files, no database required, works offline
3. **Context is byte-based** — simple size limits, no token counting complexity
4. **Hooks are callback-based** — simple function registration, fires synchronously
5. **Gates are enforcement** — P1>0 raises exception, blocks the workflow
6. **CLI is stateless** — each invocation is independent, no daemon required

### Key Design Decisions

- **Pure Python** — no external dependencies beyond stdlib + PyYAML
- **Filesystem coordination** — not message passing, follows harness-patterns original design
- **Synchronous** — no async complexity, easier to debug and test
- **Stateless CLI** — no daemon, no background process, no server
- **Config-driven** — `harness/config.yaml` controls all behavior

### Non-Goals (Explicit Exclusions)

- No LLM API calls (agent dispatch is interface only)
- No Claude Code integration (standalone runtime)
- No cloud services (all local filesystem)
- No real browser automation (Playwright interface only)
- No multi-machine coordination (single process)

---

## Commit Strategy

- **1**: `feat(runtime): skill_runner + memory + context foundation` — skill_runner.py, memory.py, context.py
- **2**: `feat(runtime): coordinator + hooks + gates + agent` — coordinator.py, hooks.py, gates.py, agent.py
- **3**: `feat(cli): unified entry point` — cli.py
- **4**: `feat(skills): refactor all skills to machine-readable format` — all harness/skills/*.md
- **5**: `test(runtime): integration tests` — tests/test_runtime.py