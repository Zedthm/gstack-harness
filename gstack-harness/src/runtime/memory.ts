#!/usr/bin/env bun
/**
 * AutoMemory - Memory interface with LLM-powered extraction
 *
 * Usage:
 *   bun run src/runtime/memory.ts --save --agent <id> --type <type> --content <text>
 *   bun run src/runtime/memory.ts --recall --agent <id> --query <text>
 *   bun run src/runtime/memory.ts --extract --agent <id> --content <text>
 *
 * Memory types (taxonomy):
 *   skill-patterns     - Recurring code patterns, patterns learned
 *   error-patterns     - Bug patterns, errors encountered and their solutions
 *   project-context    - Project-specific decisions, architecture, conventions
 *   user-preferences   - User's preferences, workflow habits
 *
 * Storage: $CWD/.gstack-harness/memory/
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { resolveApiKey, requireApiKey } from "../../design/src/auth.ts";

// =============================================================================
// Types
// =============================================================================

type MemoryType = "skill-patterns" | "error-patterns" | "project-context" | "user-preferences";

interface MemoryEntry {
  id: string;
  agent_id: string;
  memory_type: MemoryType;
  content: string;
  extracted_content?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface ExtractedMemory {
  summary: string;
  key_points: string[];
  tags: string[];
  memory_type?: MemoryType;
  confidence: "high" | "medium" | "low";
}

interface CliArgs {
  save?: boolean;
  recall?: boolean;
  extract?: boolean;
  agent?: string;
  type?: MemoryType;
  content?: string;
  query?: string;
  help?: boolean;
}

// =============================================================================
// Paths
// =============================================================================

function getMemoryDir(): string {
  // Memory lives at $CWD/.gstack-harness/memory/ (distinct from .gstack/ used by browse)
  const cwd = process.cwd();
  return join(cwd, ".gstack-harness", "memory");
}

function getMemoryFile(memoryType: MemoryType): string {
  return join(getMemoryDir(), `${memoryType}.jsonl`);
}

function ensureMemoryDir(): void {
  const dir = getMemoryDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
}

// =============================================================================
// Storage
// =============================================================================

function loadEntries(memoryType: MemoryType): MemoryEntry[] {
  const filePath = getMemoryFile(memoryType);
  const entries: MemoryEntry[] = [];

  try {
    const content = readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        entries.push(JSON.parse(trimmed));
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File doesn't exist yet — return empty
  }

  return entries;
}

function saveEntry(entry: MemoryEntry): void {
  ensureMemoryDir();
  const filePath = getMemoryFile(entry.memory_type);
  writeFileSync(filePath, JSON.stringify(entry) + "\n", { flag: "a" });
}

// =============================================================================
// LLM Extraction
// =============================================================================

interface ExtractionPrompt {
  memory_type: MemoryType;
  raw_content: string;
  agent_id: string;
}

function buildExtractionPrompt(prompt: ExtractionPrompt): string {
  const typeDescriptions: Record<MemoryType, string> = {
    "skill-patterns": "code patterns, architectural approaches, effective techniques",
    "error-patterns": "bugs encountered, error messages, solutions that worked",
    "project-context": "project architecture decisions, conventions, design patterns",
    "user-preferences": "user's workflow preferences, tools they prefer, communication style",
  };

  return `Extract structured memory from the following content.

Agent ID: ${prompt.agent_id}
Memory Type: ${prompt.memory_type}
Description: ${typeDescriptions[prompt.memory_type]}

Raw Content:
${prompt.raw_content}

Respond with a JSON object (no markdown, no explanation):
{
  "summary": "2-3 sentence summary of what to remember",
  "key_points": ["specific thing 1", "specific thing 2", "specific thing 3"],
  "tags": ["tag1", "tag2", "tag3"],
  "memory_type": "${prompt.memory_type}",
  "confidence": "high|medium|low"
}

Be concise and specific. Focus on actionable details, not vague generalities.`;
}

/**
 * Call OpenAI Chat Completions API for structured extraction.
 * Uses the same auth resolution as design/src/auth.ts
 */
async function callLLM(prompt: string): Promise<ExtractedMemory | null> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.warn("[AutoMemory] No OpenAI API key found. Run `setup` or set OPENAI_API_KEY.");
    console.warn("[AutoMemory] Skipping extraction, saving raw content only.");
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[AutoMemory] OpenAI API error ${response.status}: ${errorText.slice(0, 200)}`);
      return null;
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Parse JSON response
    const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    return JSON.parse(cleaned) as ExtractedMemory;
  } catch (err) {
    console.warn(`[AutoMemory] Extraction failed:`, err);
    return null;
  }
}

// =============================================================================
// Memory Interface
// =============================================================================

/**
 * Generate a unique ID for a memory entry.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Save a memory entry, optionally performing background extraction.
 */
async function save(
  agentId: string,
  memoryType: MemoryType,
  content: string,
  options: { backgroundExtract?: boolean } = {},
): Promise<MemoryEntry> {
  const now = new Date().toISOString();
  const entry: MemoryEntry = {
    id: generateId(),
    agent_id: agentId,
    memory_type: memoryType,
    content,
    created_at: now,
    updated_at: now,
  };

  // Persist the raw entry immediately
  saveEntry(entry);

  if (options.backgroundExtract) {
    // Fire-and-forget extraction — does not block
    (async () => {
      try {
        const extracted = await extract(agentId, content, memoryType);
        if (extracted) {
          // Update entry with extracted content
          entry.extracted_content = extracted;
          entry.updated_at = new Date().toISOString();
        }
      } catch (err) {
        console.warn(`[AutoMemory] Background extraction failed for entry ${entry.id}:`, err);
      }
    })();
  } else {
    // Synchronous extraction
    const extracted = await extract(agentId, content, memoryType);
    if (extracted) {
      entry.extracted_content = extracted;
      entry.updated_at = new Date().toISOString();
    }
  }

  return entry;
}

/**
 * Extract structured information from raw content using LLM.
 */
async function extract(
  agentId: string,
  rawContent: string,
  memoryType: MemoryType,
): Promise<Record<string, unknown> | null> {
  const prompt = buildExtractionPrompt({ agent_id: agentId, memory_type: memoryType, raw_content: rawContent });
  const result = await callLLM(prompt);
  return result ?? null;
}

/**
 * Search memories for an agent matching a query.
 * Uses simple content search — not semantic embedding.
 */
async function recall(agentId: string, query: string): Promise<MemoryEntry[]> {
  const queryLower = query.toLowerCase();
  const allTypes: MemoryType[] = ["skill-patterns", "error-patterns", "project-context", "user-preferences"];
  const results: MemoryEntry[] = [];

  for (const memoryType of allTypes) {
    const entries = loadEntries(memoryType);
    for (const entry of entries) {
      if (entry.agent_id !== agentId) continue;

      // Check if query matches raw content or extracted content
      const rawMatch = entry.content.toLowerCase().includes(queryLower);
      let extractedMatch = false;

      if (entry.extracted_content) {
        const extracted = entry.extracted_content as ExtractedMemory;
        const summaryMatch = extracted.summary?.toLowerCase().includes(queryLower) ?? false;
        const tagsMatch = extracted.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower)) ?? false;
        const keyPointsMatch = extracted.key_points?.some((kp: string) => kp.toLowerCase().includes(queryLower)) ?? false;
        extractedMatch = summaryMatch || tagsMatch || keyPointsMatch;
      }

      if (rawMatch || extractedMatch) {
        results.push(entry);
      }
    }
  }

  return results;
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);
  const args: CliArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--save") args.save = true;
    else if (arg === "--recall") args.recall = true;
    else if (arg === "--extract") args.extract = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--agent") args.agent = argv[++i];
    else if (arg === "--type") args.type = argv[++i] as MemoryType;
    else if (arg === "--content") args.content = argv[++i];
    else if (arg === "--query") args.query = argv[++i];
  }

  return args;
}

function printHelp(): void {
  console.log(`
AutoMemory - Memory interface with LLM-powered extraction

Usage:
  bun run src/runtime/memory.ts --save --agent <id> --type <type> --content <text>
  bun run src/runtime/memory.ts --recall --agent <id> --query <text>
  bun run src/runtime/memory.ts --extract --agent <id> --type <type> --content <text>

Commands:
  --save              Save a memory entry
  --recall            Search memories for an agent
  --extract           Extract structured info (no save)

Options:
  --agent <id>        Agent identifier (required)
  --type <type>       Memory type: skill-patterns, error-patterns, project-context, user-preferences
  --content <text>    Content to save or extract
  --query <text>      Search query for recall
  --help, -h          Show this help

Memory Types:
  skill-patterns      Code patterns, architectural approaches, techniques
  error-patterns      Bugs, errors, and their solutions
  project-context     Architecture decisions, conventions
  user-preferences    User's workflow preferences

Storage: $CWD/.gstack-harness/memory/

Examples:
  bun run src/runtime/memory.ts --save --agent user1 --type error-patterns --content "React useEffect cleanup: always removeEventListener in return"
  bun run src/runtime/memory.ts --recall --agent user1 --query "React"
  bun run src/runtime/memory.ts --extract --agent user1 --type skill-patterns --content "TypeScript generics are great for type-safe APIs"
`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help || (!args.save && !args.recall && !args.extract)) {
    printHelp();
    return;
  }

  if (!args.agent) {
    console.error("Error: --agent is required");
    process.exit(1);
  }

  if (args.save) {
    if (!args.type) {
      console.error("Error: --type is required for --save");
      process.exit(1);
    }
    if (!args.content) {
      console.error("Error: --content is required for --save");
      process.exit(1);
    }

    const validTypes: MemoryType[] = ["skill-patterns", "error-patterns", "project-context", "user-preferences"];
    if (!validTypes.includes(args.type)) {
      console.error(`Error: --type must be one of: ${validTypes.join(", ")}`);
      process.exit(1);
    }

    const entry = await save(args.agent, args.type, args.content, { backgroundExtract: true });
    console.log(`[AutoMemory] Saved entry ${entry.id}`);
    console.log(`  Type: ${entry.memory_type}`);
    console.log(`  Content: ${entry.content.slice(0, 100)}${entry.content.length > 100 ? "..." : ""}`);
    if (entry.extracted_content) {
      const extracted = entry.extracted_content as ExtractedMemory;
      console.log(`  Extracted: ${extracted.summary}`);
    } else {
      console.log(`  Extracted: (async extraction running in background)`);
    }
  } else if (args.recall) {
    if (!args.query) {
      console.error("Error: --query is required for --recall");
      process.exit(1);
    }

    const results = await recall(args.agent, args.query);
    if (results.length === 0) {
      console.log(`[AutoMemory] No memories found for "${args.query}"`);
      return;
    }

    console.log(`[AutoMemory] Found ${results.length} memory(ies):\n`);
    for (const entry of results) {
      console.log(`--- ${entry.memory_type} [${entry.id}] ---`);
      console.log(`  Content: ${entry.content.slice(0, 200)}${entry.content.length > 200 ? "..." : ""}`);
      if (entry.extracted_content) {
        const extracted = entry.extracted_content as ExtractedMemory;
        console.log(`  Summary: ${extracted.summary}`);
        console.log(`  Tags: ${extracted.tags?.join(", ")}`);
      }
      console.log();
    }
  } else if (args.extract) {
    if (!args.type) {
      console.error("Error: --type is required for --extract");
      process.exit(1);
    }
    if (!args.content) {
      console.error("Error: --content is required for --extract");
      process.exit(1);
    }

    const validTypes: MemoryType[] = ["skill-patterns", "error-patterns", "project-context", "user-preferences"];
    if (!validTypes.includes(args.type)) {
      console.error(`Error: --type must be one of: ${validTypes.join(", ")}`);
      process.exit(1);
    }

    console.log("[AutoMemory] Extracting...");
    const extracted = await extract(args.agent, args.content, args.type);
    if (extracted) {
      console.log(JSON.stringify(extracted, null, 2));
    } else {
      console.error("[AutoMemory] Extraction failed or no API key");
      process.exit(1);
    }
  }
}

export { save, recall, extract, saveEntry, loadEntries, generateId, getMemoryDir, type MemoryEntry, type ExtractedMemory, type MemoryType };

main().catch((err) => {
  console.error("[AutoMemory] Fatal error:", err);
  process.exit(1);
});
