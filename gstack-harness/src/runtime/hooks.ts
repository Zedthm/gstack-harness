#!/usr/bin/env bun
/**
 * Hook Registry - Event-driven hook system for agentic harness
 * Usage:
 *   bun run src/runtime/hooks.ts --test
 *   bun run src/runtime/hooks.ts --trigger <name> --data <json>
 *   bun run src/runtime/hooks.ts --help
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface HookFn {
  name: string;
  fn: HookFunction;
  priority: number;
}

type HookFunction = (data: HookData) => HookResult | Promise<HookResult>;

interface HookData {
  // Common fields
  timestamp: number;
  source?: string;

  // Tool hooks
  tool_name?: string;
  args?: Record<string, unknown>;

  // Agent hooks
  agent_id?: string;
  task?: string;
  result?: unknown;

  // Error hooks
  error?: Error | string;
}

interface HookResult {
  allowed?: boolean;
  reason?: string;
  blocked?: boolean;
  data?: unknown;
}

interface CliArgs {
  test?: boolean;
  trigger?: string;
  data?: string;
  help?: boolean;
  register?: string;
  unregister?: string;
  list?: boolean;
}

// ============================================================================
// Hook Registry
// ============================================================================

class HookRegistry {
  private hooks: Map<string, HookFn[]> = new Map();
  private persistPath: string;

  constructor(persistPath?: string) {
    this.persistPath = persistPath || join(process.cwd(), ".gstack-harness", "hooks.json");
  }

  /**
   * Register a hook function for a given event name
   * @param name - Event name (e.g., "PreToolUse", "OnAgentStart")
   * @param hookFn - Hook function to execute
   * @param priority - Lower number = higher priority (executes first)
   */
  register(name: string, hookFn: HookFunction, priority: number = 100): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }

    const hooks = this.hooks.get(name)!;

    // Remove existing hook with same name to avoid duplicates
    const existingIndex = hooks.findIndex(h => h.name === hookFn.name || (hookFn as unknown as { name?: string }).name === h.name);
    if (existingIndex !== -1) {
      hooks.splice(existingIndex, 1);
    }

    hooks.push({
      name: hookFn.name || (hookFn as unknown as { name?: string }).name || `hook_${Date.now()}`,
      fn: hookFn,
      priority,
    });

    // Sort by priority (lower = first)
    hooks.sort((a, b) => a.priority - b.priority);

    this.persistHooks();
  }

  /**
   * Unregister all hooks for a given event name
   * @param name - Event name to unregister
   */
  unregister(name: string): void {
    this.hooks.delete(name);
    this.persistHooks();
  }

  /**
   * Unregister a specific hook by name
   * @param eventName - Event name
   * @param hookName - Specific hook name to remove
   */
  unregisterHook(eventName: string, hookName: string): boolean {
    const hooks = this.hooks.get(eventName);
    if (!hooks) return false;

    const index = hooks.findIndex(h => h.name === hookName);
    if (index === -1) return false;

    hooks.splice(index, 1);
    if (hooks.length === 0) {
      this.hooks.delete(eventName);
    }

    this.persistHooks();
    return true;
  }

  /**
   * Trigger all hooks for a given event name
   * @param name - Event name
   * @param data - Data to pass to hooks
   * @returns Combined result from all hooks (last non-undefined result)
   */
  async trigger(name: string, data: HookData): Promise<HookResult | HookResult[]> {
    const hooks = this.hooks.get(name);
    if (!hooks || hooks.length === 0) {
      return [];
    }

    const results: HookResult[] = [];

    for (const hook of hooks) {
      try {
        const result = await hook.fn(data);
        results.push(result);

        // If a hook blocks execution, stop the chain
        if (result.blocked || (result.allowed === false)) {
          break;
        }
      } catch (err) {
        results.push({
          allowed: false,
          reason: `Hook "${hook.name}" failed: ${err}`,
          blocked: true,
        });
        break;
      }
    }

    return results.length === 1 ? results[0] : results;
  }

  /**
   * Trigger hooks synchronously (for simple cases)
   */
  triggerSync(name: string, data: HookData): HookResult | HookResult[] {
    const hooks = this.hooks.get(name);
    if (!hooks || hooks.length === 0) {
      return [];
    }

    const results: HookResult[] = [];

    for (const hook of hooks) {
      try {
        const result = hook.fn(data) as HookResult;
        results.push(result);

        if (result.blocked || (result.allowed === false)) {
          break;
        }
      } catch (err) {
        results.push({
          allowed: false,
          reason: `Hook "${hook.name}" failed: ${err}`,
          blocked: true,
        });
        break;
      }
    }

    return results.length === 1 ? results[0] : results;
  }

  /**
   * List all registered hooks
   */
  list(): Map<string, HookFn[]> {
    return new Map(this.hooks);
  }

  /**
   * Get hooks for a specific event
   */
  getHooks(name: string): HookFn[] {
    return this.hooks.get(name) || [];
  }

  /**
   * Check if any hooks are registered for an event
   */
  hasHooks(name: string): boolean {
    const hooks = this.hooks.get(name);
    return hooks !== undefined && hooks.length > 0;
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
    this.persistHooks();
  }

  /**
   * Persist hooks to disk
   */
  private persistHooks(): void {
    try {
      const dir = join(process.cwd(), ".gstack-harness");
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const serialized: Record<string, Array<{ name: string; priority: number }>> = {};
      for (const [name, hooks] of this.hooks) {
        serialized[name] = hooks.map(h => ({ name: h.name, priority: h.priority }));
      }

      writeFileSync(this.persistPath, JSON.stringify(serialized, null, 2));
    } catch {
      // Ignore persist errors
    }
  }
}

// ============================================================================
// Default Global Registry
// ============================================================================

const globalRegistry = new HookRegistry();

// ============================================================================
// CLI Interface
// ============================================================================

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--test") {
      args.test = true;
    } else if (arg === "--trigger") {
      args.trigger = argv[++i];
    } else if (arg === "--data") {
      args.data = argv[++i];
    } else if (arg === "--register") {
      args.register = argv[++i];
    } else if (arg === "--unregister") {
      args.unregister = argv[++i];
    } else if (arg === "--list") {
      args.list = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Hook Registry - Agentic Harness Framework v2

Usage:
  bun run src/runtime/hooks.ts --test
  bun run src/runtime/hooks.ts --trigger <name> --data <json>
  bun run src/runtime/hooks.ts --list
  bun run src/runtime/hooks.ts --unregister <name>
  bun run src/runtime/hooks.ts --help

Commands:
  --test             Run built-in hook tests
  --trigger <name>   Trigger hooks for an event
  --data <json>      JSON data to pass to triggered hooks
  --register <name>  Register a test hook
  --unregister <name> Remove hooks for an event
  --list             List all registered hooks
  --help, -h         Show this help message

Hook Events:
  PreToolUse(tool_name, args)      - Before tool execution
  PostToolUse(tool_name, args, result) - After tool execution
  OnAgentStart(agent_id, task)     - Agent starts
  OnAgentEnd(agent_id, result)     - Agent ends
  OnError(agent_id, error)         - Error occurs

Examples:
  # Run tests
  bun run src/runtime/hooks.ts --test

  # List all hooks
  bun run src/runtime/hooks.ts --list

  # Trigger PreToolUse hook
  bun run src/runtime/hooks.ts --trigger PreToolUse --data '{"tool_name":"bash","args":{}}'
`);
}

async function runTests(): Promise<void> {
  console.log("\n🧪 Running Hook Registry Tests...\n");

  const tests = [
    { name: "Register and trigger hook", fn: testRegisterAndTrigger },
    { name: "Priority ordering", fn: testPriorityOrdering },
    { name: "Unregister hook", fn: testUnregister },
    { name: "Multiple hooks per event", fn: testMultipleHooks },
    { name: "Hook blocking", fn: testHookBlocking },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`  ✅ ${test.name}`);
      passed++;
    } catch (err) {
      console.log(`  ❌ ${test.name}: ${err}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

async function testRegisterAndTrigger(): Promise<void> {
  const registry = new HookRegistry();

  let called = false;
  registry.register("TestEvent", async () => {
    called = true;
    return { allowed: true };
  }, 100);

  await registry.trigger("TestEvent", { timestamp: Date.now() });

  if (!called) {
    throw new Error("Hook was not called");
  }
}

async function testPriorityOrdering(): Promise<void> {
  const registry = new HookRegistry();
  const order: string[] = [];

  registry.register("TestEvent", async () => {
    order.push("first");
    return { allowed: true };
  }, 200);

  registry.register("TestEvent", async () => {
    order.push("second");
    return { allowed: true };
  }, 100);

  await registry.trigger("TestEvent", { timestamp: Date.now() });

  if (order.join(",") !== "second,first") {
    throw new Error(`Expected order "second,first", got "${order.join(",")}"`);
  }
}

async function testUnregister(): Promise<void> {
  const registry = new HookRegistry();

  registry.register("TestEvent", async () => ({ allowed: true }), 100);

  if (!registry.hasHooks("TestEvent")) {
    throw new Error("Hook was not registered");
  }

  registry.unregister("TestEvent");

  if (registry.hasHooks("TestEvent")) {
    throw new Error("Hook was not unregistered");
  }
}

async function testMultipleHooks(): Promise<void> {
  const registry = new HookRegistry();
  let count = 0;

  registry.register("TestEvent", async () => { count++; return { allowed: true }; }, 100);
  registry.register("TestEvent", async () => { count++; return { allowed: true }; }, 100);
  registry.register("TestEvent", async () => { count++; return { allowed: true }; }, 100);

  await registry.trigger("TestEvent", { timestamp: Date.now() });

  if (count !== 3) {
    throw new Error(`Expected 3 calls, got ${count}`);
  }
}

async function testHookBlocking(): Promise<void> {
  const registry = new HookRegistry();

  registry.register("TestEvent", async () => {
    return { allowed: false, reason: "Blocked", blocked: true };
  }, 100);

  registry.register("TestEvent", async () => {
    throw new Error("Second hook should not be called");
  }, 200);

  const result = await registry.trigger("TestEvent", { timestamp: Date.now() }) as HookResult;

  if (result.allowed !== false) {
    throw new Error("Hook should have been blocked");
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  if (args.test) {
    await runTests();
    return;
  }

  if (args.list) {
    const hooks = globalRegistry.list();
    if (hooks.size === 0) {
      console.log("No hooks registered");
    } else {
      console.log("\n📋 Registered Hooks:");
      for (const [name, hookList] of hooks) {
        console.log(`\n  ${name} (${hookList.length} hook(s)):`);
        for (const hook of hookList) {
          console.log(`    - ${hook.name} (priority: ${hook.priority})`);
        }
      }
      console.log();
    }
    return;
  }

  if (args.trigger) {
    const data = args.data ? JSON.parse(args.data) : { timestamp: Date.now() };
    const result = await globalRegistry.trigger(args.trigger, data);
    console.log(`\n🔔 Triggered ${args.trigger}:`);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (args.unregister) {
    globalRegistry.unregister(args.unregister);
    console.log(`✅ Unregistered all hooks for: ${args.unregister}`);
    return;
  }

  printHelp();
}

// ============================================================================
// Exports
// ============================================================================

export {
  HookRegistry,
  globalRegistry,
  type HookFn,
  type HookFunction,
  type HookData,
  type HookResult,
};

// ============================================================================
// Main Entry Point
// ============================================================================

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});