# Bootstrap Sequence — Harness Initialization

## Problem

Without disciplined bootstrap, security-critical steps execute out of order: trust-gated subsystems activate before user grants consent, expensive modules load for trivial commands, concurrent callers cause double-init.

## Golden Rules

1. **Initialize by dependency order, trust as critical inflection.** Config → TLS → safe env → trust dialog → full env → subsystems.
2. **Memoize top-level init.** All concurrent callers share single in-flight promise — prevents double-init.
3. **Split env vars across trust boundary.** Safe set (no secrets) applied before consent. Full set applied after.
4. **Dispatch trivial commands before loading anything.** Version/help/diagnostics: zero dynamic imports.
5. **Register cleanup during init, not at usage sites.** Guaranteed cleanup regardless of exit path.

## GSTACK-HARNESS Bootstrap Layers

The harness initializes through four dependency-ordered layers:

### Layer 0: Trivial Command Check (0ms cold start)

Before loading anything, check if user request is trivial:
- "What version?" → respond immediately
- "List available skills" → respond immediately  
- "Show harness status" → respond immediately
- Any request that requires zero subsystems → dispatch immediately

### Layer 1: Config Parse (must complete before anything else)

```
Read: config.yaml (project root)
Read: .agents/config.yaml (project-local overrides)
Read: ~/.mySkills/config.yaml (user-level defaults)
Priority: project-local > user-level (local wins)
Validate: schema match, required fields present, values within bounds
```

Config must parse before any network contact occurs.

### Layer 2: Trust Establishment (critical inflection)

Trust boundary separates pre-consent from post-consent state:

**Pre-trust (safe operations):**
- Read project file tree
- Read skill metadata (~1% budget discovery)
- Read existing handoff files
- Display available skills
- Show recent session history

**Trust gate:** AskUserQuestion at first skill invocation requiring write, build, or deploy:
> "This operation will [read/write/modify/deploy]. Proceed?"

**Post-trust (activated systems):**
- Memory write layer
- Auto-save session extraction
- Git operations with commit
- Browser automation
- Deploy operations
- External API calls
- Cross-project learning search

### Layer 3: Subsystem Init (dependency-ordered)

Subsystem initialization order:

1. **Memory subsystem** — load instruction memory (org→user→project→local), auto-memory index
2. **Skill discovery** — lazy-loaded metadata listing (capped at ~1% context budget)
3. **Permission pipeline** — load permission rules from config, apply fail-closed defaults
4. **Context cache** — initialize memoized builders with known invalidation points
5. **Background extraction** — set up session extractor (mutual exclusion gate)
6. **Task registry** — initialize typed task state machine
7. **Hook registry** — register lifecycle hooks (pre/post tool execution)
8. **Cleanup handlers** — register graceful shutdown, child-process reaping, disk cleanup

### Layer 4: Ready State

After all layers, harness outputs ready signal:
```
HARNESS: READY
Memory: N instructions loaded, M auto-entries indexed
Skills: K specialists available, V variants
Context: ~1KB metadata always-on, ~NKB skill body(s) lazy-loaded
Tasks: 0 running, 0 pending
Permissions: fail-closed, N rules loaded
```

## Concurrency Handling

All callers share single in-flight init. If two specialist agents request harness initialization simultaneously, the second waits for the first's completion (memoized boundary).

## Trust-Split Environment Variables

Before trust dialog, only these are available:
- GSTACK_EXPLAIN_LEVEL, GSTACK_SKILL_PREFIX, GSTACK_PROACTIVE
- GSTACK_REPO_MODE, GSTACK_CHECKPOINT_MODE

After trust (only if user grants):
- Environment secrets, proxy config, cross-project settings, team memory

## Cleanup Registration

At init time, register:
1. Graceful shutdown handler (SIGTERM/SIGINT)
2. Disk output cleanup for terminal tasks
3. In-flight task drain (kill running, save completed)
4. Memory flush (session extraction before shutdown)
5. Temp file sweep (/tmp/mySkills-*)

Each cleanup is registered once at init — never at usage sites.

## Gotchas

- **Memoization caches rejections.** If config fails to parse, subsequent callers must retry — not re-use cached failure.
- **Trust boundary leakage through env vars.** Applying full set before consent is a security violation, not just ordering preference.
- **Headless mode must skip interactive dialogs.** CI/no-TTY environments hang forever if blocking on user input.
- **Global state modules must be leaves.** Config parser imports only pure leaf modules — adding non-leaf imports creates circular dependency risk.
