/**
 * E2E Tests for Memory
 * Tests save/recall operations and taxonomy storage
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { rmSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  save,
  recall,
  saveEntry,
  loadEntries,
  generateId,
  getMemoryDir,
  type MemoryEntry,
  type MemoryType,
} from "../../src/runtime/memory";

describe("Memory", () => {
  const testMemoryDir = join(tmpdir(), "gstack-test-memory-" + Date.now());

  beforeAll(() => {
    mkdirSync(testMemoryDir, { recursive: true });
  });

  afterAll(() => {
    try {
      rmSync(testMemoryDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe("generateId", () => {
    test("generates unique IDs", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    test("ID format includes timestamp", () => {
      const id = generateId();
      const timestampPart = id.split("-")[0];
      const timestamp = parseInt(timestampPart, 10);
      expect(timestamp).toBeGreaterThan(0);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("getMemoryDir", () => {
    test("returns expected path structure", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testMemoryDir,
        configurable: true,
      });

      try {
        const dir = getMemoryDir();
        expect(dir).toContain(".gstack-harness");
        expect(dir).toContain("memory");
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });
  });

  describe("saveEntry", () => {
    test("saves entry to correct memory type file", () => {
      const entry: MemoryEntry = {
        id: generateId(),
        agent_id: "test-agent",
        memory_type: "skill-patterns",
        content: "Test content about patterns",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testMemoryDir,
        configurable: true,
      });

      try {
        saveEntry(entry);

        const entries = loadEntries("skill-patterns");
        const saved = entries.find((e) => e.id === entry.id);
        expect(saved).toBeDefined();
        expect(saved?.content).toBe("Test content about patterns");
        expect(saved?.agent_id).toBe("test-agent");
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });
  });

  describe("loadEntries", () => {
    test("loads entries from memory type file", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testMemoryDir,
        configurable: true,
      });

      try {
        const entries = loadEntries("error-patterns");
        expect(Array.isArray(entries)).toBe(true);
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("returns empty array for non-existent file", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testMemoryDir,
        configurable: true,
      });

      try {
        const entries = loadEntries("user-preferences");
        expect(Array.isArray(entries)).toBe(true);
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });
  });

  describe("save and recall integration", () => {
    test("saves and retrieves memory entries", async () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testMemoryDir,
        configurable: true,
      });

      try {
        const agentId = "test-agent-" + Date.now();
        const memoryType: MemoryType = "skill-patterns";
        const content = "React useEffect requires cleanup function";

        await save(agentId, memoryType, content);

        const results = await recall(agentId, "React");
        expect(results.length).toBeGreaterThan(0);
        const found = results.find(
          (r) => r.agent_id === agentId && r.memory_type === memoryType
        );
        expect(found).toBeDefined();
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("recall searches across all memory types", async () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testMemoryDir,
        configurable: true,
      });

      try {
        const agentId = "test-agent-2-" + Date.now();

        await save(agentId, "skill-patterns", "TypeScript generics for API types");
        await save(agentId, "error-patterns", "TypeScript generic error handling");

        const results = await recall(agentId, "TypeScript");
        expect(results.length).toBeGreaterThanOrEqual(2);
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("recall matches content case-insensitively", async () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testMemoryDir,
        configurable: true,
      });

      try {
        const agentId = "test-agent-3-" + Date.now();
        await save(agentId, "project-context", "Next.js configuration");

        const results = await recall(agentId, "NEXT.JS");
        expect(results.some((r) => r.content.includes("Next.js"))).toBe(true);
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });
  });

  describe("taxonomy storage", () => {
    test("stores skill-patterns type correctly", async () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testMemoryDir,
        configurable: true,
      });

      try {
        const agentId = "taxonomy-test-1-" + Date.now();
        const entry = await save(agentId, "skill-patterns", "Singleton pattern for DB connections");

        expect(entry.memory_type).toBe("skill-patterns");

        const entries = loadEntries("skill-patterns");
        const found = entries.find((e) => e.id === entry.id);
        expect(found?.memory_type).toBe("skill-patterns");
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("stores error-patterns type correctly", async () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testMemoryDir,
        configurable: true,
      });

      try {
        const agentId = "taxonomy-test-2-" + Date.now();
        const entry = await save(agentId, "error-patterns", "Connection timeout after 30s");

        expect(entry.memory_type).toBe("error-patterns");
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("stores project-context type correctly", async () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testMemoryDir,
        configurable: true,
      });

      try {
        const agentId = "taxonomy-test-3-" + Date.now();
        const entry = await save(agentId, "project-context", "Monorepo with pnpm workspaces");

        expect(entry.memory_type).toBe("project-context");
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("stores user-preferences type correctly", async () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testMemoryDir,
        configurable: true,
      });

      try {
        const agentId = "taxonomy-test-4-" + Date.now();
        const entry = await save(agentId, "user-preferences", "Prefers dark mode");

        expect(entry.memory_type).toBe("user-preferences");
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });
  });
});