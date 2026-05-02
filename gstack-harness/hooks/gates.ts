#!/usr/bin/env bun
/**
 * Security Gates - Fail-closed tool safety guards
 * 
 * Usage:
 *   bun run src/runtime/hooks/gates.ts --test
 *   bun run src/runtime/hooks/gates.ts --check-tool <name>
 *   bun run src/runtime/hooks/gates.ts --check-result <json>
 *   bun run src/runtime/hooks/gates.ts --list-tools
 *   bun run src/runtime/hooks/gates.ts --help
 * 
 * Security Model:
 * - Fail-closed: tools NOT in whitelist are DENIED by default
 * - Tool whitelist: configurable list of allowed tools
 * - Serial vs Parallel classification for concurrency safety
 * - PreToolUse gate: validates tool is allowed before execution
 * - PostToolUse gate: validates result is safe after execution
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Security Gates - Fail-closed tool safety guards

/**
 * Tool concurrency classification
 * - serial: tools that should not run concurrently (stateful, rate-limited)
 * - parallel: tools that are safe to run concurrently (read-only, idempotent)
 */
export type ToolConcurrency = "serial" | "parallel";

/**
 * Gate check result
 */
export interface GateResult {
  allowed: boolean;
  reason: string;
  tool_name?: string;
  classification?: ToolConcurrency;
  blocked?: boolean;
}

/**
 * Tool definition with security metadata
 */
export interface ToolDefinition {
  name: string;
  concurrency: ToolConcurrency;
  description: string;
  unsafe?: boolean; // tools marked unsafe require extra validation
}

/**
 * Tool whitelist configuration
 */
export interface WhitelistConfig {
  serial_tools: string[];
  parallel_tools: string[];
  denied_tools: string[]; // explicitly denied (fail-closed default)
  unsafe_tools: string[]; // tools requiring extra PostToolUse validation
}

/**
 * Tool input from Claude Code hook system
 */
export interface ToolInput {
  tool_name: string;
  args?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Tool result from execution
 */
export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  [key: string]: unknown;
}

// ============================================================================
// Default Tool Whitelist
// ============================================================================

const DEFAULT_WHITELIST: WhitelistConfig = {
  parallel_tools: [
    "Read",
    "Glob",
    "Grep",
    "Lookup",
    "lsp_symbols",
    "lsp_goto_definition",
    "lsp_find_references",
    "lsp_diagnostics",
    "webfetch",
    "websearch",
    "session_list",
    "session_read",
    "session_info",
  ],

  serial_tools: [
    "Bash",
    "Edit",
    "Write",
    "MultiEdit",
    "NotebookEdit",
    "Task",
    "AskUserQuestion",
    "Agent",
  ],

  denied_tools: [
    "Write_to_Clipboard",
    "Read_from_Sandbox",
    "Execute_at_Location",
    "Install_packages",
  ],

  unsafe_tools: [
    "Bash",
    "Write",
    "Edit",
    "MultiEdit",
  ],
};

// ============================================================================
// Security Gates Implementation
// ============================================================================

export class SecurityGates {
  private whitelist: WhitelistConfig;
  private whitelistPath: string;

  constructor(whitelistPath?: string) {
    this.whitelistPath = whitelistPath || join(process.cwd(), ".gstack-harness", "gates-whitelist.json");
    this.whitelist = this.loadWhitelist();
  }

  /**
   * Load whitelist from disk or use default
   */
  private loadWhitelist(): WhitelistConfig {
    if (this.whitelistPath && existsSync(this.whitelistPath)) {
      try {
        const content = readFileSync(this.whitelistPath, "utf-8");
        return { ...DEFAULT_WHITELIST, ...JSON.parse(content) };
      } catch {
        return DEFAULT_WHITELIST;
      }
    }
    return DEFAULT_WHITELIST;
  }

  /**
   * Check if a tool is in the whitelist
   */
isToolAllowed(toolName: string): boolean {
    return (
      this.toolInList(this.whitelist.parallel_tools, toolName) ||
      this.toolInList(this.whitelist.serial_tools, toolName)
    );
  }

  getToolClassification(toolName: string): ToolConcurrency | null {
    if (this.toolInList(this.whitelist.parallel_tools, toolName)) {
      return "parallel";
    }
    if (this.toolInList(this.whitelist.serial_tools, toolName)) {
      return "serial";
    }
    return null;
  }

  /**
   * Check if tool requires extra validation (PostToolUse)
   */
isUnsafeTool(toolName: string): boolean {
    const normalized = this.normalizeToolName(toolName);
    return this.whitelist.unsafe_tools.some(t => this.normalizeToolName(t) === normalized);
  }

  private toolInList(list: string[], toolName: string): boolean {
    const normalized = this.normalizeToolName(toolName);
    return list.some(t => this.normalizeToolName(t) === normalized);
  }

  /**
   * Normalize tool name (lowercase, trim)
   */
  private normalizeToolName(name: string): string {
    return name.toLowerCase().trim();
  }

  /**
   * PreToolUse gate: Check if tool is allowed to execute
   * Fail-closed: denies any tool not explicitly in whitelist
   */
  preToolUse(toolInput: ToolInput): GateResult {
    const toolName = toolInput.tool_name;
    
    if (!toolName) {
      return {
        allowed: false,
        reason: "No tool name provided",
        blocked: true,
      };
    }

    // Check explicitly denied tools first
    if (this.toolInList(this.whitelist.denied_tools, toolName)) {
      return {
        allowed: false,
        reason: `Tool '${toolName}' is explicitly denied`,
        tool_name: toolName,
        blocked: true,
      };
    }

    // Fail-closed: if not in whitelist, deny
    if (!this.isToolAllowed(toolName)) {
      return {
        allowed: false,
        reason: `Tool '${toolName}' is not in the approved whitelist`,
        tool_name: toolName,
        blocked: true,
      };
    }

    // Tool is allowed - return classification info
    const classification = this.getToolClassification(toolName);
    const unsafe = this.isUnsafeTool(toolName);

    return {
      allowed: true,
      reason: unsafe 
        ? `Tool '${toolName}' approved (requires PostToolUse validation)` 
        : `Tool '${toolName}' approved`,
      tool_name: toolName,
      classification: classification || "parallel", // default to parallel if unknown
      blocked: false,
    };
  }

  /**
   * PostToolUse gate: Check if tool result is safe
   * Validates output for potential security issues
   */
  postToolUse(toolInput: ToolInput, result: ToolResult): GateResult {
    const toolName = toolInput.tool_name;

    // If tool wasn't PreToolUse approved, reject the result
    if (!this.isToolAllowed(toolName)) {
      return {
        allowed: false,
        reason: `PostToolUse check failed: tool '${toolName}' was not PreToolUse approved`,
        tool_name: toolName,
        blocked: true,
      };
    }

    // Check for error outputs that might indicate issues
    if (result.error && !result.success) {
      // Some errors are expected (e.g., file not found)
      const isExpectedError = this.isExpectedError(result.error);
      if (!isExpectedError) {
        return {
          allowed: false,
          reason: `Tool '${toolName}' produced an unexpected error: ${result.error}`,
          tool_name: toolName,
          blocked: true,
        };
      }
    }

    // Check output for potential sensitive data exfiltration
    if (result.output && this.containsSuspiciousPattern(result.output)) {
      return {
        allowed: false,
        reason: `Tool '${toolName}' output contains suspicious patterns`,
        tool_name: toolName,
        blocked: true,
      };
    }

    return {
      allowed: true,
      reason: `Tool '${toolName}' result is safe`,
      tool_name: toolName,
      blocked: false,
    };
  }

  /**
   * Check if error is an expected/acceptable error
   */
  private isExpectedError(error: string): boolean {
    const expectedErrors = [
      "not found",
      "does not exist",
      "no such file",
      "permission denied",
      "ENOENT",
      "EACCES",
    ];
    const lowerError = error.toLowerCase();
    return expectedErrors.some(e => lowerError.includes(e));
  }

  /**
   * Check output for suspicious patterns that might indicate security issues
   */
  private containsSuspiciousPattern(output: string): boolean {
    // Check for potential credential leakage patterns
    const suspiciousPatterns = [
      /password\s*=/i,
      /api[_-]?key\s*=/i,
      /secret\s*=/i,
      /token\s*=/i,
      /bearer\s+/i,
      /-----begin\s+(rsa|dsa|ec|openssh)\s+private\s+key-----/i,
      /sk-[a-zA-Z0-9]{20,}/, // OpenAI API key pattern
    ];
    return suspiciousPatterns.some(pattern => pattern.test(output));
  }

  /**
   * Get current whitelist configuration
   */
  getWhitelist(): WhitelistConfig {
    return { ...this.whitelist };
  }

  /**
   * List all whitelisted tools with their classifications
   */
  listTools(): ToolDefinition[] {
    const tools: ToolDefinition[] = [];

    for (const name of this.whitelist.parallel_tools) {
      tools.push({
        name,
        concurrency: "parallel",
        description: "Read-only or idempotent operation",
      });
    }

    for (const name of this.whitelist.serial_tools) {
      const isUnsafe = this.whitelist.unsafe_tools.includes(name);
      tools.push({
        name,
        concurrency: "serial",
        description: isUnsafe ? "Stateful operation (unsafe)" : "Stateful operation",
        unsafe: isUnsafe,
      });
    }

    return tools;
  }
}

// ============================================================================
// Default Global Instance
// ============================================================================

const globalGates = new SecurityGates();

// ============================================================================
// CLI Interface
// ============================================================================

interface CliArgs {
  test?: boolean;
  checkTool?: string;
  checkResult?: string;
  listTools?: boolean;
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--test") {
      args.test = true;
    } else if (arg === "--check-tool") {
      args.checkTool = argv[++i];
    } else if (arg === "--check-result") {
      args.checkResult = argv[++i];
    } else if (arg === "--list-tools") {
      args.listTools = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
🔒 Security Gates - Fail-Closed Tool Safety Guards

Usage:
  bun run src/runtime/hooks/gates.ts --test
  bun run src/runtime/hooks/gates.ts --check-tool <name>
  bun run src/runtime/hooks/gates.ts --check-result <json>
  bun run src/runtime/hooks/gates.ts --list-tools
  bun run src/runtime/hooks/gates.ts --help

Commands:
  --test              Run built-in gate tests
  --check-tool <name> Check if a tool is allowed (PreToolUse gate)
  --check-result <json> Check tool result safety (PostToolUse gate)
  --list-tools        List all whitelisted tools
  --help, -h         Show this help message

Security Model:
  - Fail-closed: tools NOT in whitelist are DENIED by default
  - Serial tools: should not run concurrently (Bash, Edit, Write, etc.)
  - Parallel tools: safe to run concurrently (Read, Glob, Grep, etc.)
  - PreToolUse gate: validates tool BEFORE execution
  - PostToolUse gate: validates result AFTER execution

Examples:
  # Check if Bash is allowed
  bun run src/runtime/hooks/gates.ts --check-tool Bash

  # Check if a custom tool is allowed
  bun run src/runtime/hooks/gates.ts --check-tool MyCustomTool

  # List all whitelisted tools
  bun run src/runtime/hooks/gates.ts --list-tools

  # Run tests
  bun run src/runtime/hooks/gates.ts --test
`);
}

async function runTests(): Promise<void> {
  console.log("\n🧪 Running Security Gates Tests...\n");

  const gates = new SecurityGates();
  const tests = [
    { name: "PreToolUse: whitelisted serial tool allowed", fn: () => testPreToolSerialAllowed(gates) },
    { name: "PreToolUse: whitelisted parallel tool allowed", fn: () => testPreToolParallelAllowed(gates) },
    { name: "PreToolUse: unknown tool denied (fail-closed)", fn: () => testPreToolUnknownDenied(gates) },
    { name: "PreToolUse: denied tool explicitly denied", fn: () => testPreToolDeniedExplicit(gates) },
    { name: "PreToolUse: no tool name denied", fn: () => testPreToolNoToolName(gates) },
    { name: "PostToolUse: successful result allowed", fn: () => testPostToolSuccessAllowed(gates) },
    { name: "PostToolUse: error result allowed if expected", fn: () => testPostToolErrorExpected(gates) },
    { name: "PostToolUse: error result blocked if unexpected", fn: () => testPostToolErrorUnexpected(gates) },
    { name: "PostToolUse: suspicious output blocked", fn: () => testPostToolSuspiciousOutput(gates) },
    { name: "PostToolUse: tool not PreToolUse approved blocked", fn: () => testPostToolNotApproved(gates) },
    { name: "isUnsafeTool: identifies unsafe tools", fn: () => testIsUnsafeTool(gates) },
    { name: "listTools: returns all whitelisted tools", fn: () => testListTools(gates) },
    { name: "getToolClassification: returns correct classification", fn: () => testClassification(gates) },
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

// ============================================================================
// Test Functions
// ============================================================================

async function testPreToolSerialAllowed(gates: SecurityGates): Promise<void> {
  const result = gates.preToolUse({ tool_name: "Bash" });
  if (!result.allowed) throw new Error("Bash should be allowed");
  if (result.classification !== "serial") throw new Error("Bash should be serial");
}

async function testPreToolParallelAllowed(gates: SecurityGates): Promise<void> {
  const result = gates.preToolUse({ tool_name: "Read" });
  if (!result.allowed) throw new Error("Read should be allowed");
  if (result.classification !== "parallel") throw new Error("Read should be parallel");
}

async function testPreToolUnknownDenied(gates: SecurityGates): Promise<void> {
  const result = gates.preToolUse({ tool_name: "UnknownTool" });
  if (result.allowed) throw new Error("UnknownTool should be denied (fail-closed)");
  if (!result.blocked) throw new Error("Should be blocked");
}

async function testPreToolDeniedExplicit(gates: SecurityGates): Promise<void> {
  const result = gates.preToolUse({ tool_name: "Write_to_Clipboard" });
  if (result.allowed) throw new Error("Write_to_Clipboard should be denied");
  if (!result.reason.includes("explicitly denied")) throw new Error("Should mention explicitly denied");
}

async function testPreToolNoToolName(gates: SecurityGates): Promise<void> {
  const result = gates.preToolUse({ tool_name: "" });
  if (result.allowed) throw new Error("Empty tool name should be denied");
  if (!result.reason.includes("No tool name")) throw new Error("Should mention no tool name");
}

async function testPostToolSuccessAllowed(gates: SecurityGates): Promise<void> {
  const result = gates.postToolUse(
    { tool_name: "Read", args: {} },
    { success: true, output: "file contents" }
  );
  if (!result.allowed) throw new Error("Successful Read should be allowed");
}

async function testPostToolErrorExpected(gates: SecurityGates): Promise<void> {
  const result = gates.postToolUse(
    { tool_name: "Bash", args: {} },
    { success: false, error: "file not found" }
  );
  if (!result.allowed) throw new Error("Expected error should be allowed");
}

async function testPostToolErrorUnexpected(gates: SecurityGates): Promise<void> {
  const result = gates.postToolUse(
    { tool_name: "Bash", args: {} },
    { success: false, error: "rm: cannot remove /system: Operation not permitted" }
  );
  if (result.allowed) throw new Error("Unexpected error should be blocked");
}

async function testPostToolSuspiciousOutput(gates: SecurityGates): Promise<void> {
  const result = gates.postToolUse(
    { tool_name: "Bash", args: {} },
    { success: true, output: "password=supersecret123" }
  );
  if (result.allowed) throw new Error("Output with password should be blocked");
}

async function testPostToolNotApproved(gates: SecurityGates): Promise<void> {
  const result = gates.postToolUse(
    { tool_name: "UnknownTool", args: {} },
    { success: true, output: "data" }
  );
  if (result.allowed) throw new Error("Tool not PreToolUse approved should be blocked");
}

async function testIsUnsafeTool(gates: SecurityGates): Promise<void> {
  if (!gates.isUnsafeTool("Bash")) throw new Error("Bash should be unsafe");
  if (!gates.isUnsafeTool("Write")) throw new Error("Write should be unsafe");
  if (gates.isUnsafeTool("Read")) throw new Error("Read should not be unsafe");
}

async function testListTools(gates: SecurityGates): Promise<void> {
  const tools = gates.listTools();
  if (tools.length === 0) throw new Error("Should have some tools");
  if (!tools.find(t => t.name === "Bash")) throw new Error("Should include Bash");
  if (!tools.find(t => t.name === "Read")) throw new Error("Should include Read");
}

async function testClassification(gates: SecurityGates): Promise<void> {
  if (gates.getToolClassification("Bash") !== "serial") throw new Error("Bash should be serial");
  if (gates.getToolClassification("Read") !== "parallel") throw new Error("Read should be parallel");
  if (gates.getToolClassification("Unknown") !== null) throw new Error("Unknown should be null");
}

// ============================================================================
// Main Entry Point
// ============================================================================

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

  if (args.listTools) {
    const gates = globalGates;
    const tools = gates.listTools();
    console.log("\n📋 Whitelisted Tools:\n");
    console.log("  SERIAL (should not run concurrently):");
    for (const tool of tools.filter(t => t.concurrency === "serial")) {
      console.log(`    - ${tool.name}${tool.unsafe ? " ⚠️" : ""}`);
    }
    console.log("\n  PARALLEL (safe to run concurrently):");
    for (const tool of tools.filter(t => t.concurrency === "parallel")) {
      console.log(`    - ${tool.name}`);
    }
    console.log();
    return;
  }

  if (args.checkTool) {
    const result = globalGates.preToolUse({ tool_name: args.checkTool });
    console.log(`\n🔍 PreToolUse Gate Check for '${args.checkTool}':`);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (args.checkResult) {
    try {
      const { toolInput, result } = JSON.parse(args.checkResult);
      const gateResult = globalGates.postToolUse(toolInput, result);
      console.log(`\n🔍 PostToolUse Gate Check:`);
      console.log(JSON.stringify(gateResult, null, 2));
    } catch (err) {
      console.error("❌ Invalid JSON. Expected: {\"toolInput\":{...},\"result\":{...}}");
      process.exit(1);
    }
    return;
  }

  printHelp();
}

// ============================================================================
// Exports
// ============================================================================

export { globalGates, DEFAULT_WHITELIST };

// ============================================================================
// Main
// ============================================================================

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
