#!/usr/bin/env bun
/**
 * Skill Runner - Core skill loading and execution entry point
 * Usage: bun run src/runtime/skill-runner.ts --skill <name> [--arg <value>]
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

interface SkillMetadata {
  name: string;
  description: string;
  triggers?: string[];
}

interface ParsedSkill {
  metadata: SkillMetadata;
  workflow: string;
  execution: string;
  raw: string;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

interface CliArgs {
  skill?: string;
  help?: boolean;
  list?: boolean;
  arg?: string[];
}

function parseArgs(): CliArgs {
  const args: CliArgs = { arg: [] };
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--skill") {
      args.skill = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--list" || arg === "-l") {
      args.list = true;
    } else if (arg === "--arg") {
      if (!argv[i + 1]?.startsWith("--")) {
        const key = argv[++i];
        const value = argv[++i] || "";
        args.arg!.push(`${key}=${value}`);
      }
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      args.arg!.push(`${key}=${value}`);
    }
  }

  return args;
}

function findSkillFile(skillName: string): string | null {
  const searchPaths = [
    join(process.cwd(), "harness", "skills", `${skillName}.md`),
    join(process.cwd(), "harness", "skills", skillName, "SKILL.md"),
    join(process.cwd(), "harness", "skills", `${skillName.toLowerCase()}.md`),
    join(process.cwd(), "harness", "skills", skillName.toLowerCase(), "SKILL.md"),
  ];

  for (const path of searchPaths) {
    try {
      if (statSync(path).isFile()) {
        return path;
      }
    } catch {
      // continue
    }
  }

  return null;
}

function parseFrontmatter(content: string): SkillMetadata {
  const metadata: SkillMetadata = { name: "", description: "" };

  if (content.startsWith("---")) {
    const endIndex = content.indexOf("---", 3);
    if (endIndex !== -1) {
      const frontmatter = content.slice(3, endIndex).trim();
      for (const line of frontmatter.split("\n")) {
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) continue;

        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();

        if (key === "name") metadata.name = value;
        else if (key === "description") metadata.description = value;
        else if (key === "triggers") {
          metadata.triggers = value.replace(/[\[\]]/g, "").split(",").map((t) => t.trim());
        }
      }
    }
  }

  return metadata;
}

function parseWorkflowAndExecution(content: string): { workflow: string; execution: string } {
  let body = content;
  if (content.startsWith("---")) {
    const endIndex = content.indexOf("---", 3);
    if (endIndex !== -1) {
      body = content.slice(endIndex + 3);
    }
  }

  const parts = body.split(/^## /m).filter(s => s.trim());
  let workflow = "";
  let execution = "";

  for (const part of parts) {
    const lines = part.split("\n");
    const heading = lines[0].trim().toLowerCase();
    const sectionBody = lines.slice(1).join("\n").trim();

    if (heading === "workflow") {
      workflow = sectionBody;
    } else if (heading === "execution") {
      execution = sectionBody;
    }
  }

  return { workflow, execution };
}

function extractBashCommands(execution: string): string[] {
  const commands: string[] = [];
  const codeBlockRegex = /```bash\s*\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(execution)) !== null) {
    const lines = match[1]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
    commands.push(...lines);
  }

  return commands;
}

function parseSkill(filePath: string): ParsedSkill | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const metadata = parseFrontmatter(content);
    const { workflow, execution } = parseWorkflowAndExecution(content);

    if (!workflow && !execution) {
      return null;
    }

    return { metadata, workflow, execution, raw: content };
  } catch {
    return null;
  }
}

function listSkills(): string[] {
  const skillsDir = join(process.cwd(), "harness", "skills");
  const skills: string[] = [];

  try {
    const entries = readdirSync(skillsDir);
    for (const entry of entries) {
      const fullPath = join(skillsDir, entry);
      const stats = statSync(fullPath);

      if (stats.isFile() && entry.endsWith(".md")) {
        skills.push(entry.replace(".md", ""));
      } else if (stats.isDirectory()) {
        try {
          if (statSync(join(fullPath, "SKILL.md")).isFile()) {
            skills.push(entry);
          }
        } catch {
          // no SKILL.md
        }
      }
    }
  } catch {
    // dir doesn't exist
  }

  return skills.sort();
}

async function executeBash(command: string, env: Record<string, string> = {}): Promise<ExecutionResult> {
  const proc = Bun.spawn(["sh", "-c", command], {
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
  const stderr = await proc.stderr.text();

  return {
    success: exitCode === 0,
    output: stdout,
    error: stderr || undefined,
    exitCode,
  };
}

async function executeSkill(skill: ParsedSkill, args: Record<string, string>): Promise<void> {
  console.log(`\n🔧 Executing skill: ${skill.metadata.name || "unknown"}\n`);

  if (skill.workflow) {
    console.log("📋 Workflow:\n" + skill.workflow + "\n");
  }

  const commands = extractBashCommands(skill.execution);

  if (commands.length === 0) {
    console.log("⚠️  No executable commands found in ## Execution section");
    console.log("📝 Execution content:\n" + skill.execution);
    return;
  }

  console.log(`🚀 Executing ${commands.length} command(s)...\n`);

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(args)) {
    env[`ARG_${key.toUpperCase().replace(/-/g, "_")}`] = value;
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    console.log(`\n📍 Step ${i + 1}/${commands.length}: $ ${cmd}`);

    const result = await executeBash(cmd, env);

    if (result.success) {
      console.log(`   ✅ Exit: ${result.exitCode}`);
      if (result.output) {
        console.log(`   📤 Output:`);
        result.output.split("\n").forEach((line) => console.log(`      ${line}`));
      }
      successCount++;
    } else {
      console.log(`   ❌ Exit: ${result.exitCode}`);
      if (result.error) {
        console.log(`   📤 Stderr:`);
        result.error.split("\n").forEach((line) => console.log(`      ${line}`));
      }
      failCount++;
      console.log(`   ⚠️  Command failed, continuing...`);
    }
  }

  console.log(`\n📊 Execution complete: ${successCount} succeeded, ${failCount} failed`);
}

function printHelp(): void {
  console.log(`
Skill Runner - Agentic Harness Framework v2

Usage:
  bun run src/runtime/skill-runner.ts --skill <name> [options]
  bun run src/runtime/skill-runner.ts --help
  bun run src/runtime/skill-runner.ts --list

Options:
  --skill <name>    Skill to execute (e.g., investigate, review, qa)
  --arg <key> <val>  Pass argument to skill (can be repeated)
  --help, -h        Show this help message
  --list, -l        List all available skills

Skill Format:
  Skills use ## Workflow + ## Execution format (not {{PREAMBLE}}):
  - ## Workflow: Describes the workflow/steps
  - ## Execution: Contains executable bash commands in \`\`\`bash blocks

Skill Locations:
  - harness/skills/<name>.md
  - harness/skills/<name>/SKILL.md
`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  if (args.list) {
    const skills = listSkills();
    if (skills.length === 0) {
      console.log("No skills found in harness/skills/");
    } else {
      console.log("Available skills:");
      skills.forEach((s) => console.log(`  - ${s}`));
    }
    return;
  }

  if (!args.skill) {
    console.error("❌ Error: --skill is required");
    console.error("Run with --help for usage information");
    process.exit(1);
  }

  const skillFile = findSkillFile(args.skill);
  if (!skillFile) {
    console.error(`❌ Error: Skill '${args.skill}' not found`);
    console.error(`Searched in: harness/skills/${args.skill}.md, harness/skills/${args.skill}/SKILL.md`);
    console.error(`\nRun with --list to see available skills`);
    process.exit(1);
  }

  console.log(`📖 Loading skill from: ${skillFile}`);

  const skill = parseSkill(skillFile);
  if (!skill) {
    console.error(`❌ Error: Failed to parse skill '${args.skill}'`);
    console.error(`Skill must have ## Workflow and/or ## Execution sections`);
    process.exit(1);
  }

  const argMap: Record<string, string> = {};
  for (const a of args.arg || []) {
    const [key, value] = a.split("=");
    if (key && value !== undefined) {
      argMap[key] = value;
    }
  }

  await executeSkill(skill, argMap);
}

export { parseSkill, findSkillFile, parseWorkflowAndExecution, extractBashCommands, executeBash };

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
