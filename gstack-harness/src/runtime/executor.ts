/**
 * Executor - Step execution engine using Bun.spawn
 * Supports bash commands with full stdout/stderr capture
 */

export type StepStatus = "pending" | "running" | "success" | "failed";

export interface StepResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ExecuteOptions {
  cwd?: string;
  env?: Record<string, string>;
  stopOnError?: boolean; // default: true
}

/**
 * Execute a bash command using Bun.spawn
 * @param command Shell command to execute
 * @returns Promise with stdout, stderr, and exitCode
 */
export async function executeBash(command: string): Promise<StepResult> {
  const proc = Bun.spawn(["sh", "-c", command], {
    env: { ...process.env },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
  const stderr = await proc.stderr.text();

  return {
    stdout,
    stderr,
    exitCode,
  };
}

/**
 * Execute a bash command with options
 * @param command Shell command to execute
 * @param options Execution options (cwd, env, stopOnError)
 * @returns Promise with stdout, stderr, exitCode, and success flag
 */
export async function executeBashWithOptions(
  command: string,
  options: ExecuteOptions = {}
): Promise<StepResult & { success: boolean }> {
  const { cwd, env = {}, stopOnError = true } = options;

  const proc = Bun.spawn(["sh", "-c", command], {
    cwd,
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
  const stderr = await proc.stderr.text();

  return {
    stdout,
    stderr,
    exitCode,
    success: exitCode === 0,
  };
}

/**
 * Step executor with status tracking
 */
export class StepExecutor {
  private status: StepStatus = "pending";

  getStatus(): StepStatus {
    return this.status;
  }

  /**
   * Execute a bash command and track status
   * @param command Shell command to execute
   * @param options Execution options
   * @returns Promise with step result
   */
  async execute(command: string, options: ExecuteOptions = {}): Promise<StepResult & { success: boolean }> {
    this.status = "running";

    try {
      const result = await executeBashWithOptions(command, options);

      if (result.success) {
        this.status = "success";
      } else {
        this.status = "failed";
      }

      return result;
    } catch (error) {
      this.status = "failed";
      throw error;
    }
  }

  /**
   * Execute multiple steps with error handling
   * @param commands Array of shell commands
   * @param options Execution options (stopOnError defaults to true)
   * @returns Array of results for each step
   */
  async executeSteps(
    commands: string[],
    options: ExecuteOptions = {}
  ): Promise<Array<StepResult & { success: boolean; command: string }>> {
    const results: Array<StepResult & { success: boolean; command: string }> = [];
    const stopOnError = options.stopOnError ?? true;

    for (const command of commands) {
      const result = await this.execute(command, options);
      results.push({ ...result, command });

      if (!result.success && stopOnError) {
        break;
      }
    }

    return results;
  }
}

// Demo: run a simple command if executed directly
if (import.meta.main) {
  const result = await executeBash("echo 'Hello from executor' && echo 'stdout' && echo 'error' >&2");
  console.log("stdout:", result.stdout.trim());
  console.log("stderr:", result.stderr.trim());
  console.log("exitCode:", result.exitCode);
}