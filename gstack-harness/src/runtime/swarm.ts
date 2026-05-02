#!/usr/bin/env bun
import { spawn } from "bun";

interface AgentConfig {
  id: string;
  skill?: string;
  args?: Record<string, string>;
  children?: AgentConfig[];
}

interface SwarmOptions {
  agents: AgentConfig[];
  coordination: "sequential" | "parallel" | "hierarchical";
}

interface AgentResult {
  id: string;
  pid: number;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  children?: AgentResult[];
}

interface SwarmResult {
  success: boolean;
  totalDuration: number;
  agents: AgentResult[];
  aggregated: Record<string, unknown>;
}

interface CliArgs {
  mode?: "sequential" | "parallel" | "hierarchical";
  agents?: number;
  depth?: number;
  help?: boolean;
  test?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--mode" && argv[i + 1]) {
      const mode = argv[++i];
      if (mode === "sequential" || mode === "parallel" || mode === "hierarchical") {
        args.mode = mode;
      }
    } else if (arg === "--agents" && argv[i + 1]) {
      args.agents = parseInt(argv[++i], 10);
    } else if (arg === "--depth" && argv[i + 1]) {
      args.depth = parseInt(argv[++i], 10);
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--test") {
      args.test = true;
    }
  }

  return args;
}

async function forkAgent(
  agent: AgentConfig,
  parentPid?: number
): Promise<AgentResult> {
  const startTime = Date.now();

  const skillArg = agent.skill ? `--skill ${agent.skill}` : "";
  const argsEntries = Object.entries(agent.args || {});
  const argsStr = argsEntries.map(([k, v]) => `--arg ${k}=${v}`).join(" ");
  const command = `bun run src/runtime/task.ts ${skillArg} ${argsStr}`.trim();

  const demoCmd = `echo "Agent ${agent.id} (PID: $$PPID -> $$)" && sleep ${Math.random() * 0.5 + 0.1} && echo "Agent ${agent.id} completed"`;
  const finalCmd = agent.skill ? command : demoCmd;

  const proc = spawn({
    cmd: ["sh", "-c", finalCmd],
    env: {
      ...process.env,
      AGENT_ID: agent.id,
      PARENT_PID: parentPid ? String(parentPid) : "",
      SWARM_MODE: "fork",
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  const pid = proc.pid;

  const [stdoutBytes, stderrBytes, exitCode] = await Promise.all([
    proc.stdout.bytes(),
    proc.stderr.bytes(),
    proc.exited,
  ]);

  const stdout = new TextDecoder().decode(stdoutBytes);
  const stderr = new TextDecoder().decode(stderrBytes);
  const duration = Date.now() - startTime;

  return {
    id: agent.id,
    pid,
    success: exitCode === 0,
    stdout,
    stderr,
    exitCode,
    duration,
  };
}

async function runSequential(agents: AgentConfig[]): Promise<AgentResult[]> {
  const results: AgentResult[] = [];

  for (const agent of agents) {
    console.log(`\n📍 [Sequential] Running agent: ${agent.id}`);
    const result = await forkAgent(agent);
    results.push(result);

    if (result.success) {
      console.log(`   ✅ Agent ${agent.id} completed in ${result.duration}ms`);
    } else {
      console.log(`   ❌ Agent ${agent.id} failed with exit code ${result.exitCode}`);
    }
  }

  return results;
}

async function runParallel(agents: AgentConfig[]): Promise<AgentResult[]> {
  console.log(`\n🚀 [Parallel] Running ${agents.length} agents simultaneously`);

  const promises = agents.map((agent) => forkAgent(agent));
  const results = await Promise.all(promises);

  for (const result of results) {
    if (result.success) {
      console.log(`   ✅ Agent ${result.id} (PID ${result.pid}) completed in ${result.duration}ms`);
    } else {
      console.log(`   ❌ Agent ${result.id} (PID ${result.pid}) failed with exit code ${result.exitCode}`);
    }
  }

  return results;
}

async function runHierarchical(
  agents: AgentConfig[],
  depth: number = 1
): Promise<AgentResult[]> {
  const results: AgentResult[] = [];
  const masterPid = process.pid;

  console.log(`\n🌳 [Hierarchical] Master PID: ${masterPid}, Depth: ${depth}`);

  for (const agent of agents) {
    console.log(`\n📍 [Hierarchical] Master spawning: ${agent.id}`);
    const result = await forkAgent(agent, masterPid);
    results.push(result);

    if (agent.children && agent.children.length > 0 && depth > 0) {
      console.log(`   📦 Agent ${agent.id} spawning ${agent.children.length} children`);
      const childResults = await runHierarchical(agent.children, depth - 1);
      result.children = childResults;
    }

    if (result.success) {
      console.log(`   ✅ Agent ${result.id} completed in ${result.duration}ms`);
      if (result.children) {
        console.log(`   📦 Children: ${result.children.length} completed`);
      }
    } else {
      console.log(`   ❌ Agent ${result.id} failed`);
    }
  }

  return results;
}

function aggregateResults(results: AgentResult[]): Record<string, unknown> {
  const totalAgents = countAgents(results);
  const successfulAgents = results.filter((r) => r.success).length;
  const failedAgents = totalAgents - successfulAgents;
  const totalDuration = results.reduce((acc, r) => acc + r.duration, 0);
  const avgDuration = totalAgents > 0 ? Math.round(totalDuration / totalAgents) : 0;

  return {
    totalAgents,
    successfulAgents,
    failedAgents,
    totalDuration,
    avgDuration,
    successRate: totalAgents > 0 ? `${Math.round((successfulAgents / totalAgents) * 100)}%` : "N/A",
    pids: results.map((r) => r.pid),
  };
}

function countAgents(results: AgentResult[]): number {
  let count = results.length;
  for (const r of results) {
    if (r.children) {
      count += countAgents(r.children);
    }
  }
  return count;
}

export async function swarm(options: SwarmOptions): Promise<SwarmResult> {
  const startTime = Date.now();
  const { agents, coordination } = options;

  if (agents.length === 0) {
    return {
      success: true,
      totalDuration: 0,
      agents: [],
      aggregated: { totalAgents: 0, successfulAgents: 0, failedAgents: 0 },
    };
  }

  console.log(`\n🐝 Swarm starting: ${agents.length} agents, mode: ${coordination}`);

  let results: AgentResult[];

  switch (coordination) {
    case "sequential":
      results = await runSequential(agents);
      break;
    case "parallel":
      results = await runParallel(agents);
      break;
    case "hierarchical":
      results = await runHierarchical(agents);
      break;
    default:
      throw new Error(`Unknown coordination mode: ${coordination}`);
  }

  const totalDuration = Date.now() - startTime;
  const aggregated = aggregateResults(results);
  const allSuccess = results.every((r) => r.success);

  console.log(`\n📊 Swarm completed in ${totalDuration}ms`);
  console.log(`   Total agents: ${aggregated.totalAgents}`);
  console.log(`   Success rate: ${aggregated.successRate}`);

  return {
    success: allSuccess,
    totalDuration,
    agents: results,
    aggregated,
  };
}

function runDemo(): void {
  console.log("🧪 Running Swarm Demo Mode\n");

  const demoAgents: AgentConfig[] = [
    { id: "agent-1" },
    { id: "agent-2" },
    { id: "agent-3" },
  ];

  swarm({ agents: demoAgents, coordination: "parallel" })
    .then((result) => {
      console.log("\n📋 Final Result:");
      console.log(JSON.stringify(result.aggregated, null, 2));
    })
    .catch((err) => {
      console.error("❌ Swarm error:", err);
      process.exit(1);
    });
}

function printHelp(): void {
  console.log(`
🐝 Swarm - Multi-process Agent Coordination

Usage:
  bun run src/runtime/swarm.ts --mode <mode> [options]
  bun run src/runtime/swarm.ts --test
  bun run src/runtime/swarm.ts --help

Modes:
  --mode sequential    Run agents one at a time
  --mode parallel      Run agents simultaneously (default)
  --mode hierarchical  Master agent spawns child agents

Options:
  --agents <n>         Number of demo agents to spawn (default: 3)
  --depth <n>         Hierarchical depth (default: 1)
  --test              Run demo mode
  --help, -h          Show this help

Examples:
  bun run src/runtime/swarm.ts --mode parallel --agents 3
  bun run src/runtime/swarm.ts --mode sequential --agents 2
  bun run src/runtime/swarm.ts --mode hierarchical --depth 2
  bun run src/runtime/swarm.ts --test

API Usage:
  import { swarm } from './runtime/swarm';

  const result = await swarm({
    agents: [
      { id: 'agent-1', skill: 'investigate', args: { repo: 'myrepo' } },
      { id: 'agent-2', skill: 'review' }
    ],
    coordination: 'parallel'
  });
`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  if (args.test) {
    runDemo();
    return;
  }

  const mode = args.mode || "parallel";
  const count = args.agents || 3;
  const depth = args.depth || 1;

  const demoAgents: AgentConfig[] = [];
  for (let i = 1; i <= count; i++) {
    demoAgents.push({ id: `agent-${i}` });
  }

  if (mode === "hierarchical") {
    const hierarchicalAgents: AgentConfig[] = [
      {
        id: "master",
        children: demoAgents.slice(1).map((a) => ({ id: a.id })),
      },
      ...(depth > 1 ? demoAgents.slice(1) : []),
    ];

    await swarm({ agents: hierarchicalAgents, coordination: mode });
  } else {
    await swarm({ agents: demoAgents, coordination: mode });
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
