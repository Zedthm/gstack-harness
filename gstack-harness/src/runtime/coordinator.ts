import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join } from "path";

type AgentStatus = "idle" | "busy" | "failing" | "terminated";
type TaskStatus = "pending" | "scheduled" | "running" | "completed" | "failed" | "rescheduled";

interface AgentConfig {
  id: string;
  name: string;
  capabilities: string[];
  maxConcurrentTasks: number;
  priority: number;
  metadata?: Record<string, string>;
}

interface AgentState extends AgentConfig {
  status: AgentStatus;
  currentTasks: string[];
  totalTasksCompleted: number;
  totalTasksFailed: number;
  registeredAt: string;
  lastHeartbeat: string;
  healthScore: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

interface Task {
  id: string;
  type: string;
  priority: number;
  requiredCapabilities: string[];
  payload: Record<string, string>;
  maxRetries: number;
  timeoutMs: number;
}

interface ScheduledTask {
  task: Task;
  agentId: string;
  status: TaskStatus;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  retries: number;
  error?: string;
}

interface CoordinatorConfig {
  maxQueueSize: number;
  healthCheckIntervalMs: number;
  defaultTimeoutMs: number;
  maxRetries: number;
}

interface CliArgs {
  help?: boolean;
  register?: boolean;
  agent?: string;
  schedule?: boolean;
  task?: string;
  listAgents?: boolean;
  status?: string;
  terminate?: string;
  monitor?: string;
  reschedule?: boolean;
  taskId?: string;
}

interface TaskResult {
  success: boolean;
  taskId: string;
  agentId?: string;
  scheduledAt?: string;
  error?: string;
  requiresReschedule?: boolean;
}

function getCoordinatorDir(): string {
  return join(process.cwd(), ".gstack-harness", "coordinator");
}

function getAgentsDir(): string {
  return join(getCoordinatorDir(), "agents");
}

function getTasksDir(): string {
  return join(getCoordinatorDir(), "scheduled");
}

function ensureDirectories(): void {
  mkdirSync(getAgentsDir(), { recursive: true, mode: 0o700 });
  mkdirSync(getTasksDir(), { recursive: true, mode: 0o700 });
}

function getAgentFile(agentId: string): string {
  return join(getAgentsDir(), `${agentId}.json`);
}

function getTaskFile(taskId: string): string {
  return join(getTasksDir(), `${taskId}.json`);
}

function generateTaskId(prefix: string = "task"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

function registerAgent(config: AgentConfig): AgentState {
  ensureDirectories();
  const now = new Date().toISOString();

  const state: AgentState = {
    ...config,
    status: "idle",
    currentTasks: [],
    totalTasksCompleted: 0,
    totalTasksFailed: 0,
    registeredAt: now,
    lastHeartbeat: now,
    healthScore: 100,
  };

  writeFileSync(getAgentFile(config.id), JSON.stringify(state, null, 2));
  return state;
}

function getAgent(agentId: string): AgentState | null {
  const file = getAgentFile(agentId);
  try {
    if (existsSync(file)) {
      return JSON.parse(readFileSync(file, "utf-8")) as AgentState;
    }
  } catch {}
  return null;
}

function updateAgent(agentId: string, updates: Partial<AgentState>): AgentState | null {
  const agent = getAgent(agentId);
  if (!agent) return null;

  const updated = { ...agent, ...updates, lastHeartbeat: new Date().toISOString() };
  writeFileSync(getAgentFile(agentId), JSON.stringify(updated, null, 2));
  return updated;
}

function listAgents(): AgentState[] {
  ensureDirectories();
  const agents: AgentState[] = [];

  try {
    const files = readdirSync(getAgentsDir());
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = readFileSync(join(getAgentsDir(), file), "utf-8");
        agents.push(JSON.parse(content) as AgentState);
      } catch {}
    }
  } catch {}

  return agents.sort((a, b) => b.priority - a.priority);
}

function terminateAgent(agentId: string): boolean {
  const agent = getAgent(agentId);
  if (!agent) return false;

  agent.status = "terminated";
  agent.lastHeartbeat = new Date().toISOString();
  writeFileSync(getAgentFile(agentId), JSON.stringify(agent, null, 2));
  return true;
}

function getAgentStatus(agentId: string): AgentStatus | null {
  const agent = getAgent(agentId);
  return agent?.status ?? null;
}

function scheduleTask(task: Task): ScheduledTask | null {
  const agents = listAgents().filter((a) => {
    if (a.status === "terminated") return false;
    if (a.currentTasks.length >= a.maxConcurrentTasks) return false;
    return task.requiredCapabilities.every((cap) => a.capabilities.includes(cap));
  });

  if (agents.length === 0) {
    return null;
  }

  agents.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.currentTasks.length - b.currentTasks.length;
  });

  const selectedAgent = agents[0];
  const scheduledTask: ScheduledTask = {
    task: {
      ...task,
      id: task.id || generateTaskId(),
    },
    agentId: selectedAgent.id,
    status: "scheduled",
    scheduledAt: new Date().toISOString(),
    retries: 0,
  };

  selectedAgent.currentTasks.push(scheduledTask.task.id);
  updateAgent(selectedAgent.id, {
    status: "busy",
    currentTasks: selectedAgent.currentTasks,
  });

  ensureDirectories();
  writeFileSync(getTaskFile(scheduledTask.task.id), JSON.stringify(scheduledTask, null, 2));

  return scheduledTask;
}

function getScheduledTask(taskId: string): ScheduledTask | null {
  const file = getTaskFile(taskId);
  try {
    if (existsSync(file)) {
      return JSON.parse(readFileSync(file, "utf-8")) as ScheduledTask;
    }
  } catch {}
  return null;
}

function updateScheduledTask(taskId: string, updates: Partial<ScheduledTask>): ScheduledTask | null {
  const scheduled = getScheduledTask(taskId);
  if (!scheduled) return null;

  const updated = { ...scheduled, ...updates };
  writeFileSync(getTaskFile(taskId), JSON.stringify(updated, null, 2));
  return updated;
}

function rescheduleTask(taskId: string, maxRetries: number = 3): ScheduledTask | null {
  const scheduled = getScheduledTask(taskId);
  if (!scheduled) return null;

  if (scheduled.retries >= maxRetries) {
    scheduled.status = "failed";
    scheduled.error = `Max retries (${maxRetries}) exceeded`;
    scheduled.completedAt = new Date().toISOString();
    writeFileSync(getTaskFile(taskId), JSON.stringify(scheduled, null, 2));

    const agent = getAgent(scheduled.agentId);
    if (agent) {
      updateAgent(agent.id, {
        totalTasksFailed: agent.totalTasksFailed + 1,
        healthScore: Math.max(0, agent.healthScore - 10),
      });
    }
    return scheduled;
  }

  const oldAgent = getAgent(scheduled.agentId);
  if (oldAgent) {
    updateAgent(oldAgent.id, {
      currentTasks: oldAgent.currentTasks.filter((id) => id !== taskId),
      status: oldAgent.currentTasks.length <= 1 ? "idle" : "busy",
    });
  }

  scheduled.retries++;
  scheduled.status = "rescheduled";
  scheduled.scheduledAt = new Date().toISOString();

  const agents = listAgents().filter((a) => {
    if (a.status === "terminated") return false;
    if (a.id === oldAgent?.id) return false;
    if (a.currentTasks.length >= a.maxConcurrentTasks) return false;
    return scheduled.task.requiredCapabilities.every((cap) => a.capabilities.includes(cap));
  });

  if (agents.length === 0) {
    scheduled.status = "failed";
    scheduled.error = "No available agents for rescheduling";
    scheduled.completedAt = new Date().toISOString();
    writeFileSync(getTaskFile(taskId), JSON.stringify(scheduled, null, 2));
    return scheduled;
  }

  agents.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.currentTasks.length - b.currentTasks.length;
  });

  const newAgent = agents[0];
  scheduled.agentId = newAgent.id;
  newAgent.currentTasks.push(taskId);
  updateAgent(newAgent.id, {
    status: "busy",
    currentTasks: newAgent.currentTasks,
  });

  writeFileSync(getTaskFile(taskId), JSON.stringify(scheduled, null, 2));
  return scheduled;
}

function listScheduledTasks(): ScheduledTask[] {
  ensureDirectories();
  const tasks: ScheduledTask[] = [];

  try {
    const files = readdirSync(getTasksDir());
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = readFileSync(join(getTasksDir(), file), "utf-8");
        tasks.push(JSON.parse(content) as ScheduledTask);
      } catch {}
    }
  } catch {}

  return tasks.sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );
}

function markTaskRunning(taskId: string): ScheduledTask | null {
  return updateScheduledTask(taskId, {
    status: "running",
    startedAt: new Date().toISOString(),
  });
}

function markTaskCompleted(taskId: string): ScheduledTask | null {
  const scheduled = getScheduledTask(taskId);
  if (!scheduled) return null;

  const agent = getAgent(scheduled.agentId);
  if (agent) {
    updateAgent(agent.id, {
      totalTasksCompleted: agent.totalTasksCompleted + 1,
      currentTasks: agent.currentTasks.filter((id) => id !== taskId),
      status: agent.currentTasks.length <= 1 ? "idle" : "busy",
    });
  }

  return updateScheduledTask(taskId, {
    status: "completed",
    completedAt: new Date().toISOString(),
  });
}

function markTaskFailed(taskId: string, error: string): ScheduledTask | null {
  const scheduled = getScheduledTask(taskId);
  if (!scheduled) return null;

  return updateScheduledTask(taskId, {
    status: "failed",
    error,
    completedAt: new Date().toISOString(),
  });
}

function monitorAgent(agentId: string): AgentState | null {
  const agent = getAgent(agentId);
  if (!agent) return null;

  const lastHeartbeatAge = Date.now() - new Date(agent.lastHeartbeat).getTime();

  if (lastHeartbeatAge > 60000) {
    updateAgent(agentId, { status: "failing" });
    return getAgent(agentId);
  }

  return agent;
}

function getAllAgentMetrics(): Array<AgentState & { availableCapacity: number }> {
  return listAgents().map((agent) => ({
    ...agent,
    availableCapacity: Math.max(0, agent.maxConcurrentTasks - agent.currentTasks.length),
  }));
}

export class Coordinator {
  register(agent: AgentConfig): AgentState {
    return registerAgent(agent);
  }

  async schedule(task: Task): Promise<TaskResult> {
    const scheduled = scheduleTask(task);

    if (!scheduled) {
      return {
        success: false,
        taskId: task.id || "unknown",
        error: "No available agent for task",
        requiresReschedule: true,
      };
    }

    return {
      success: true,
      taskId: scheduled.task.id,
      agentId: scheduled.agentId,
      scheduledAt: scheduled.scheduledAt,
    };
  }

  monitor(agentId: string): AgentState | null {
    return monitorAgent(agentId);
  }

  terminate(agentId: string): boolean {
    return terminateAgent(agentId);
  }

  reschedule(taskId: string): boolean {
    const result = rescheduleTask(taskId);
    return result !== null && result.status !== "failed";
  }

  getAgentStatus(agentId: string): AgentStatus | null {
    return getAgentStatus(agentId);
  }

  listAgents(): AgentState[] {
    return listAgents();
  }

  listScheduledTasks(): ScheduledTask[] {
    return listScheduledTasks();
  }
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--register") {
      args.register = true;
    } else if (arg === "--agent" && argv[i + 1]) {
      args.agent = argv[++i];
    } else if (arg === "--schedule") {
      args.schedule = true;
    } else if (arg === "--task" && argv[i + 1]) {
      args.task = argv[++i];
    } else if (arg === "--list-agents" || arg === "-l") {
      args.listAgents = true;
    } else if (arg === "--status" && argv[i + 1]) {
      args.status = argv[++i];
    } else if (arg === "--terminate" && argv[i + 1]) {
      args.terminate = argv[++i];
    } else if (arg === "--monitor" && argv[i + 1]) {
      args.monitor = argv[++i];
    } else if (arg === "--reschedule") {
      args.reschedule = true;
    } else if (arg === "--task-id" && argv[i + 1]) {
      args.taskId = argv[++i];
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Coordinator - Multi-Agent Coordination System

Usage:
  bun run src/runtime/coordinator.ts --help
  bun run src/runtime/coordinator.ts --register --agent <config_path>
  bun run src/runtime/coordinator.ts --schedule --task <task_json>
  bun run src/runtime/coordinator.ts --list-agents
  bun run src/runtime/coordinator.ts --status <agent_id>
  bun run src/runtime/coordinator.ts --terminate <agent_id>
  bun run src/runtime/coordinator.ts --monitor <agent_id>
  bun run src/runtime/coordinator.ts --reschedule --task-id <task_id>

Commands:
  --register --agent <path>   Register a new agent from JSON config file
  --schedule --task <json>    Schedule a task (JSON string or @filepath)
  --list-agents, -l           List all registered agents
  --status <agent_id>         Get agent status
  --terminate <agent_id>      Terminate an agent
  --monitor <agent_id>        Get detailed agent metrics
  --reschedule --task-id <id> Reschedule a failed task

Options:
  --help, -h                  Show this help message

Agent Config Format (JSON):
  {
    "id": "agent-1",
    "name": "Worker Agent",
    "capabilities": ["coding", "review", "qa"],
    "maxConcurrentTasks": 3,
    "priority": 8,
    "metadata": {}
  }

Task Format (JSON):
  {
    "type": "code-review",
    "priority": 5,
    "requiredCapabilities": ["review"],
    "payload": {"repo": "myrepo", "branch": "main"},
    "maxRetries": 3,
    "timeoutMs": 300000
  }

Storage: $CWD/.gstack-harness/coordinator/

Examples:
  # Register an agent
  echo '{"id":"dev-1","name":"Dev Agent","capabilities":["coding"],"maxConcurrentTasks":2,"priority":7}' > /tmp/agent.json
  bun run src/runtime/coordinator.ts --register --agent /tmp/agent.json

  # Schedule a task
  bun run src/runtime/coordinator.ts --schedule --task '{"type":"coding","priority":5,"requiredCapabilities":["coding"],"payload":{}}'

  # List agents
  bun run src/runtime/coordinator.ts --list-agents

  # Check agent status
  bun run src/runtime/coordinator.ts --status dev-1

  # Terminate agent
  bun run src/runtime/coordinator.ts --terminate dev-1

  # Monitor agent resources
  bun run src/runtime/coordinator.ts --monitor dev-1

  # Reschedule failed task
  bun run src/runtime/coordinator.ts --reschedule --task-id task_123_abc
`);
}

function loadJsonFromPathOrString(input: string): Record<string, unknown> {
  if (input.startsWith("@")) {
    const filePath = input.slice(1);
    return JSON.parse(readFileSync(filePath, "utf-8"));
  }
  return JSON.parse(input);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  const coordinator = new Coordinator();

  if (args.register && args.agent) {
    try {
      const config = loadJsonFromPathOrString(args.agent) as unknown as AgentConfig;
      const agent = coordinator.register(config);
      console.log(`Agent registered: ${agent.id}`);
      console.log(`   Name: ${agent.name}`);
      console.log(`   Capabilities: ${agent.capabilities.join(", ")}`);
      console.log(`   Priority: ${agent.priority}`);
      console.log(`   Max Concurrent: ${agent.maxConcurrentTasks}`);
    } catch (err) {
      console.error(`Failed to register agent:`, err);
      process.exit(1);
    }
    return;
  }

  if (args.schedule && args.task) {
    try {
      const taskInput = loadJsonFromPathOrString(args.task) as unknown as Task;
      const result = await coordinator.schedule(taskInput);

      if (result.success) {
        console.log(`Task scheduled: ${result.taskId}`);
        console.log(`   Agent: ${result.agentId}`);
        console.log(`   Scheduled: ${result.scheduledAt}`);
      } else {
        console.log(`Task queued (no available agent): ${result.taskId}`);
        console.log(`   Error: ${result.error}`);
      }
    } catch (err) {
      console.error(`Failed to schedule task:`, err);
      process.exit(1);
    }
    return;
  }

  if (args.listAgents) {
    const agents = coordinator.listAgents();
    if (agents.length === 0) {
      console.log("No agents registered");
      return;
    }

    console.log(`Total agents: ${agents.length}\n`);
    for (const agent of agents) {
      const statusLabel = agent.status === "idle" ? "idle" : agent.status === "busy" ? "busy" : agent.status === "failing" ? "failing" : "terminated";
      console.log(`${statusLabel} ${agent.id} (${agent.name})`);
      console.log(`   Status: ${agent.status}`);
      console.log(`   Priority: ${agent.priority}`);
      console.log(`   Capabilities: ${agent.capabilities.join(", ")}`);
      console.log(`   Tasks: ${agent.currentTasks.length}/${agent.maxConcurrentTasks}`);
      console.log(`   Health: ${agent.healthScore}%`);
      console.log(`   Completed: ${agent.totalTasksCompleted} | Failed: ${agent.totalTasksFailed}`);
      console.log();
    }
    return;
  }

  if (args.status) {
    const status = coordinator.getAgentStatus(args.status);
    if (status === null) {
      console.error(`Agent '${args.status}' not found`);
      process.exit(1);
    }
    console.log(`Agent ${args.status}: ${status}`);
    return;
  }

  if (args.terminate) {
    const success = coordinator.terminate(args.terminate);
    if (success) {
      console.log(`Agent terminated: ${args.terminate}`);
    } else {
      console.error(`Agent '${args.terminate}' not found`);
      process.exit(1);
    }
    return;
  }

  if (args.monitor) {
    const metrics = coordinator.monitor(args.monitor);
    if (!metrics) {
      console.error(`Agent '${args.monitor}' not found`);
      process.exit(1);
    }

    console.log(`Agent Metrics: ${metrics.id}`);
    console.log(`   Name: ${metrics.name}`);
    console.log(`   Status: ${metrics.status}`);
    console.log(`   Health Score: ${metrics.healthScore}%`);
    console.log(`   CPU Usage: ${metrics.cpuUsage ?? "N/A"}%`);
    console.log(`   Memory Usage: ${metrics.memoryUsage ?? "N/A"}%`);
    console.log(`   Current Tasks: ${metrics.currentTasks.length}/${metrics.maxConcurrentTasks}`);
    console.log(`   Total Completed: ${metrics.totalTasksCompleted}`);
    console.log(`   Total Failed: ${metrics.totalTasksFailed}`);
    console.log(`   Last Heartbeat: ${metrics.lastHeartbeat}`);
    return;
  }

  if (args.reschedule && args.taskId) {
    const success = coordinator.reschedule(args.taskId);
    if (success) {
      console.log(`Task rescheduled: ${args.taskId}`);
    } else {
      console.error(`Failed to reschedule task '${args.taskId}'`);
      process.exit(1);
    }
    return;
  }

  console.error("Error: No command specified");
  console.error("Run with --help for usage information");
  process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});