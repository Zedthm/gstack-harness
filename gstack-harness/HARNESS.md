# Agentic Harness Framework v2

A layered execution framework for orchestrating AI agents, skills, and multi-agent coordination. Built on Bun with process-based isolation and event-driven hooks.

## Quick Start

```bash
# List available skills
bun run src/runtime/skill-runner.ts --list

# Run a skill directly
bun run src/runtime/skill-runner.ts --skill investigate --arg repo=myrepo

# Create and run a task
bun run src/runtime/task.ts --create --skill review --arg branch=main
bun run src/runtime/task.ts --run task_1234567890_abc

# Run multi-agent in parallel
bun run src/runtime/swarm.ts --test
```

## The Six Layers

| Layer | File | Purpose |
|-------|------|---------|
| Memory | `memory.ts` | LLM-powered persistent memory with semantic search |
| Skills | `skill-runner.ts` | Markdown-based skill loading and execution |
| Tools | `executor.ts` | Bash command execution engine |
| Context | `context.ts` | Context building, injection, snapshots |
| Multi-Agent | `fork.ts`, `swarm.ts`, `coordinator.ts` | Process forking, swarm coordination, task routing |
| Lifecycle | `task.ts`, `hooks.ts` | Task management and event-driven hooks |

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full technical description of each layer.

## Core Usage Patterns

### Running Skills

Skills live in `harness/skills/<name>.md` with `## Workflow` and `## Execution` sections.

```bash
# Run a skill with arguments
bun run src/runtime/skill-runner.ts --skill investigate --arg repo=gstack --arg branch=main

# List all available skills
bun run src/runtime/skill-runner.ts --list
```

Arguments become environment variables: `--arg repo=myrepo` sets `ARG_REPO=myrepo`.

### Task Lifecycle

Tasks track skill execution with step-level granularity.

```bash
# Create a task
bun run src/runtime/task.ts --create --skill review --arg branch=main

# Run it
bun run src/runtime/task.ts --run task_1234567890_abc

# Check status
bun run src/runtime/task.ts --status task_1234567890_abc

# List all tasks
bun run src/runtime/task.ts --list

# Cancel if needed
bun run src/runtime/task.ts --cancel task_1234567890_abc
```

Tasks store state in `$CWD/.gstack-harness/tasks/<task_id>.json`.

### Multi-Agent Coordination

**Fork — spawn a real child process:**

```typescript
import { fork } from './fork';

const result = await fork({
  agent_id: 'agent-1',
  skill_name: 'investigate',
  args: { repo: 'myrepo' }
});
// result: { pid, exitCode, stdout, stderr }
```

**Swarm — run multiple agents:**

```typescript
import { swarm } from './swarm';

const result = await swarm({
  agents: [
    { id: 'agent-1', skill: 'review' },
    { id: 'agent-2', skill: 'qa', args: { url: 'https://staging.myapp.com' } },
    { id: 'agent-3', skill: 'investigate' }
  ],
  coordination: 'parallel'  // or 'sequential' or 'hierarchical'
});
// result.aggregated: { totalAgents, successfulAgents, failedAgents, successRate, pids[] }
```

Run the demo:
```bash
bun run src/runtime/swarm.ts --test
```

**Coordinator — register agents and schedule tasks:**

```typescript
const coordinator = new Coordinator();

// Register an agent
coordinator.register({
  id: 'dev-1',
  name: 'Dev Agent',
  capabilities: ['coding', 'review'],
  maxConcurrentTasks: 3,
  priority: 8
});

// Schedule a task
const result = await coordinator.schedule({
  type: 'code-review',
  priority: 5,
  requiredCapabilities: ['review'],
  payload: { repo: 'myrepo', branch: 'main' },
  maxRetries: 3,
  timeoutMs: 300000
});

// Check agent status
const status = coordinator.getAgentStatus('dev-1');  // 'idle' | 'busy' | 'failing' | 'terminated'

// List all agents
const agents = coordinator.listAgents();
```

CLI usage:
```bash
bun run src/runtime/coordinator.ts --register --agent @/tmp/agent.json
bun run src/runtime/coordinator.ts --list-agents
bun run src/runtime/coordinator.ts --status dev-1
bun run src/runtime/coordinator.ts --monitor dev-1
bun run src/runtime/coordinator.ts --reschedule --task-id task_123_abc
```

### Memory and Context

**Memory — persistent learnings with LLM extraction:**

```bash
# Save a memory
bun run src/runtime/memory.ts --save --agent user1 --type error-patterns --content "React useEffect cleanup: always removeEventListener in return"

# Search memories
bun run src/runtime/memory.ts --recall --agent user1 --query "React"

# Extract without saving
bun run src/runtime/memory.ts --extract --agent user1 --type skill-patterns --content "TypeScript generics"
```

Memory types: `skill-patterns`, `error-patterns`, `project-context`, `user-preferences`

Storage: `$CWD/.gstack-harness/memory/<type>.jsonl`

**Context — build and inject context:**

```bash
# Build context for an agent/task
bun run src/runtime/context.ts --build --agent agent-123 --task "review-pr"

# Inject skill metadata
bun run src/runtime/context.ts --inject --skill investigate

# Snapshot current state
bun run src/runtime/context.ts --snapshot

# Restore from snapshot
bun run src/runtime/context.ts --restore --file .gstack/context/snapshot-1234567890.json
```

### Event-Driven Hooks

Hooks intercept execution at key points.

```typescript
import { HookRegistry } from './hooks';

const registry = new HookRegistry();

// Register a hook (lower priority = earlier execution)
registry.register('PreToolUse', async (data) => {
  if (data.tool_name === 'Bash' && data.args?.command?.includes('rm -rf')) {
    return { allowed: false, reason: 'Blocking dangerous command', blocked: true };
  }
  return { allowed: true };
}, 100);

// Trigger hooks
const result = await registry.trigger('PreToolUse', { timestamp: Date.now(), tool_name: 'Bash' });
```

Available events:
- `PreToolUse(tool_name, args)` — Before tool execution
- `PostToolUse(tool_name, args, result)` — After tool execution
- `OnAgentStart(agent_id, task)` — Agent starts
- `OnAgentEnd(agent_id, result)` — Agent ends
- `OnError(agent_id, error)` — Error occurs

### Context Snapshots

Persist and restore execution context:

```typescript
import { createSnapshot, restoreContext, saveSnapshot, loadSnapshot } from './context';

// Create and save
const snapshot = createSnapshot(currentContext);
const path = saveSnapshot(snapshot);

// Load and restore
const loaded = loadSnapshot(path);
const context = restoreContext(loaded);
```

Snapshots include: version, timestamp, recent_memories, active_task, skill_metadata, user_preferences, injected_skills.

## Storage Layout

```
$CWD/.gstack-harness/
├── memory/           # Memory layer JSONL files
│   ├── skill-patterns.jsonl
│   ├── error-patterns.jsonl
│   ├── project-context.jsonl
│   └── user-preferences.jsonl
├── coordinator/
│   ├── agents/       # Agent state JSON files
│   └── scheduled/    # Scheduled task JSON files
├── tasks/            # Task state JSON files
├── hooks.json        # Serialized hook registry
└── context/          # Context snapshots
    └── current.json  # Active context
```

## Design Principles

1. **Separation of concerns** — Each layer has a single responsibility
2. **Process isolation** — Forked agents run in separate processes, not threads
3. **Event-driven** — Lifecycle hooks allow interception without modifying core logic
4. **Persistence by default** — All state written to disk for crash recovery
5. **Unix philosophy** — Small composable tools; layer via IPC and shared storage

## Example: Full Multi-Agent Workflow

```typescript
import { fork } from './fork';
import { swarm } from './swarm';
import { Coordinator } from './coordinator';

// 1. Register agents with the coordinator
const coordinator = new Coordinator();
coordinator.register({ id: 'dev-1', name: 'Dev', capabilities: ['coding'], maxConcurrentTasks: 2, priority: 7 });
coordinator.register({ id: 'qa-1', name: 'QA', capabilities: ['qa'], maxConcurrentTasks: 3, priority: 8 });

// 2. Fork a skill in a child process
const forkedResult = await fork({ agent_id: 'dev-1', skill_name: 'investigate', args: { repo: 'gstack' } });

// 3. Run multiple agents in parallel via swarm
const swarmResult = await swarm({
  agents: [
    { id: 'agent-1', skill: 'review', args: { branch: 'main' } },
    { id: 'agent-2', skill: 'qa', args: { url: 'https://staging.myapp.com' } },
    { id: 'agent-3', skill: 'investigate', args: { repo: 'gstack' } }
  ],
  coordination: 'parallel'
});

// 4. Schedule work through coordinator
await coordinator.schedule({
  type: 'code-review',
  priority: 5,
  requiredCapabilities: ['review'],
  payload: { repo: 'myrepo', branch: 'feature' },
  maxRetries: 3,
  timeoutMs: 300000
});
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `bun run src/runtime/skill-runner.ts --skill <name>` | Run a skill |
| `bun run src/runtime/skill-runner.ts --list` | List available skills |
| `bun run src/runtime/task.ts --create --skill <name>` | Create a task |
| `bun run src/runtime/task.ts --run <task_id>` | Execute a task |
| `bun run src/runtime/task.ts --status <task_id>` | Get task status |
| `bun run src/runtime/task.ts --list` | List all tasks |
| `bun run src/runtime/fork.ts --agent <id> --skill <name>` | Fork a child process |
| `bun run src/runtime/swarm.ts --mode parallel --agents 3` | Run swarm demo |
| `bun run src/runtime/coordinator.ts --register --agent <path>` | Register an agent |
| `bun run src/runtime/coordinator.ts --list-agents` | List agents |
| `bun run src/runtime/coordinator.ts --schedule --task <json>` | Schedule a task |
| `bun run src/runtime/memory.ts --save --agent <id> --type <type> --content <text>` | Save memory |
| `bun run src/runtime/memory.ts --recall --agent <id> --query <text>` | Search memories |
| `bun run src/runtime/context.ts --build --agent <id> --task <task>` | Build context |
| `bun run src/runtime/context.ts --snapshot` | Save context snapshot |
| `bun run src/runtime/context.ts --restore --file <path>` | Restore from snapshot |
| `bun run src/runtime/hooks.ts --trigger <name> --data <json>` | Trigger hooks |
| `bun run src/runtime/hooks.ts --list` | List registered hooks |