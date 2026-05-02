---
name: hackernews-frontpage
description: Scrape Hacker News front page — titles, points, comment counts
triggers:
  - hackernews
  - hacker news frontpage
  - HN front page
---

## Workflow

1. **Fetch HN front page** — Get HTML from news.ycombinator.com
2. **Parse stories** — Extract title, points, comments, URL
3. **Format output** — Present in readable format
4. **Store for comparison** — Save baseline for change detection

## Execution

```bash
# Fetch Hacker News front page
echo "=== HACKER NEWS FRONTPAGE ==="
HN_HTML=$(curl -s "https://news.ycombinator.com/" 2>/dev/null)
echo "FETCHED:$(echo "$HN_HTML" | wc -c)bytes"

# Find title and URL pairs
echo "$HN_HTML" | grep -oE '<a class="titlelink"[^>]*href="([^"]*)"[^>]*>([^<]*)</a>' | head -20 | while IFS= read -r line; do
  URL=$(echo "$line" | grep -oE 'href="[^"]*"' | head -1 | sed 's/href="//;s/"//')
  TITLE=$(echo "$line" | grep -oE '>[^<]*<' | tr -d '><')
  echo "- $TITLE ($URL)"
done

# Alternative parsing with tr/grep
echo "$HN_HTML" | grep -A1 'class="titlelink"' | grep -v '^--' | head -40

# Points and comment counts
echo "=== STORY METRICS ==="
echo "$HN_HTML" | grep -oE '[0-9]+ points' | head -20
echo "$HN_HTML" | grep -oE '[0-9]+ comments' | head -20

# Store baseline
HackerNews_DIR=".gstack/hackernews"
mkdir -p "$HackerNews_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "$HN_HTML" > "$HackerNews_DIR/frontpage_$TIMESTAMP.html"

# Diff against previous
PREVIOUS=$(ls -t "$HackerNews_DIR"/frontpage_*.html 2>/dev/null | head -2 | tail -1)
if [ -n "$PREVIOUS" ]; then
  echo "=== CHANGES FROM PREVIOUS ==="
  diff "$PREVIOUS" "$HackerNews_DIR/frontpage_$TIMESTAMP.html" | head -30 || echo "NO_DIFF"
fi

# Format as structured output
cat << 'EOF'
# Hacker News Frontpage

| # | Title | Points | Comments |
|----|-------|--------|----------|
EOF

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"hackernews-frontpage","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```