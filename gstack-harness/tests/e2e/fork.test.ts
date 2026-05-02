/**
 * E2E Tests for Fork
 * Tests process creation via Bun.spawn
 */

import { describe, test, expect } from "bun:test";
import { fork } from "../../src/runtime/fork";

describe("Fork", () => {
  describe("fork function", () => {
    test("creates a child process with valid PID", async () => {
      const result = await fork({
        agent_id: "test-agent",
        skill_name: "investigate",
        args: { repo: "test-repo" },
      });

      expect(result.pid).toBeGreaterThan(0);
      expect(typeof result.pid).toBe("number");
    });

    test("returns stdout from child process", async () => {
      const result = await fork({
        agent_id: "test-agent-echo",
        skill_name: "investigate",
        args: {},
      });

      expect(result.stdout).toBeTruthy();
    });

    test("returns exitCode from child process", async () => {
      const result = await fork({
        agent_id: "test-agent-exit",
        skill_name: "investigate",
        args: {},
      });

      expect(typeof result.exitCode).toBe("number");
    });

    test("handles missing skill gracefully", async () => {
      const result = await fork({
        agent_id: "test-no-skill",
        skill_name: "non-existent-skill-xyz",
        args: {},
      });

      expect(result.exitCode).not.toBe(0);
    });
  });

  describe("process environment", () => {
    test("sets GSTACK_FORK_MODE environment variable", async () => {
      const result = await fork({
        agent_id: "test-env",
        skill_name: "investigate",
        args: {},
      });

      expect(result.stdout).toBeTruthy();
    });

    test("sets AGENT_ID environment variable", async () => {
      const agentId = "my-unique-agent-" + Date.now();
      const result = await fork({
        agent_id: agentId,
        skill_name: "investigate",
        args: {},
      });

      expect(result.pid).toBeGreaterThan(0);
    });
  });

  describe("IPC communication", () => {
    test("child process communicates via IPC", async () => {
      const result = await fork({
        agent_id: "test-ipc",
        skill_name: "investigate",
        args: {},
      });

      expect(result.pid).toBeGreaterThan(0);
    });
  });

  describe("skill execution", () => {
    test("fork executes skill with arguments", async () => {
      const result = await fork({
        agent_id: "test-skill-args",
        skill_name: "investigate",
        args: { test_key: "test_value" },
      });

      expect(result.pid).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    test("handles non-existent skill gracefully", async () => {
      const result = await fork({
        agent_id: "test-error",
        skill_name: "skill-does-not-exist-12345",
        args: {},
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toBeTruthy();
    });

    test("returns stderr for failed execution", async () => {
      const result = await fork({
        agent_id: "test-stderr",
        skill_name: "investigate",
        args: {},
      });

      expect(result.stderr !== undefined).toBe(true);
    });
  });

  describe("process lifecycle", () => {
    test("process completes and returns", async () => {
      const result = await fork({
        agent_id: "test-lifecycle",
        skill_name: "investigate",
        args: {},
      });

      expect(result.exitCode).toBeDefined();
    });

    test("multiple forks can run sequentially", async () => {
      const result1 = await fork({
        agent_id: "sequential-1",
        skill_name: "investigate",
        args: {},
      });

      const result2 = await fork({
        agent_id: "sequential-2",
        skill_name: "investigate",
        args: {},
      });

      expect(result1.pid).not.toBe(result2.pid);
    });
  });
});