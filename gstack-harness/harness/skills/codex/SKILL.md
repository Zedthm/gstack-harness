---
name: codex
description: OpenAI Codex CLI wrapper — three modes: review, challenge, consult
triggers:
  - codex review
  - codex challenge
  - ask codex
  - second opinion
  - consult codex
---

## Workflow

1. **Check Codex CLI** — Verify codex is installed and authenticated
2. **Choose mode** — REVIEW (pass/fail gate), CHALLENGE (adversarial), CONSULT (session)
3. **Run Codex** — Execute codex with appropriate prompt
4. **Collect results** — Parse Codex output
5. **Cross-model analysis** — Compare with /review findings (if both run)
6. **Output** — Structured findings with confidence

## Execution

```bash
# Check Codex installation
if [ -x "$(command -v codex)" ]; then
  echo "CODEX:installed"
  codex --version 2>/dev/null || echo "CODEX:version_unknown"
else
  echo "CODEX:not_installed"
  echo "Install: npm install -g @openai/codex"
fi

# Check authentication
codex auth status 2>/dev/null && echo "CODEX_AUTH:ok" || echo "CODEX_AUTH:failed"

# Get the diff to review
BRANCH=$(git branch --show-current)
git fetch origin main --quiet 2>/dev/null || git fetch origin master --quiet 2>/dev/null
git diff origin/main --stat 2>/dev/null | head -20 || git diff origin/master --stat 2>/dev/null | head -20

# Mode selection
MODE="${1:-review}"
echo "MODE:$MODE"

# Execute Codex based on mode
if [ "$MODE" = "review" ]; then
  echo "=== CODEX REVIEW MODE ==="
  codex review --diff <(git diff origin/main 2>/dev/null || git diff origin/master) 2>/dev/null | head -50

elif [ "$MODE" = "challenge" ]; then
  echo "=== CODEX CHALLENGE MODE ==="
  codex challenge --diff <(git diff origin/main 2>/dev/null || git diff origin/master) 2>/dev/null | head -50

elif [ "$MODE" = "consult" ]; then
  echo "=== CODEX CONSULT MODE ==="
  codex consult --session .gstack/codex-session.json 2>/dev/null | head -50
fi

# Cross-model analysis (if /review findings exist)
if [ -f ".gstack/review-findings.json" ]; then
  echo "=== CROSS-MODEL ANALYSIS ==="
  echo "Comparing Codex findings with Claude /review findings..."
  # Compare JSON outputs
  codex analyze --compare ".gstack/review-findings.json" 2>/dev/null | head -30 || echo "COMPARE:unavailable"
fi

# Parse and persist findings
mkdir -p .gstack/codex
cat > .gstack/codex/findings.json << 'EOF'
{
  "mode": "",
  "findings": [],
  "timestamp": ""
}
EOF

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"codex","event":"completed","mode":"'"$MODE"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```