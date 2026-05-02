#!/usr/bin/env bun
/**
 * Fork - Real process fork using Bun.spawn (not threads)
 *
 * Creates an independent child process with its own PID.
 * Supports IPC communication between parent and child.
 */

import { spawn } from "bun";

interface IpcMessage {
  type: "stdout" | "stderr" | "result";
  data: string;
  exitCode?: number;
}

interface ResultMessage extends IpcMessage {
  type: "result";
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function fork(options: ForkOptions): Promise<ForkResult> {
  const { agent_id, skill_name, args = {} } = options;

  return new Promise((resolve) => {
    let stdoutBuffer = "";
    let stderrBuffer = "";

    const childArgs = [
      "run",
      import.meta.path,
      "--agent",
      agent_id,
      "--skill",
      skill_name,
    ];

    for (const [key, value] of Object.entries(args)) {
      childArgs.push("--arg", `${key}=${value}`);
    }

    const child = spawn({
      cmd: ["bun", ...childArgs],
      env: {
        ...process.env,
        GSTACK_FORK_MODE: "child",
        GSTACK_AGENT_ID: agent_id,
        GSTACK_SKILL_NAME: skill_name,
      },
      stdout: "pipe",
      stderr: "pipe",
      ipc(message: unknown) {
        if (typeof message === "string") {
          try {
            const msg = JSON.parse(message) as IpcMessage;
            if (msg.type === "stdout") {
              stdoutBuffer += msg.data;
            } else if (msg.type === "stderr") {
              stderrBuffer += msg.data;
            } else if (msg.type === "result") {
              const result = msg as unknown as ResultMessage;
              resolve({
                pid: child.pid,
                exitCode: result.exitCode,
                stdout: stdoutBuffer,
                stderr: stderrBuffer,
              });
            }
          } catch {
            stdoutBuffer += message;
          }
        } else if (typeof message === "object" && message !== null) {
          const msg = message as IpcMessage;
          if (msg.type === "stdout") {
            stdoutBuffer += msg.data;
          } else if (msg.type === "stderr") {
            stderrBuffer += msg.data;
          } else if (msg.type === "result") {
            const result = msg as unknown as ResultMessage;
            resolve({
              pid: child.pid,
              exitCode: result.exitCode,
              stdout: stdoutBuffer,
              stderr: stderrBuffer,
            });
          }
        }
      },
    });

    child.stdout.pipeTo(
      new WritableStream({
        write(chunk) {
          stdoutBuffer += chunk;
        },
      })
    );

    child.stderr.pipeTo(
      new WritableStream({
        write(chunk) {
          stderrBuffer += chunk;
        },
      })
    );

    child.exited.then((exitCode: number) => {
      resolve({
        pid: child.pid,
        exitCode,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
      });
    });

    child.unref();
  });
}

async function executeChildSkill(): Promise<void> {
  const skill_name = process.env.GSTACK_SKILL_NAME || "";

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: unknown[]) => {
    const msg = args.map(String).join(" ");
    stdoutChunks.push(msg);
    originalLog(...args);
    process.send?.(JSON.stringify({ type: "stdout", data: msg + "\n" }));
  };

  console.error = (...args: unknown[]) => {
    const msg = args.map(String).join(" ");
    stderrChunks.push(msg);
    originalError(...args);
    process.send?.(JSON.stringify({ type: "stderr", data: msg + "\n" }));
  };

  try {
    const { findSkillFile, parseSkill, extractBashCommands } = await import("./skill-runner.ts");
    const skillFile = findSkillFile(skill_name);

    if (!skillFile) {
      throw new Error(`Skill '${skill_name}' not found`);
    }

    const skill = parseSkill(skillFile);
    if (!skill || !skill.execution) {
      throw new Error(`Failed to parse skill '${skill_name}'`);
    }

    const commands = extractBashCommands(skill.execution);
    let exitCode = 0;

    for (const command of commands) {
      const { executeBashWithOptions } = await import("./executor.ts");

      const env: Record<string, string> = {};
      const gstackArgs = (globalThis as unknown as Record<string, Record<string, string>>).__gstack_args__;
      if (gstackArgs) {
        for (const [key, value] of Object.entries(gstackArgs)) {
          env[`ARG_${key.toUpperCase().replace(/-/g, "_")}`] = value;
        }
      }

      const result = await executeBashWithOptions(command, { env });

      if (!result.success) {
        exitCode = result.exitCode;
        break;
      }
    }

    process.send?.(
      JSON.stringify({
        type: "result",
        exitCode,
        stdout: stdoutChunks.join("\n"),
        stderr: stderrChunks.join("\n"),
      })
    );

    process.exit(exitCode);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stderrChunks.push(`Error: ${errorMsg}`);

    process.send?.(
      JSON.stringify({
        type: "result",
        exitCode: 1,
        stdout: stdoutChunks.join("\n"),
        stderr: stderrChunks.join("\n"),
      })
    );

    process.exit(1);
  }
}

interface CliArgs {
  agent?: string;
  skill?: string;
  arg?: string[];
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = { arg: [] };
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--agent" && argv[i + 1]) {
      args.agent = argv[++i];
    } else if (arg === "--skill" && argv[i + 1]) {
      args.skill = argv[++i];
    } else if (arg === "--arg" && argv[i + 1]) {
      args.arg!.push(argv[++i]);
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Fork - Real process fork using Bun.spawn

Usage:
  bun run src/runtime/fork.ts --agent <id> --skill <name> [options]
  bun run src/runtime/fork.ts --help

Options:
  --agent <id>     Agent ID for this fork
  --skill <name>   Skill name to execute
  --arg <key=val>  Arguments to pass (can be repeated)

API:
  import { fork } from "./fork"
  const result = await fork({
    agent_id: "my-agent",
    skill_name: "investigate",
    args: { repo: "myrepo" }
  })
  // Returns: { pid, exitCode, stdout, stderr }

Examples:
  # CLI usage
  bun run src/runtime/fork.ts --agent test-agent --skill investigate --arg repo=gstack

  # API usage
  const result = await fork({
    agent_id: "agent-123",
    skill_name: "review",
    args: { branch: "main" }
  })
  console.log(result.pid, result.stdout)
`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.agent || !args.skill) {
    console.error("❌ Error: --agent and --skill are required");
    console.error("Run with --help for usage information");
    process.exit(1);
  }

  const argMap: Record<string, string> = {};
  for (const a of args.arg || []) {
    const [key, value] = a.split("=");
    if (key && value !== undefined) {
      argMap[key] = value;
    }
  }

  (globalThis as unknown as Record<string, Record<string, string>>).__gstack_args__ = argMap;

  await executeChildSkill();
}

export type { ForkOptions, ForkResult };

if (process.env.GSTACK_FORK_MODE === "child") {
  main().catch((err) => {
    console.error("❌ Child process error:", err);
    process.exit(1);
  });
} else if (import.meta.main) {
  const args = parseArgs();
  if (args.help) {
    printHelp();
  } else if (args.agent && args.skill) {
    const argMap: Record<string, string> = {};
    for (const a of args.arg || []) {
      const [key, value] = a.split("=");
      if (key && value !== undefined) {
        argMap[key] = value;
      }
    }

    fork({
      agent_id: args.agent,
      skill_name: args.skill,
      args: argMap,
    }).then((result) => {
      console.log("\n--- Fork Result ---");
      console.log(`PID: ${result.pid}`);
      console.log(`Exit Code: ${result.exitCode}`);
      if (result.stdout) {
        console.log(`\nStdout:\n${result.stdout}`);
      }
      if (result.stderr) {
        console.log(`\nStderr:\n${result.stderr}`);
      }
    });
  } else {
    printHelp();
  }
}