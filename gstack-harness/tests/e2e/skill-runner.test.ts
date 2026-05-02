/**
 * E2E Tests for Skill Runner
 * Tests skill loading, execution, and error handling using real file operations
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const runtimePath = join(process.cwd(), "src/runtime");
const skillRunnerPath = join(runtimePath, "skill-runner.ts");

describe("Skill Runner", () => {
  const testHarnessDir = join(tmpdir(), "gstack-test-harness-" + Date.now());
  const skillsDir = join(testHarnessDir, "harness", "skills");

  beforeAll(() => {
    mkdirSync(skillsDir, { recursive: true });
  });

  afterAll(() => {
    try {
      rmSync(testHarnessDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe("parseSkill", () => {
    test("parses skill with workflow and execution sections", async () => {
      const { parseSkill } = await import(skillRunnerPath);

      const skillContent = `---
name: test-skill
description: A test skill
triggers: [test, demo]
---

## Workflow
This skill does X then Y

## Execution
\`\`\`bash
echo "hello"
echo "world"
\`\`\`
`;

      const skillFile = join(skillsDir, "test-skill.md");
      writeFileSync(skillFile, skillContent);

      const result = parseSkill(skillFile);
      expect(result).not.toBeNull();
      expect(result?.metadata.name).toBe("test-skill");
      expect(result?.metadata.description).toBe("A test skill");
      expect(result?.metadata.triggers).toEqual(["test", "demo"]);
      expect(result?.workflow).toContain("This skill does X then Y");
      expect(result?.execution).toContain('echo "hello"');
    });

    test("returns null for skill without workflow or execution", async () => {
      const { parseSkill } = await import(skillRunnerPath);

      const skillContent = `---
name: empty-skill
description: An empty skill
---

No workflow or execution here.
`;

      const skillFile = join(skillsDir, "empty-skill.md");
      writeFileSync(skillFile, skillContent);

      const result = parseSkill(skillFile);
      expect(result).toBeNull();
    });

    test("parses frontmatter correctly", async () => {
      const { parseSkill } = await import(skillRunnerPath);

      const skillContent = `---
name: frontmatter-test
description: Testing frontmatter parsing
triggers: [parse, test]
---

## Workflow
Test workflow content

## Execution
\`\`\`bash
echo "test"
\`\`\`
`;

      const skillFile = join(skillsDir, "frontmatter-test.md");
      writeFileSync(skillFile, skillContent);

      const result = parseSkill(skillFile);
      expect(result).not.toBeNull();
      expect(result?.metadata.name).toBe("frontmatter-test");
      expect(result?.metadata.triggers).toEqual(["parse", "test"]);
    });
  });

  describe("findSkillFile", () => {
    test("finds skill file with .md extension", async () => {
      const { findSkillFile } = await import(skillRunnerPath);

      const skillContent = `---
name: find-test
---

## Workflow
Test

## Execution
\`\`\`bash
echo "found"
\`\`\`
`;

      const skillFile = join(skillsDir, "find-test.md");
      writeFileSync(skillFile, skillContent);

      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testHarnessDir,
        configurable: true,
      });

      try {
        const result = findSkillFile("find-test");
        expect(result).toBe(skillFile);
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("finds skill in directory with SKILL.md", async () => {
      const { findSkillFile } = await import(skillRunnerPath);

      const skillDir = join(skillsDir, "dir-skill");
      mkdirSync(skillDir, { recursive: true });

      const skillContent = `---
name: dir-skill
---

## Workflow
Test

## Execution
\`\`\`bash
echo "dir-skill"
\`\`\`
`;

      writeFileSync(join(skillDir, "SKILL.md"), skillContent);

      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testHarnessDir,
        configurable: true,
      });

      try {
        const result = findSkillFile("dir-skill");
        expect(result).toBe(join(skillDir, "SKILL.md"));
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });

    test("returns null for non-existent skill", async () => {
      const { findSkillFile } = await import(skillRunnerPath);

      const originalCwd = process.cwd;
      Object.defineProperty(process, "cwd", {
        value: () => testHarnessDir,
        configurable: true,
      });

      try {
        const result = findSkillFile("non-existent-skill");
        expect(result).toBeNull();
      } finally {
        Object.defineProperty(process, "cwd", {
          value: originalCwd,
          configurable: true,
        });
      }
    });
  });

  describe("extractBashCommands", () => {
    test("extracts multiple bash commands from execution", async () => {
      const { extractBashCommands } = await import(skillRunnerPath);

      const execution = `
Some text

\`\`\`bash
echo "first command"
echo "second command"
# This is a comment
echo "third command"
\`\`\`

More text
`;

      const commands = extractBashCommands(execution);
      expect(commands).toHaveLength(3);
      expect(commands[0]).toBe('echo "first command"');
      expect(commands[1]).toBe('echo "second command"');
      expect(commands[2]).toBe('echo "third command"');
    });

    test("returns empty array for no bash blocks", async () => {
      const { extractBashCommands } = await import(skillRunnerPath);

      const execution = "No bash blocks here";
      const commands = extractBashCommands(execution);
      expect(commands).toHaveLength(0);
    });

    test("filters out empty lines and comments", async () => {
      const { extractBashCommands } = await import(skillRunnerPath);

      const execution = `
\`\`\`bash

# comment only

echo "command"

\`\`\`
`;

      const commands = extractBashCommands(execution);
      expect(commands).toHaveLength(1);
      expect(commands[0]).toBe('echo "command"');
    });
  });

  describe("parseWorkflowAndExecution", () => {
    test("parses workflow and execution sections", async () => {
      const { parseWorkflowAndExecution } = await import(skillRunnerPath);

      const content = `---
name: parse-test
---

## Workflow
This is the workflow section
with multiple lines

## Execution
\`\`\`bash
echo "exec"
\`\`\`
`;

      const result = parseWorkflowAndExecution(content);
      expect(result.workflow).toContain("This is the workflow section");
      expect(result.execution).toContain('echo "exec"');
    });

    test("handles content with only workflow", async () => {
      const { parseWorkflowAndExecution } = await import(skillRunnerPath);

      const content = `---
name: workflow-only
---

## Workflow
Only workflow here
`;

      const result = parseWorkflowAndExecution(content);
      expect(result.workflow).toContain("Only workflow here");
      expect(result.execution).toBe("");
    });
  });

  describe("executeBash", () => {
    test("executes command and captures stdout", async () => {
      const { executeBash } = await import(skillRunnerPath);

      const result = await executeBash("echo 'hello world'");
      expect(result.stdout.trim()).toBe("hello world");
      expect(result.exitCode).toBe(0);
    });

    test("captures stderr separately", async () => {
      const { executeBash } = await import(skillRunnerPath);

      const result = await executeBash("echo 'error' >&2");
      expect(result.success).toBe(true);
      expect(result.stderr.trim()).toBe("error");
    });

    test("returns exit code for failed command", async () => {
      const { executeBash } = await import(skillRunnerPath);

      const result = await executeBash("exit 42");
      expect(result.exitCode).toBe(42);
    });

    test("passes environment variables", async () => {
      const { executeBash } = await import(skillRunnerPath);

      const result = await executeBash("echo $TEST_VAR", { TEST_VAR: "my-value" });
      expect(result.stdout.trim()).toBe("my-value");
    });
  });
});