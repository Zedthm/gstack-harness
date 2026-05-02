/**
 * E2E Tests for Hooks
 * Tests hook registration and triggering
 */

import { describe, test, expect } from "bun:test";
import {
  HookRegistry,
  type HookData,
  type HookResult,
} from "../../src/runtime/hooks";

describe("Hooks", () => {
  describe("HookRegistry", () => {
    test("register adds a hook function", () => {
      const registry = new HookRegistry();
      let called = false;

      registry.register("TestEvent", async () => {
        called = true;
        return { allowed: true };
      });

      expect(registry.hasHooks("TestEvent")).toBe(true);
    });

    test("trigger calls registered hooks", async () => {
      const registry = new HookRegistry();
      let callCount = 0;

      registry.register("TestEvent", async () => {
        callCount++;
        return { allowed: true };
      });

      await registry.trigger("TestEvent", { timestamp: Date.now() });
      expect(callCount).toBe(1);
    });

    test("trigger calls multiple hooks in order", async () => {
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
      expect(order).toEqual(["second", "first"]);
    });

    test("trigger stops on blocked result", async () => {
      const registry = new HookRegistry();
      let secondCalled = false;

      registry.register("TestEvent", async () => {
        return { allowed: false, blocked: true, reason: "blocked" };
      }, 100);

      registry.register("TestEvent", async () => {
        secondCalled = true;
        return { allowed: true };
      }, 200);

      const result = await registry.trigger("TestEvent", {
        timestamp: Date.now(),
      }) as HookResult;

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
    });

    test("unregister removes all hooks for an event", () => {
      const registry = new HookRegistry();

      registry.register("TestEvent", async () => ({ allowed: true }));
      expect(registry.hasHooks("TestEvent")).toBe(true);

      registry.unregister("TestEvent");
      expect(registry.hasHooks("TestEvent")).toBe(false);
    });

    test("unregisterHook removes specific hook by name", () => {
      const registry = new HookRegistry();

      registry.register("TestEvent", async () => ({ allowed: true }), 100);

      const hooks = registry.getHooks("TestEvent");
      expect(hooks.length).toBe(1);

      const removed = registry.unregisterHook("TestEvent", hooks[0].name);
      expect(removed).toBe(true);
      expect(registry.hasHooks("TestEvent")).toBe(false);
    });

    test("list returns all registered hooks", () => {
      const registry = new HookRegistry();

      registry.register("Event1", async () => ({ allowed: true }));
      registry.register("Event2", async () => ({ allowed: true }));

      const hooks = registry.list();
      expect(hooks.has("Event1")).toBe(true);
      expect(hooks.has("Event2")).toBe(true);
    });

    test("getHooks returns hooks for specific event", () => {
      const registry = new HookRegistry();
      const hookFn = async () => ({ allowed: true });

      registry.register("TargetEvent", hookFn);

      const hooks = registry.getHooks("TargetEvent");
      expect(hooks).toHaveLength(1);
    });

    test("clear removes all hooks", () => {
      const registry = new HookRegistry();

      registry.register("Event1", async () => ({ allowed: true }));
      registry.register("Event2", async () => ({ allowed: true }));

      registry.clear();

      const hooks = registry.list();
      expect(hooks.size).toBe(0);
    });
  });

  describe("trigger with data", () => {
    test("passes data to hook function", async () => {
      const registry = new HookRegistry();
      let receivedData: HookData | null = null;

      registry.register("DataEvent", async (data) => {
        receivedData = data;
        return { allowed: true };
      });

      const testData = { timestamp: 12345, source: "test" };
      await registry.trigger("DataEvent", testData);

      expect(receivedData).not.toBeNull();
      expect(receivedData?.timestamp).toBe(12345);
      expect(receivedData?.source).toBe("test");
    });

    test("returns result from hook", async () => {
      const registry = new HookRegistry();

      registry.register("ResultEvent", async () => ({
        allowed: true,
        data: { key: "value" },
      }));

      const result = await registry.trigger("ResultEvent", {
        timestamp: Date.now(),
      });

      expect((result as HookResult).data).toEqual({ key: "value" });
    });
  });

  describe("triggerSync", () => {
    test("executes hooks synchronously", () => {
      const registry = new HookRegistry();
      let syncResult = false;

      registry.register("SyncEvent", () => {
        syncResult = true;
        return { allowed: true };
      });

      registry.triggerSync("SyncEvent", { timestamp: Date.now() });
      expect(syncResult).toBe(true);
    });

    test("sync trigger respects blocked setting", () => {
      const registry = new HookRegistry();
      let secondCalled = false;

      registry.register("SyncBlocked", () => {
        return { allowed: false, blocked: true, reason: "sync blocked" };
      }, 100);

      registry.register("SyncBlocked", () => {
        secondCalled = true;
        return { allowed: true };
      }, 200);

      const result = registry.triggerSync("SyncBlocked", {
        timestamp: Date.now(),
      }) as HookResult;

      expect(result.allowed).toBe(false);
      expect(secondCalled).toBe(false);
    });
  });

  describe("error handling", () => {
    test("catches hook errors and returns result", async () => {
      const registry = new HookRegistry();

      registry.register("ErrorEvent", async () => {
        throw new Error("Hook error");
      });

      const result = await registry.trigger("ErrorEvent", {
        timestamp: Date.now(),
      }) as HookResult;

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Hook error");
    });

    test("returns error result when hook throws", async () => {
      const registry = new HookRegistry();

      registry.register("ThrowEvent", async () => {
        throw new Error("Test error");
      });

      const result = await registry.trigger("ThrowEvent", {
        timestamp: Date.now(),
      }) as HookResult;

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Test error");
    });
  });

  describe("priority ordering", () => {
    test("lower priority number executes first", async () => {
      const registry = new HookRegistry();
      const order: number[] = [];

      registry.register("PriorityEvent", async () => {
        order.push(200);
        return { allowed: true };
      }, 200);

      registry.register("PriorityEvent", async () => {
        order.push(100);
        return { allowed: true };
      }, 100);

      registry.register("PriorityEvent", async () => {
        order.push(50);
        return { allowed: true };
      }, 50);

      await registry.trigger("PriorityEvent", { timestamp: Date.now() });

      expect(order).toEqual([50, 100, 200]);
    });
  });

  describe("hook result aggregation", () => {
    test("returns single result when only one hook", async () => {
      const registry = new HookRegistry();

      registry.register("SingleEvent", async () => ({
        allowed: true,
        reason: "single",
      }));

      const result = await registry.trigger("SingleEvent", {
        timestamp: Date.now(),
      });

      expect((result as HookResult).reason).toBe("single");
    });

    test("returns array when multiple hooks", async () => {
      const registry = new HookRegistry();

      registry.register("MultiEvent", async () => ({ allowed: true }), 100);
      registry.register("MultiEvent", async () => ({ allowed: true }), 200);

      const result = await registry.trigger("MultiEvent", {
        timestamp: Date.now(),
      });

      expect(Array.isArray(result)).toBe(true);
      expect((result as HookResult[])).toHaveLength(2);
    });
  });
});