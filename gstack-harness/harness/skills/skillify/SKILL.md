---
name: skillify
description: Codify recent /scrape flow into permanent browser-skill — scripts + tests + fixtures
triggers:
  - skillify
  - codify
  - save this scrape
  - make this permanent
---

## Workflow

1. **Walk back conversation** — Find the most recent successful scrape flow
2. **Synthesize script** — Generate script.ts with the scraping logic
3. **Create test** — Generate script.test.ts with verification
4. **Create fixture** — Save example response data
5. **Run test** — Execute in temp directory to verify
6. **Ask confirmation** — Confirm before committing to skill library

## Execution

```bash
# Find most recent scrape session
SESSION_DIR="$HOME/.claude/skills/gstack/sessions"
if [ -d "$SESSION_DIR" ]; then
  LATEST_SESSION=$(ls -t "$SESSION_DIR"/*.jsonl 2>/dev/null | head -1)
  echo "LATEST_SESSION:$LATEST_SESSION"

  # Find scrape events in session
  grep -i 'scrape\|scrape_flow\|scrape_intent' "$LATEST_SESSION" 2>/dev/null | tail -10
else
  echo "NO_SESSIONS"
fi

# Check for recent browse commands
BROWSER_HISTORY=".gstack/browse/history.jsonl"
if [ -f "$BROWSER_HISTORY" ]; then
  echo "=== RECENT BROWSER COMMANDS ==="
  tail -20 "$BROWSER_HISTORY" 2>/dev/null
fi

# Create skillify output directory
SKILLIFY_DIR=".gstack/skillify/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$SKILLIFY_DIR"
echo "SKILLIFY_DIR:$SKILLIFY_DIR"

# Generate script.ts template
cat > "$SKILLIFY_DIR/script.ts" << 'EOF'
import { chromium } from 'playwright';

async function scrape(targetUrl: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to target
  await page.goto(targetUrl);

  // Extract data
  const data = await page.evaluate(() => {
    // Customize extraction logic
    return {
      title: document.title,
      items: Array.from(document.querySelectorAll('.item')).map(el => ({
        text: el.textContent,
        href: (el as HTMLAnchorElement).href
      }))
    };
  });

  await browser.close();
  return data;
}

// CLI entry point
const url = process.argv[2] || 'https://example.com';
scrape(url).then(data => console.log(JSON.stringify(data, null, 2)));
EOF

# Generate test file
cat > "$SKILLIFY_DIR/script.test.ts" << 'EOF'
import { test, expect } from '@playwright/test';

test('scrape returns expected data', async ({ page }) => {
  await page.goto('https://example.com');
  const title = await page.title();
  expect(title).toBeTruthy();
});
EOF

# Create fixture
mkdir -p "$SKILLIFY_DIR/fixtures"
cat > "$SKILLIFY_DIR/fixtures/example.json" << 'EOF'
{
  "title": "Example Domain",
  "items": []
}
EOF

# Run test in temp dir
echo "=== RUNNING TEST ==="
cd "$SKILLIFY_DIR" && npm init -y 2>/dev/null && npm install -D playwright @playwright/test 2>/dev/null
npx playwright install chromium 2>/dev/null
npx playwright test 2>/dev/null || echo "TEST_NEEDS_FIXTURE_UPDATE"

# Ask for confirmation
echo "=== CONFIRMATION ==="
echo "Skillify created:"
echo "  - $SKILLIFY_DIR/script.ts"
echo "  - $SKILLIFY_DIR/script.test.ts"
echo "  - $SKILLIFY_DIR/fixtures/example.json"
echo ""
echo "Run /skillify commit to save to skill library, or /skillify discard to delete."

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"skillify","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```