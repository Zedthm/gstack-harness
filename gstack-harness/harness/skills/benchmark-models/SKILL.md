---
name: benchmark-models
description: Cross-model benchmark — compare Claude, GPT, Gemini latency, tokens, cost, quality
triggers:
  - benchmark models
  - compare models
  - which model is best for X
  - cross-model comparison
  - model shootout
---

## Workflow

1. **Detect available models** — Check for Claude, GPT (via Codex), Gemini
2. **Prepare prompt** — Use same prompt across all models
3. **Run benchmarks** — Execute same task on each model
4. **Collect metrics** — Latency, tokens, cost
5. **Quality evaluation** — Optional LLM judge for quality score
6. **Output comparison** — Table with results

## Execution

```bash
# Check for available models
echo "=== AVAILABLE MODELS ==="

# Claude
if command -v claude &>/dev/null; then
  echo "CLAUDE:available"
else
  echo "CLAUDE:not_available"
fi

# OpenAI GPT via Codex CLI
if command -v codex &>/dev/null; then
  echo "GPT:available_via_codex"
  codex --version 2>/dev/null
else
  echo "GPT:not_available"
fi

# Google Gemini
if command -v gemini &>/dev/null; then
  echo "GEMINI:available"
  gemini --version 2>/dev/null
else
  echo "GEMINI:not_available"
fi

# Check API keys
[ -n "$ANTHROPIC_API_KEY" ] && echo "ANTHROPIC_KEY:set" || echo "ANTHROPIC_KEY:missing"
[ -n "$OPENAI_API_KEY" ] && echo "OPENAI_KEY:set" || echo "OPENAI_KEY:missing"
[ -n "$GEMINI_API_KEY" ] && echo "GEMINI_KEY:set" || echo "GEMINI_KEY:missing"

# Prompt to benchmark
BENCHMARK_PROMPT="${1:-'Write a hello world function in Python with type hints and a docstring.'}"
echo "BENCHMARK_PROMPT:$BENCHMARK_PROMPT"

# Create benchmark directory
BM_DIR=".gstack/model-benchmark/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BM_DIR"

# Benchmark Claude
if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "=== BENCHMARKING CLAUDE ==="
  START=$(date +%s%N)
  claude -p "$BENCHMARK_PROMPT" 2>/dev/null > "$BM_DIR/claude_output.txt"
  CLAUDE_DURATION=$((($(date +%s%N) - START) / 1000000))
  CLAUDE_TOKENS=$(wc -c < "$BM_DIR/claude_output.txt")
  echo "CLAUDE:${CLAUDE_DURATION}ms,${CLAUDE_TOKENS}chars"
fi

# Benchmark GPT via Codex
if [ -n "$OPENAI_API_KEY" ]; then
  echo "=== BENCHMARKING GPT ==="
  START=$(date +%s%N)
  echo "$BENCHMARK_PROMPT" | codex - 2>/dev/null > "$BM_DIR/gpt_output.txt"
  GPT_DURATION=$((($(date +%s%N) - START) / 1000000))
  GPT_TOKENS=$(wc -c < "$BM_DIR/gpt_output.txt")
  echo "GPT:${GPT_DURATION}ms,${GPT_TOKENS}chars"
fi

# Benchmark Gemini
if [ -n "$GEMINI_API_KEY" ]; then
  echo "=== BENCHMARKING GEMINI ==="
  START=$(date +%s%N)
  curl -s -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -d "{\"contents\":[{\"parts\":[{\"text\":\"$BENCHMARK_PROMPT\"}]}]}" 2>/dev/null > "$BM_DIR/gemini_output.txt"
  GEMINI_DURATION=$((($(date +%s%N) - START) / 1000000))
  GEMINI_TOKENS=$(wc -c < "$BM_DIR/gemini_output.txt")
  echo "GEMINI:${GEMINI_DURATION}ms,${GEMINI_TOKENS}chars"
fi

# Output comparison table
echo "=== BENCHMARK RESULTS ==="
cat << 'EOF'
| Model | Latency | Tokens | Cost | Quality |
|-------|---------|--------|------|---------|
| Claude | Xms | Y | $Z | TBD |
| GPT | Xms | Y | $Z | TBD |
| Gemini | Xms | Y | $Z | TBD |
EOF

# Save results
cat > "$BM_DIR/results.json" << 'EOF'
{
  "timestamp": "",
  "prompt": "",
  "models": {
    "claude": { "latency_ms": 0, "tokens": 0 },
    "gpt": { "latency_ms": 0, "tokens": 0 },
    "gemini": { "latency_ms": 0, "tokens": 0 }
  }
}
EOF

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"benchmark-models","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```