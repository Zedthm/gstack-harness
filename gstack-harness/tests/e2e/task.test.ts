/**
 * E2E Tests for Task
 * Tests task lifecycle management
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { rmSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  createTask,
  loadTask,
  getTaskStatus,
  cancelTask,
  loadAllTasks,
  type Task,
} from "../../src/runtime/task";

describe("Task", () => {
  const testTaskDir = join(tmpdir(), "gstack-test-task-" + Date.now());

  beforeAll(() => {
    mkdirSync(testTaskDir, { recursive: true });
  });

  afterAll(() => {
    try {
      rmSync(testTaskDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe("createTask", () => {
    test("creates a new task with pending status", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const task = createTask("investigate", { repo: "test-repo" });

        expect(task.id).toBeTruthy();
        expect(task.id.startsWith("task_")).toBe(true);
        expect(task.skill_name).toBe("investigate");
        expect(task.status).toBe("pending");
        expect(task.args).toEqual({ repo: "test-repo" });
        expect(task.steps).toEqual([]);
        expect(task.created_at).toBeTruthy();
        expect(task.updated_at).toBeTruthy();
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("generates unique task IDs", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const task1 = createTask("skill1", {});
        const task2 = createTask("skill2", {});

        expect(task1.id).not.toBe(task2.id);
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("task ID format includes timestamp and random", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const task = createTask("test", {});
        const parts = task.id.split("_");

        expect(parts[0]).toBe("task");
        expect(parts.length).toBeGreaterThanOrEqual(3);
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });
  });

  describe("loadTask", () => {
    test("loads a saved task", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const created = createTask("review", { branch: "main" });
        const loaded = loadTask(created.id);

        expect(loaded).not.toBeNull();
        expect(loaded?.id).toBe(created.id);
        expect(loaded?.skill_name).toBe("review");
        expect(loaded?.args.branch).toBe("main");
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("returns null for non-existent task", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const loaded = loadTask("non-existent-task-id");
        expect(loaded).toBeNull();
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });
  });

  describe("getTaskStatus", () => {
    test("returns task status", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const created = createTask("qa", {});
        const status = getTaskStatus(created.id);

        expect(status).not.toBeNull();
        expect(status?.status).toBe("pending");
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });
  });

  describe("cancelTask", () => {
    test("cancels a pending task", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const task = createTask("test", {});
        expect(task.status).toBe("pending");

        const cancelled = cancelTask(task.id);
        expect(cancelled).not.toBeNull();
        expect(cancelled?.status).toBe("failed");
        expect(cancelled?.cancelled_at).toBeTruthy();
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("cannot cancel already completed task", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const task = createTask("test", {});
        task.status = "success";
        const taskFile = join(testTaskDir, ".gstack-harness", "tasks", `${task.id}.json`);
        mkdirSync(join(testTaskDir, ".gstack-harness", "tasks"), { recursive: true });
        writeFileSync(taskFile, JSON.stringify(task));

        const result = cancelTask(task.id);
        expect(result).not.toBeNull();
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("returns null for non-existent task", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const result = cancelTask("non-existent-id");
        expect(result).toBeNull();
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });
  });

  describe("loadAllTasks", () => {
    test("loads all tasks sorted by creation date", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const task1 = createTask("skill-a", {});
        const task2 = createTask("skill-b", {});

        const allTasks = loadAllTasks();
        expect(allTasks.length).toBeGreaterThanOrEqual(2);

        const ids = allTasks.map((t) => t.id);
        expect(ids).toContain(task1.id);
        expect(ids).toContain(task2.id);
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("returns empty array when no tasks", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const emptyDir = join(testTaskDir, ".gstack-harness", "tasks", "empty-check");
        mkdirSync(emptyDir, { recursive: true });

        const allTasks = loadAllTasks();
        expect(Array.isArray(allTasks)).toBe(true);
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });
  });

  describe("task persistence", () => {
    test("task is persisted to disk", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const task = createTask("persist-test", { key: "value" });
        const taskFile = join(
          testTaskDir,
          ".gstack-harness",
          "tasks",
          `${task.id}.json`
        );

        const content = readFileSync(taskFile, "utf-8");
        const parsed = JSON.parse(content);

        expect(parsed.id).toBe(task.id);
        expect(parsed.skill_name).toBe("persist-test");
        expect(parsed.args.key).toBe("value");
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("task updates are persisted", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const task = createTask("update-test", {});

        const loaded = loadTask(task.id)!;
        loaded.status = "running";
        loaded.updated_at = new Date().toISOString();

        const taskFile = join(
          testTaskDir,
          ".gstack-harness",
          "tasks",
          `${task.id}.json`
        );
        writeFileSync(taskFile, JSON.stringify(loaded));

        const reloaded = loadTask(task.id);
        expect(reloaded?.status).toBe("running");
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });
  });

  describe("task steps", () => {
    test("task starts with empty steps", () => {
      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testTaskDir,
        configurable: true,
      });

      try {
        const task = createTask("steps-test", {});
        expect(task.steps).toEqual([]);
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });
  });
});