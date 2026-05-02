#!/usr/bin/env bun
/**
 * Context Manager - Context building, injection, snapshot, and restoration
 * Usage:
 *   bun run src/runtime/context.ts --build --agent <id> --task <task>
 *   bun run src/runtime/context.ts --inject --skill <name>
 *   bun run src/runtime/context.ts --snapshot
 *   bun run src/runtime/context.ts --restore --file <path>
 *   bun run src/runtime/context.ts --help
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface RecentMemory {
  id: string;
  content: string;
  timestamp: number;
  relevance?: number;
}

interface ActiveTaskState {
  task_id: string;
  agent_id: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: number;
  metadata?: Record<string, string>;
}

interface SkillMetadata {
  name: string;
  description: string;
  triggers?: string[];
  location?: string;
}

interface UserPreferences {
  language?: string;
  timezone?: string;
  [key: string]: string | undefined;
}

interface ContextSnapshot {
  version: string;
  timestamp: number;
  recent_memories: RecentMemory[];
  active_task?: ActiveTaskState;
  skill_metadata?: SkillMetadata;
  user_preferences: UserPreferences;
  injected_skills: string[];
  raw?: string;
}

interface Context {
  recent_memories: RecentMemory[];
  active_task?: ActiveTaskState;
  skill_metadata?: SkillMetadata;
  user_preferences: UserPreferences;
  injected_skills: string[];
}

interface ContextBuildOptions {
  agent_id: string;
  task: string;
  memory_limit?: number;
}

interface CliArgs {
  build?: boolean;
  inject?: boolean;
  snapshot?: boolean;
  restore?: boolean;
  help?: boolean;
  agent?: string;
  task?: string;
  skill?: string;
  file?: string;
  memory_limit?: number;
}

// ============================================================================
// Memory Layer Integration (reads from ~/.gstack/memory/ or project .gstack/)
// ============================================================================

function findMemoryDir(): string {
  const localMemory = join(process.cwd(), ".gstack", "memory");
  if (existsSync(localMemory)) {
    return localMemory;
  }
  const globalMemory = join(homedir(), ".gstack", "memory");
  if (existsSync(globalMemory)) {
    return globalMemory;
  }
  return "";
}

function loadRecentMemories(limit: number = 10): RecentMemory[] {
  const memoryDir = findMemoryDir();
  if (!memoryDir) {
    return [];
  }

  try {
    const memories: RecentMemory[] = [];
    const files = require("fs").readdirSync(memoryDir);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = readFileSync(join(memoryDir, file), "utf-8");
        const memory = JSON.parse(content);
        if (memory.id && memory.content) {
          memories.push({
            id: memory.id,
            content: memory.content,
            timestamp: memory.timestamp || Date.now(),
            relevance: memory.relevance,
          });
        }
      } catch {
        // skip malformed files
      }
    }

    return memories
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  } catch {
    return [];
  }
}

// ============================================================================
// Skill Resolution
// ============================================================================

function findSkillFile(skillName: string): string | null {
  const { statSync } = require("fs");
  const searchPaths = [
    join(process.cwd(), "harness", "skills", `${skillName}.md`),
    join(process.cwd(), "harness", "skills", skillName, "SKILL.md"),
    join(process.cwd(), "harness", "skills", `${skillName.toLowerCase()}.md`),
    join(process.cwd(), "harness", "skills", skillName.toLowerCase(), "SKILL.md"),
  ];

  for (const path of searchPaths) {
    try {
      if (statSync(path).isFile()) {
        return path;
      }
    } catch {
      // continue
    }
  }
  return null;
}

function loadSkillMetadata(skillName: string): SkillMetadata | null {
  const skillFile = findSkillFile(skillName);
  if (!skillFile) return null;

  try {
    const content = readFileSync(skillFile, "utf-8");
    const metadata: SkillMetadata = { name: skillName, description: "" };

    if (content.startsWith("---")) {
      const endIndex = content.indexOf("---", 3);
      if (endIndex !== -1) {
        const frontmatter = content.slice(3, endIndex).trim();
        for (const line of frontmatter.split("\n")) {
          const colonIdx = line.indexOf(":");
          if (colonIdx === -1) continue;

          const key = line.slice(0, colonIdx).trim();
          const value = line.slice(colonIdx + 1).trim();

          if (key === "name") metadata.name = value;
          else if (key === "description") metadata.description = value;
          else if (key === "triggers") {
            metadata.triggers = value.replace(/[\[\]]/g, "").split(",").map((t: string) => t.trim());
          }
        }
      }
    }

    metadata.location = skillFile;
    return metadata;
  } catch {
    return null;
  }
}

// ============================================================================
// Context Building & Injection
// ============================================================================

function buildContext(options: ContextBuildOptions): Context {
  const { agent_id, task, memory_limit = 10 } = options;

  const recent_memories = loadRecentMemories(memory_limit);

  const active_task: ActiveTaskState = {
    task_id: task || "unknown",
    agent_id,
    status: "running",
    progress: 0,
    metadata: {},
  };

  const user_preferences: UserPreferences = {
    language: "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  return {
    recent_memories,
    active_task,
    user_preferences,
    injected_skills: [],
  };
}

function injectSkillContext(context: Context, skillName: string): Context {
  const skillMetadata = loadSkillMetadata(skillName);
  if (!skillMetadata) {
    console.warn(`⚠️  Skill '${skillName}' not found, skipping injection`);
    return context;
  }

  return {
    ...context,
    skill_metadata: skillMetadata,
    injected_skills: [...context.injected_skills, skillName],
  };
}

// ============================================================================
// Snapshot & Restore
// ============================================================================

function createSnapshot(context: Context): ContextSnapshot {
  return {
    version: "1.0",
    timestamp: Date.now(),
    recent_memories: context.recent_memories,
    active_task: context.active_task,
    skill_metadata: context.skill_metadata,
    user_preferences: context.user_preferences,
    injected_skills: context.injected_skills,
  };
}

function saveSnapshot(snapshot: ContextSnapshot, filePath?: string): string {
  const saveDir = join(process.cwd(), ".gstack", "context");
  const fileName = filePath || join(saveDir, `snapshot-${Date.now()}.json`);

  try {
    mkdirSync(dirname(fileName), { recursive: true });
    writeFileSync(fileName, JSON.stringify(snapshot, null, 2));
    return fileName;
  } catch (err) {
    throw new Error(`Failed to save snapshot: ${err}`);
  }
}

function loadSnapshot(filePath: string): ContextSnapshot {
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to load snapshot from '${filePath}': ${err}`);
  }
}

function restoreContext(snapshot: ContextSnapshot): Context {
  return {
    recent_memories: snapshot.recent_memories || [],
    active_task: snapshot.active_task,
    skill_metadata: snapshot.skill_metadata,
    user_preferences: snapshot.user_preferences || { language: "en" },
    injected_skills: snapshot.injected_skills || [],
  };
}

// ============================================================================
// CLI
// ============================================================================

const CONTEXT_FILE = join(process.cwd(), ".gstack", "context", "current.json");

function loadContextFromFile(): Context | null {
  try {
    if (existsSync(CONTEXT_FILE)) {
      const content = readFileSync(CONTEXT_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // ignore
  }
  return null;
}

function saveContextToFile(context: Context): void {
  try {
    mkdirSync(dirname(CONTEXT_FILE), { recursive: true });
    writeFileSync(CONTEXT_FILE, JSON.stringify(context, null, 2));
  } catch {
    // ignore
  }
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--build") {
      args.build = true;
    } else if (arg === "--inject") {
      args.inject = true;
    } else if (arg === "--snapshot") {
      args.snapshot = true;
    } else if (arg === "--restore") {
      args.restore = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--agent" && argv[i + 1]) {
      args.agent = argv[++i];
    } else if (arg === "--task" && argv[i + 1]) {
      args.task = argv[++i];
    } else if (arg === "--skill" && argv[i + 1]) {
      args.skill = argv[++i];
    } else if (arg === "--file" && argv[i + 1]) {
      args.file = argv[++i];
    } else if (arg === "--memory-limit" && argv[i + 1]) {
      args.memory_limit = parseInt(argv[++i], 10);
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Context Manager - Agentic Harness Framework v2

Usage:
  bun run src/runtime/context.ts --build --agent <id> --task <task>
  bun run src/runtime/context.ts --inject --skill <name>
  bun run src/runtime/context.ts --snapshot
  bun run src/runtime/context.ts --restore --file <path>
  bun run src/runtime/context.ts --help

Commands:
  --build              Build a new context for an agent/task
  --inject             Inject skill-related context into existing context
  --snapshot           Save current context snapshot
  --restore            Restore context from a snapshot file

Options:
  --agent <id>         Agent ID for context building
  --task <task>        Task description or ID
  --skill <name>       Skill name for context injection
  --file <path>        Path to snapshot file (for restore)
  --memory-limit <n>   Max recent memories to load (default: 10)
  --help, -h           Show this help message

Context Composition:
  - Recent memories (from memory layer)
  - Active task state
  - Skill metadata
  - User preferences
  - Injected skills list

Examples:
  # Build context for an agent working on a task
  bun run src/runtime/context.ts --build --agent agent-123 --task "review-pr"

  # Build with custom memory limit
  bun run src/runtime/context.ts --build --agent agent-123 --task "review-pr" --memory-limit 20

  # Inject skill context into existing context
  bun run src/runtime/context.ts --inject --skill investigate

  # Save snapshot to default location
  bun run src/runtime/context.ts --snapshot

  # Restore from a specific snapshot file
  bun run src/runtime/context.ts --restore --file .gstack/context/snapshot-1234567890.json
`);
}

let currentContext: Context | null = null;

async function main(): Promise<void> {
  const args = parseArgs();
  currentContext = loadContextFromFile();

  if (args.help) {
    printHelp();
    return;
  }

  // --build: Build new context
  if (args.build) {
    if (!args.agent) {
      console.error("❌ Error: --agent is required for --build");
      process.exit(1);
    }
    if (!args.task) {
      console.error("❌ Error: --task is required for --build");
      process.exit(1);
    }

    currentContext = buildContext({
      agent_id: args.agent!,
      task: args.task!,
      memory_limit: args.memory_limit,
    });
    saveContextToFile(currentContext);

    console.log("\n📋 Context Built:");
    console.log(`   Agent: ${args.agent}`);
    console.log(`   Task: ${args.task}`);
    console.log(`   Memories loaded: ${currentContext.recent_memories.length}`);
    console.log(`   Status: ${currentContext.active_task?.status}`);
    return;
  }

  // --inject: Inject skill context
  if (args.inject) {
    if (!args.skill) {
      console.error("❌ Error: --skill is required for --inject");
      process.exit(1);
    }

    if (!currentContext) {
      currentContext = buildContext({
        agent_id: "cli-default",
        task: "cli-inject",
        memory_limit: args.memory_limit,
      });
    }

    currentContext = injectSkillContext(currentContext!, args.skill!);
    saveContextToFile(currentContext);

    if (currentContext.skill_metadata) {
      console.log("\n✅ Skill Context Injected:");
      console.log(`   Skill: ${currentContext.skill_metadata.name}`);
      console.log(`   Description: ${currentContext.skill_metadata.description}`);
      console.log(`   Location: ${currentContext.skill_metadata.location}`);
      console.log(`   New skills in context: ${currentContext.injected_skills.join(", ")}`);
    }
    return;
  }

  // --snapshot: Save current context
  if (args.snapshot) {
    if (!currentContext) {
      console.error("❌ Error: No context to snapshot. Use --build first.");
      process.exit(1);
    }

    const snapshot = createSnapshot(currentContext!);
    const filePath = saveSnapshot(snapshot, args.file || undefined);

    console.log("\n📸 Context Snapshot Saved:");
    console.log(`   Path: ${filePath}`);
    console.log(`   Version: ${snapshot.version}`);
    console.log(`   Timestamp: ${new Date(snapshot.timestamp).toISOString()}`);
    console.log(`   Memories: ${snapshot.recent_memories.length}`);
    console.log(`   Injected skills: ${snapshot.injected_skills.join(", ") || "none"}`);
    return;
  }

  // --restore: Restore context from snapshot
  if (args.restore) {
    if (!args.file) {
      console.error("❌ Error: --file is required for --restore");
      process.exit(1);
    }

    if (!existsSync(args.file)) {
      console.error(`❌ Error: Snapshot file not found: ${args.file}`);
      process.exit(1);
    }

    const snapshot = loadSnapshot(args.file!);
    currentContext = restoreContext(snapshot);
    saveContextToFile(currentContext);

    console.log("\n♻️  Context Restored:");
    console.log(`   Version: ${snapshot.version}`);
    console.log(`   Timestamp: ${new Date(snapshot.timestamp).toISOString()}`);
    console.log(`   Memories: ${currentContext.recent_memories.length}`);
    console.log(`   Agent: ${currentContext.active_task?.agent_id || "unknown"}`);
    console.log(`   Task: ${currentContext.active_task?.task_id || "unknown"}`);
    console.log(`   Injected skills: ${currentContext.injected_skills.join(", ") || "none"}`);
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
  buildContext,
  injectSkillContext,
  createSnapshot,
  restoreContext,
  loadRecentMemories,
  loadSkillMetadata,
  saveSnapshot,
  loadSnapshot,
  type Context,
  type ContextSnapshot,
  type ContextBuildOptions,
  type RecentMemory,
  type ActiveTaskState,
  type SkillMetadata,
  type UserPreferences,
};

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});