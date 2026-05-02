#!/usr/bin/env bun
/**
 * Task Manager - Task lifecycle management with Memory layer persistence
 *
 * Usage:
 *   bun run src/runtime/task.ts --create --skill <name> [--arg key=value]
 *   bun run src/runtime/task.ts --run <task_id>
 *   bun run src/runtime/task.ts --status <task_id>
 *   bun run src/runtime/task.ts --cancel <task_id>
 *   bun run src/runtime/task.ts --list
 *   bun run src/runtime/task.ts --help
 *
 * Task Lifecycle:
 *   create(skill_name, args) → run(task_id) → status(task_id) → cancel(task_id)
 *
 * Storage: $CWD/.gstack-harness/tasks/
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface Step {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "failed";
  started_at?: string;
  completed_at?: string;
  result?: {
    stdout?: string;
    stderr?: string;
    exit_code?: number;
  };
}

interface Task {
  id: string; // Format: task_<timestamp>_<random>
  skill_name: string;
  args: Record<string, string>;
  status: "pending" | "running" | "success" | "failed";
  steps: Step[];
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
}

interface CliArgs {
  create?: boolean;
  run?: string;     // task_id
  status?: string;  // task_id
  cancel?: string;  // task_id
  list?: boolean;
  help?: boolean;
  skill?: string;
  arg?: string[];
}

// ============================================================================
// Storage
// ============================================================================

function getTaskDir(): string {
  return join(process.cwd(), ".gstack-harness", "tasks");
}

function getTaskFile(taskId: string): string {
  return join(getTaskDir(), `${taskId}.json`);
}

function ensureTaskDir(): void {
  const dir = getTaskDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
}

function loadTask(taskId: string): Task | null {
  const filePath = getTaskFile(taskId);
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as Task;
  } catch {
    return null;
  }
}

function saveTask(task: Task): void {
  ensureTaskDir();
  const filePath = getTaskFile(task.id);
  writeFileSync(filePath, JSON.stringify(task, null, 2));
}

function loadAllTasks(): Task[] {
  const dir = getTaskDir();
  const tasks: Task[] = [];

  try {
    const files = readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = readFileSync(join(dir, file), "utf-8");
        const task = JSON.parse(content) as Task;
        tasks.push(task);
      } catch {
        // Skip malformed files
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ============================================================================
// ID Generation
// ============================================================================

function generateTaskId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  return `task_${timestamp}_${random}`;
}

function generateStepId(taskId: string, stepIndex: number): string {
  const random = Math.random().toString(36).slice(2, 6);
  return `${taskId}_step${stepIndex}_${random}`;
}

// ============================================================================
// Task Operations
// ============================================================================

function createTask(skillName: string, args: Record<string, string>): Task {
  const now = new Date().toISOString();
  const task: Task = {
    id: generateTaskId(),
    skill_name: skillName,
    args,
    status: "pending",
    steps: [],
    created_at: now,
    updated_at: now,
  };

  saveTask(task);
  return task;
}

/**
 * Run a task - executes the skill steps
 */
async function runTask(taskId: string): Promise<Task | null> {
  const task = loadTask(taskId);
  if (!task) {
    console.error(`❌ Task '${taskId}' not found`);
    return null;
  }

  if (task.status === "running") {
    console.error(`❌ Task '${taskId}' is already running`);
    return task;
  }

  if (task.status === "success") {
    console.error(`❌ Task '${taskId}' already completed successfully`);
    return task;
  }

  if (task.status === "failed") {
    console.error(`❌ Task '${taskId}' already failed`);
    return task;
  }

  // Update status to running
  task.status = "running";
  task.updated_at = new Date().toISOString();
  saveTask(task);

  // Find the skill file
  const { findSkillFile } = await import("./skill-runner.ts");
  const skillFile = findSkillFile(task.skill_name);

  if (!skillFile) {
    task.status = "failed";
    task.updated_at = new Date().toISOString();
    saveTask(task);
    console.error(`❌ Skill '${task.skill_name}' not found`);
    return task;
  }

  // Parse the skill
  const { parseSkill, extractBashCommands } = await import("./skill-runner.ts");
  const skill = parseSkill(skillFile);

  if (!skill || !skill.execution) {
    task.status = "failed";
    task.updated_at = new Date().toISOString();
    saveTask(task);
    console.error(`❌ Failed to parse skill '${task.skill_name}'`);
    return task;
  }

  // Extract and execute bash commands as steps
  const commands = extractBashCommands(skill.execution);

  if (commands.length === 0) {
    task.status = "success";
    task.updated_at = new Date().toISOString();
    saveTask(task);
    console.log(`ℹ️  No executable commands in skill '${task.skill_name}'`);
    return task;
  }

  // Initialize steps
  task.steps = commands.map((cmd, index) => ({
    id: generateStepId(task.id, index),
    name: cmd.slice(0, 60) + (cmd.length > 60 ? "..." : ""),
    status: "pending" as const,
  }));
  saveTask(task);

  // Execute each step
  const { executeBashWithOptions } = await import("./executor.ts");

  for (let i = 0; i < commands.length; i++) {
    const step = task.steps[i];

    // Check if cancelled
    const currentTask = loadTask(task.id);
    if (!currentTask || currentTask.status === "failed" && currentTask.cancelled_at) {
      console.log(`\n⚠️  Task was cancelled`);
      break;
    }

    // Mark step as running
    step.status = "running";
    step.started_at = new Date().toISOString();
    saveTask(task);

    console.log(`\n📍 Step ${i + 1}/${commands.length}: ${step.name}`);

    // Execute the command
    const result = await executeBashWithOptions(commands[i], {
      env: Object.fromEntries(
        Object.entries(task.args).map(([k, v]) => [`ARG_${k.toUpperCase().replace(/-/g, "_")}`, v])
      ),
    });

    step.result = {
      stdout: result.stdout,
      stderr: result.stderr,
      exit_code: result.exitCode,
    };
    step.completed_at = new Date().toISOString();
    step.status = result.success ? "success" : "failed";
    saveTask(task);

    if (result.success) {
      console.log(`   ✅ Exit: ${result.exitCode}`);
    } else {
      console.log(`   ❌ Exit: ${result.exitCode}`);
      if (result.stderr) {
        console.log(`   📤 Stderr: ${result.stderr.slice(0, 200)}`);
      }
      // Continue on failure but mark task as failed
    }
  }

  // Update final task status
  const finalTask = loadTask(task.id)!;
  const allSuccess = finalTask.steps.every((s) => s.status === "success");
  const anyFailed = finalTask.steps.some((s) => s.status === "failed");

  if (allSuccess) {
    finalTask.status = "success";
  } else if (anyFailed) {
    finalTask.status = "failed";
  } else {
    finalTask.status = "running";
  }
  finalTask.updated_at = new Date().toISOString();
  saveTask(finalTask);

  const successCount = finalTask.steps.filter((s) => s.status === "success").length;
  const failCount = finalTask.steps.filter((s) => s.status === "failed").length;
  console.log(`\n📊 Execution complete: ${successCount} succeeded, ${failCount} failed`);

  return finalTask;
}

/**
 * Get task status
 */
function getTaskStatus(taskId: string): Task | null {
  return loadTask(taskId);
}

/**
 * Cancel a running task
 */
function cancelTask(taskId: string): Task | null {
  const task = loadTask(taskId);
  if (!task) {
    console.error(`❌ Task '${taskId}' not found`);
    return null;
  }

  if (task.status === "success") {
    console.error(`❌ Cannot cancel a completed task`);
    return task;
  }

  if (task.status === "failed" && task.cancelled_at) {
    console.error(`❌ Task is already cancelled`);
    return task;
  }

  task.status = "failed";
  task.cancelled_at = new Date().toISOString();
  task.updated_at = new Date().toISOString();
  saveTask(task);

  return task;
}

// ============================================================================
// CLI
// ============================================================================

function parseArgs(): CliArgs {
  const args: CliArgs = { arg: [] };
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--create") {
      args.create = true;
    } else if (arg === "--run" && argv[i + 1]) {
      args.run = argv[++i];
    } else if (arg === "--status" && argv[i + 1]) {
      args.status = argv[++i];
    } else if (arg === "--cancel" && argv[i + 1]) {
      args.cancel = argv[++i];
    } else if (arg === "--list" || arg === "-l") {
      args.list = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--skill" && argv[i + 1]) {
      args.skill = argv[++i];
    } else if (arg === "--arg" || arg === "-a") {
      if (argv[i + 1]?.includes("=")) {
        args.arg!.push(argv[++i]);
      }
    } else if (arg.startsWith("--")) {
      // Handle --key=value format
      const key = arg.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      if (key !== "create" && key !== "list" && key !== "help") {
        args.arg!.push(`${key}=${value}`);
      }
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Task Manager - Task lifecycle management

Usage:
  bun run src/runtime/task.ts --create --skill <name> [--arg key=value]
  bun run src/runtime/task.ts --run <task_id>
  bun run src/runtime/task.ts --status <task_id>
  bun run src/runtime/task.ts --cancel <task_id>
  bun run src/runtime/task.ts --list
  bun run src/runtime/task.ts --help

Commands:
  --create              Create a new task
  --run <task_id>      Run a task (execute its steps)
  --status <task_id>    Get task status
  --cancel <task_id>   Cancel a running task
  --list, -l           List all tasks

Options:
  --skill <name>       Skill name for --create
  --arg <key=value>    Arguments for task (can be repeated, or use --key=value)

Task ID Format:
  task_<timestamp>_<random>

Task Lifecycle:
  create(skill_name, args) → run(task_id) → status(task_id) → cancel(task_id)

Storage: $CWD/.gstack-harness/tasks/

Examples:
  # Create a task
  bun run src/runtime/task.ts --create --skill investigate --arg repo=myrepo --arg branch=main

  # Run the task
  bun run src/runtime/task.ts --run task_1234567890_abc123

  # Check status
  bun run src/runtime/task.ts --status task_1234567890_abc123

  # Cancel if running
  bun run src/runtime/task.ts --cancel task_1234567890_abc123

  # List all tasks
  bun run src/runtime/task.ts --list
`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  // --list: Show all tasks
  if (args.list) {
    const tasks = loadAllTasks();
    if (tasks.length === 0) {
      console.log("No tasks found");
      return;
    }

    console.log(`Total tasks: ${tasks.length}\n`);
    for (const task of tasks) {
      const statusIcon = task.status === "success" ? "✅" : task.status === "failed" ? "❌" : task.status === "running" ? "🔄" : "⏳";
      const date = new Date(task.created_at).toLocaleString();
      console.log(`${statusIcon} ${task.id}`);
      console.log(`   Skill: ${task.skill_name}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Created: ${date}`);
      if (task.cancelled_at) {
        console.log(`   Cancelled: ${new Date(task.cancelled_at).toLocaleString()}`);
      }
      console.log();
    }
    return;
  }

  // --create: Create a new task
  if (args.create) {
    if (!args.skill) {
      console.error("❌ Error: --skill is required for --create");
      process.exit(1);
    }

    // Parse args into key-value pairs
    const taskArgs: Record<string, string> = {};
    for (const a of args.arg || []) {
      const [key, value] = a.split("=");
      if (key && value !== undefined) {
        taskArgs[key] = value;
      }
    }

    const task = createTask(args.skill, taskArgs);
    console.log(`\n✅ Task created: ${task.id}`);
    console.log(`   Skill: ${task.skill_name}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
    if (Object.keys(taskArgs).length > 0) {
      console.log(`   Args: ${JSON.stringify(taskArgs)}`);
    }
    return;
  }

  // --run: Execute a task
  if (args.run) {
    console.log(`\n🚀 Running task: ${args.run}\n`);
    const task = await runTask(args.run);
    if (task) {
      console.log(`\n📋 Final status: ${task.status}`);
    }
    return;
  }

  // --status: Get task status
  if (args.status) {
    const task = getTaskStatus(args.status);
    if (!task) {
      console.error(`❌ Task '${args.status}' not found`);
      process.exit(1);
    }

    console.log(`\n📋 Task: ${task.id}`);
    console.log(`   Skill: ${task.skill_name}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
    console.log(`   Updated: ${new Date(task.updated_at).toLocaleString()}`);
    if (task.cancelled_at) {
      console.log(`   Cancelled: ${new Date(task.cancelled_at).toLocaleString()}`);
    }

    if (task.steps.length > 0) {
      console.log(`\n   Steps:`);
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];
        const icon = step.status === "success" ? "✅" : step.status === "failed" ? "❌" : step.status === "running" ? "🔄" : "⏳";
        console.log(`   ${icon} ${i + 1}. ${step.name}`);
        if (step.started_at) {
          console.log(`      Started: ${new Date(step.started_at).toLocaleString()}`);
        }
        if (step.completed_at) {
          console.log(`      Completed: ${new Date(step.completed_at).toLocaleString()}`);
        }
        if (step.result?.exit_code !== undefined) {
          console.log(`      Exit code: ${step.result.exit_code}`);
        }
      }
    }

    if (Object.keys(task.args).length > 0) {
      console.log(`\n   Args: ${JSON.stringify(task.args)}`);
    }
    return;
  }

  // --cancel: Cancel a task
  if (args.cancel) {
    const task = cancelTask(args.cancel);
    if (task) {
      console.log(`\n✅ Task cancelled: ${task.id}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Cancelled: ${task.cancelled_at ? new Date(task.cancelled_at).toLocaleString() : "N/A"}`);
    }
    return;
  }

  // No recognized command
  console.error("❌ Error: No command specified");
  console.error("Run with --help for usage information");
  process.exit(1);
}

// ============================================================================
// Exports
// ============================================================================

export {
  createTask,
  loadTask,
  getTaskStatus,
  runTask,
  cancelTask,
  loadAllTasks,
  type Task,
  type Step,
};

// ============================================================================
// Main
// ============================================================================

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});