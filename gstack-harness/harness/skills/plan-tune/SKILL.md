---
name: plan-tune
description: Self-tuning question sensitivity — set per-question preferences, developer psychographic profile
triggers:
  - tune questions
  - stop asking me that
  - too many questions
  - show my profile
  - what questions have I been asked
  - show my vibe
  - developer profile
  - turn off question tuning
---

## Workflow

1. **Inspect question history** — Show all AskUserQuestion prompts fired across skills
2. **Set preferences** — Configure per-question: never-ask / always-ask / ask-only-for-one-way
3. **Dual-track profile** — Compare declared preferences vs behavior
4. **Psychographic analysis** — Inferred developer style from question patterns
5. **Enable/disable tuning** — Turn question tuning on or off

## Execution

```bash
# Check for question tuning config
QUESTION_CONFIG="$HOME/.claude/skills/gstack/config/question-tuning.json"
[ -f "$QUESTION_CONFIG" ] && echo "CONFIG_EXISTS" || echo "CONFIG:new"

# Read question tuning config
cat "$QUESTION_CONFIG" 2>/dev/null | head -50

# Inspect question history
QUESTION_HISTORY="$HOME/.claude/skills/gstack/logs/questions.jsonl"
if [ -f "$QUESTION_HISTORY" ]; then
  echo "=== QUESTIONS ASKED (recent) ==="
  tail -20 "$QUESTION_HISTORY" 2>/dev/null
else
  echo "NO_QUESTION_HISTORY"
fi

# Scan skills for AskUserQuestion usage
echo "=== SKILLS WITH QUESTIONS ==="
grep -r 'AskUserQuestion\|AskUser' --include='*.md' -l ~/.claude/skills/gstack/ 2>/dev/null | head -10

# Extract question prompts from skill files
echo "=== QUESTION PROMPTS ==="
grep -rh 'AskUserQuestion\|Ask user' --include='*.md' -A 2 ~/.claude/skills/gstack/ 2>/dev/null | head -30

# Developer profile inference
echo "=== PSYCHOGRAPHIC PROFILE ==="
echo "Based on question patterns:"
echo "- Declarative vs Imperative: "
echo "- Self-sufficient vs Collaborative: "
echo "- Fast vs Thorough: "
echo "- Scope preference: "

# Set a question preference
echo "=== SET PREFERENCE ==="
cat > "$QUESTION_CONFIG" << 'EOF'
{
  "question_tuning_enabled": true,
  "preferences": {
    "scope_confirm": "never-ask",
    "tech_choice": "ask-once",
    "test_framework": "always-ask"
  }
}
EOF

# Profile comparison
echo "=== DUAL-TRACK PROFILE ==="
echo "Declared: $(grep 'declared_' "$QUESTION_CONFIG" 2>/dev/null || echo 'not set')"
echo "Behavioral: $(grep 'behavioral_' "$QUESTION_CONFIG" 2>/dev/null || echo 'not set')"

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"plan-tune","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```