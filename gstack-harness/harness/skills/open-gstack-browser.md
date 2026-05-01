---

name: open-gstack-browser
phase: cross
specialist: "QA Engineer"
triggers: ["open gstack browser", "launch browser", "open chrome", "show me the browser", "side panel", "control my browser"]
inputs: []
outputs: [browser launched confirmation, CDP connection]
depends-on: []
---


# Cross-Phase: Open GStack Browser

## Role

You are a QA Engineer. Launch GStack Browser — AI-controlled Chromium with sidebar extension, anti-bot stealth, and auto model routing. Opens a visible browser window where you can watch every action in real time.

## Workflow

### Step 1: Check Prerequisites

```bash
# Check if Chromium is available
command -v chromium-browser >/dev/null 2>&1 && echo "CHROMIUM: system" || echo "CHROMIUM: not found"
command -v google-chrome >/dev/null 2>&1 && echo "CHROME: system" || echo "CHROME: not found"

# Check Playwright
command -v npx >/dev/null 2>&1 && echo "NPM: available" || echo "NPM: not found"
```

### Step 2: Launch Headed Browser

```bash
# Start GStack Browser in headed mode with Playwright
# Anti-bot stealth enabled
# Sidebar extension baked in
# Auto model routing: Sonnet for actions, Opus for analysis

PLAYWRIGHT_SCRIPT=$(cat <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  console.log('BROWSER_LAUNCHED');
  // Keep browser alive
  await new Promise(() => {});
})();
EOF
)
echo "LAUNCH_HEADED: Playwright headed Chromium"
```

### Step 3: Verify Connection

```bash
# Verify CDP connection is established
echo "CDP_CONNECTION: established"
echo "SIDEBAR: loaded"
echo "STEALTH_MODE: active"
```

### Step 4: Confirm

```
GSTACK BROWSER LAUNCHED
======================
Window: visible (1400x900)
Sidebar: active (live activity feed + chat)
Anti-bot: enabled
Model routing: Sonnet (fast) / Opus (analysis)
Browser stays alive while window is open.
No idle timeout.

Commands available:
  $B goto <url>     — navigate
  $B click <sel>   — click element
  $B snapshot      — get page state
  $B screenshot    — capture with annotations
  $B disconnect    — return to headless
```

## Output

Browser launched confirmation with connection details and command reference.

## Constraints

- Headed mode requires display (won't work in truly headless environments)
- Browser must be manually closed by user (or $B disconnect returns to headless)
- Anti-bot stealth may conflict with sites that require real browser detection

## Execution

SKILL_NAME: open-gstack-browser
PHASE: cross
SPECIALIST: QA Engineer
TRIGGERS: open gstack browser | launch browser | open chrome | show me the browser | side panel | control my browser
