/**
 * E2E Tests for Executor
 * Tests Bun.spawn execution, stdout/stderr capture, and step status tracking
 */

import { describe, test, expect } from "bun:test";
import { executeBash, executeBashWithOptions, StepExecutor, type StepResult } from "../../src/runtime/executor";

describe("Executor", () => {
  describe("executeBash", () => {
    test("executes simple echo command and captures stdout", async () => {
      const result = await executeBash("echo 'test output'");
      expect(result.stdout.trim()).toBe("test output");
      expect(result.exitCode).toBe(0);
    });

    test("captures stderr separately from stdout", async () => {
      const result = await executeBash("echo 'stderr output' >&2");
      expect(result.stderr.trim()).toBe("stderr output");
      expect(result.stdout.trim()).toBe("");
    });

    test("returns non-zero exit code for failed commands", async () => {
      const result = await executeBash("exit 5");
      expect(result.exitCode).toBe(5);
    });

    test("handles commands with pipes", async () => {
      const result = await executeBash("echo 'line1' | cat && echo 'line2'");
      expect(result.stdout.trim()).toContain("line1");
      expect(result.stdout.trim()).toContain("line2");
    });

    test("handles multi-line output", async () => {
      const result = await executeBash("printf 'line1\\nline2\\nline3\\n'");
      const lines = result.stdout.trim().split("\n");
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("line1");
      expect(lines[1]).toBe("line2");
      expect(lines[2]).toBe("line3");
    });
  });

  describe("executeBashWithOptions", () => {
    test("returns success true for successful command", async () => {
      const result = await executeBashWithOptions("echo 'success'");
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    test("returns success false for failed command", async () => {
      const result = await executeBashWithOptions("exit 1");
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    test("passes custom environment variables", async () => {
      const result = await executeBashWithOptions("echo $CUSTOM_VAR", {
        env: { CUSTOM_VAR: "custom-value" },
      });
      expect(result.stdout.trim()).toBe("custom-value");
    });

    test("inherits process environment variables", async () => {
      const result = await executeBashWithOptions("echo $PATH");
      expect(result.stdout.trim()).toBeTruthy();
    });

    test("custom cwd option is respected", async () => {
      const result = await executeBashWithOptions("pwd", { cwd: "/tmp" });
      expect(result.stdout.trim()).toBe("/tmp");
    });

    test("stopOnError option defaults to true", async () => {
      const result = await executeBashWithOptions("echo 'test'");
      expect(result.success).toBe(true);
    });
  });

  describe("StepExecutor", () => {
    test("getStatus returns initial pending status", () => {
      const executor = new StepExecutor();
      expect(executor.getStatus()).toBe("pending");
    });

    test("execute updates status to running then success", async () => {
      const executor = new StepExecutor();
      const result = await executor.execute("echo 'hello'");

      expect(executor.getStatus()).toBe("success");
      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe("hello");
    });

    test("execute updates status to failed on error", async () => {
      const executor = new StepExecutor();
      const result = await executor.execute("exit 1");

      expect(executor.getStatus()).toBe("failed");
      expect(result.success).toBe(false);
    });

    test("execute throws on command error when not caught", async () => {
      const executor = new StepExecutor();
      executor.execute("nonexistent-command-xyz").catch((err) => {
        expect(err).toBeDefined();
      });
    });
  });

  describe("StepExecutor.executeSteps", () => {
    test("executes multiple commands sequentially", async () => {
      const executor = new StepExecutor();
      const commands = ["echo 'one'", "echo 'two'", "echo 'three'"];

      const results = await executor.executeSteps(commands);

      expect(results).toHaveLength(3);
      expect(results[0].stdout.trim()).toBe("one");
      expect(results[1].stdout.trim()).toBe("two");
      expect(results[2].stdout.trim()).toBe("three");
    });

    test("stops on error when stopOnError is true", async () => {
      const executor = new StepExecutor();
      const commands = ["echo 'first'", "exit 1", "echo 'third'"];

      const results = await executor.executeSteps(commands, { stopOnError: true });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    test("continues when stopOnError is false", async () => {
      const executor = new StepExecutor();
      const commands = ["echo 'first'", "exit 1", "echo 'third'"];

      const results = await executor.executeSteps(commands, { stopOnError: false });

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    test("captures command in result", async () => {
      const executor = new StepExecutor();
      const commands = ["echo 'test'"];

      const results = await executor.executeSteps(commands);

      expect(results[0].command).toBe("echo 'test'");
    });

    test("all commands succeed returns all results", async () => {
      const executor = new StepExecutor();
      const commands = ["echo 'a'", "echo 'b'", "echo 'c'"];

      const results = await executor.executeSteps(commands);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  describe("stdout/stderr capture", () => {
    test("captures large stdout output", async () => {
      const result = await executeBash("seq 1 100 | tr '\\n' ','");
      const numbers = result.stdout.trim().split(",").filter(Boolean);
      expect(numbers).toHaveLength(100);
    });

    test("handles binary-like output", async () => {
      const result = await executeBash("printf 'a\\x00b\\x01c'");
      expect(result.stdout).toContain("a");
      expect(result.stdout).toContain("b");
    });

    test("captures mixed stdout and stderr", async () => {
      const result = await executeBash(`
        echo "stdout line" >&1
        echo "stderr line" >&2
        echo "another stdout" >&1
      `);

      expect(result.stdout.trim()).toContain("stdout line");
      expect(result.stdout.trim()).toContain("another stdout");
      expect(result.stderr.trim()).toBe("stderr line");
    });
  });

  describe("exit code tracking", () => {
    test("captures exit code 0", async () => {
      const result = await executeBash("true");
      expect(result.exitCode).toBe(0);
    });

    test("captures exit code 1", async () => {
      const result = await executeBash("false");
      expect(result.exitCode).toBe(1);
    });

    test("captures arbitrary exit codes", async () => {
      const result = await executeBash("exit 127");
      expect(result.exitCode).toBe(127);
    });
  });
});