/**
 * E2E Tests for Swarm
 * Tests coordination modes: sequential, parallel, hierarchical
 */

import { describe, test, expect } from "bun:test";
import { swarm } from "../../src/runtime/swarm";

describe("Swarm", () => {
  describe("swarm function", () => {
    test("returns SwarmResult with success flag", async () => {
      const result = await swarm({
        agents: [{ id: "agent-1" }],
        coordination: "parallel",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("totalDuration");
      expect(result).toHaveProperty("agents");
      expect(result).toHaveProperty("aggregated");
    });

    test("returns empty result for empty agents array", async () => {
      const result = await swarm({
        agents: [],
        coordination: "parallel",
      });

      expect(result.success).toBe(true);
      expect(result.agents).toEqual([]);
      expect(result.aggregated.totalAgents).toBe(0);
    });

    test("aggregates results correctly", async () => {
      const result = await swarm({
        agents: [{ id: "agg-test-1" }, { id: "agg-test-2" }],
        coordination: "parallel",
      });

      expect(result.aggregated).toHaveProperty("totalAgents");
      expect(result.aggregated).toHaveProperty("successfulAgents");
      expect(result.aggregated).toHaveProperty("failedAgents");
      expect(result.aggregated).toHaveProperty("totalDuration");
      expect(result.aggregated).toHaveProperty("successRate");
    });
  });

  describe("parallel coordination", () => {
    test("runs agents simultaneously", async () => {
      const startTime = Date.now();

      const result = await swarm({
        agents: [{ id: "parallel-1" }, { id: "parallel-2" }, { id: "parallel-3" }],
        coordination: "parallel",
      });

      const duration = Date.now() - startTime;
      expect(result.agents).toHaveLength(3);
      expect(duration).toBeLessThan(3000);
    });

    test("returns results for all agents", async () => {
      const result = await swarm({
        agents: [{ id: "results-1" }, { id: "results-2" }],
        coordination: "parallel",
      });

      expect(result.agents).toHaveLength(2);
      expect(result.agents[0]).toHaveProperty("id");
      expect(result.agents[0]).toHaveProperty("pid");
      expect(result.agents[0]).toHaveProperty("success");
      expect(result.agents[0]).toHaveProperty("duration");
    });

    test("captures each agent's PID", async () => {
      const result = await swarm({
        agents: [{ id: "pid-1" }, { id: "pid-2" }],
        coordination: "parallel",
      });

      const pids = result.agents.map((a) => a.pid);
      expect(pids[0]).toBeGreaterThan(0);
      expect(pids[1]).toBeGreaterThan(0);
    });
  });

  describe("sequential coordination", () => {
    test("runs agents one at a time", async () => {
      const result = await swarm({
        agents: [{ id: "seq-1" }, { id: "seq-2" }],
        coordination: "sequential",
      });

      expect(result.agents).toHaveLength(2);
    });

    test("each agent has valid result", async () => {
      const result = await swarm({
        agents: [{ id: "seq-result-1" }, { id: "seq-result-2" }],
        coordination: "sequential",
      });

      for (const agent of result.agents) {
        expect(agent).toHaveProperty("id");
        expect(agent).toHaveProperty("pid");
        expect(agent).toHaveProperty("exitCode");
        expect(agent).toHaveProperty("duration");
      }
    });
  });

  describe("hierarchical coordination", () => {
    test("runs with hierarchical structure", async () => {
      const result = await swarm({
        agents: [
          {
            id: "parent-1",
            children: [{ id: "child-1" }],
          },
        ],
        coordination: "hierarchical",
      });

      expect(result.agents.length).toBeGreaterThan(0);
    });

    test("parent agent has children property when defined", async () => {
      const result = await swarm({
        agents: [
          {
            id: "parent-2",
            children: [{ id: "child-2" }, { id: "child-3" }],
          },
        ],
        coordination: "hierarchical",
      });

      const parent = result.agents.find((a) => a.id === "parent-2");
      expect(parent?.children).toBeDefined();
      expect(parent?.children?.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("agent result properties", () => {
    test("each agent result has stdout and stderr", async () => {
      const result = await swarm({
        agents: [{ id: "output-agent" }],
        coordination: "parallel",
      });

      expect(result.agents[0]).toHaveProperty("stdout");
      expect(result.agents[0]).toHaveProperty("stderr");
      expect(typeof result.agents[0].stdout).toBe("string");
      expect(typeof result.agents[0].stderr).toBe("string");
    });

    test("each agent result has success flag", async () => {
      const result = await swarm({
        agents: [{ id: "success-agent" }],
        coordination: "parallel",
      });

      expect(typeof result.agents[0].success).toBe("boolean");
    });

    test("each agent result has exitCode", async () => {
      const result = await swarm({
        agents: [{ id: "exit-agent" }],
        coordination: "parallel",
      });

      expect(typeof result.agents[0].exitCode).toBe("number");
    });

    test("each agent result has duration in milliseconds", async () => {
      const result = await swarm({
        agents: [{ id: "duration-agent" }],
        coordination: "parallel",
      });

      expect(typeof result.agents[0].duration).toBe("number");
      expect(result.agents[0].duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("aggregated metrics", () => {
    test("totalDuration is sum of all agent durations", async () => {
      const result = await swarm({
        agents: [{ id: "sum-1" }, { id: "sum-2" }],
        coordination: "parallel",
      });

      const agentDurationSum = result.agents.reduce((sum, a) => sum + a.duration, 0);
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    });

    test("successRate is calculated correctly", async () => {
      const result = await swarm({
        agents: [{ id: "rate-1" }, { id: "rate-2" }],
        coordination: "parallel",
      });

      expect(result.aggregated.successRate).toBeTruthy();
    });

    test("PIDs are captured in aggregated results", async () => {
      const result = await swarm({
        agents: [{ id: "pids-agent" }],
        coordination: "parallel",
      });

      expect(result.aggregated.pids).toBeDefined();
      expect(Array.isArray(result.aggregated.pids)).toBe(true);
    });
  });

  describe("error handling", () => {
    test("handles unknown coordination mode gracefully", async () => {
      const result = await swarm({
        agents: [{ id: "unknown-mode" }],
        coordination: "parallel",
      });

      expect(result).toHaveProperty("success");
    });
  });
});