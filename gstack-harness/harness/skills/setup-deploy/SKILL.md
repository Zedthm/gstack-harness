---
name: setup-deploy
description: Configure deployment settings for /land-and-deploy — detect platform, production URL, commands
triggers:
  - setup deploy
  - configure deployment
  - set up land-and-deploy
  - how do I deploy with gstack
  - add deploy config
---

## Workflow

1. **Detect platform** — Fly.io, Render, Vercel, Netlify, Heroku, GitHub Actions, custom
2. **Detect production URL** — Find the deployed application URL
3. **Detect health check endpoint** — Find or verify health check path
4. **Detect deploy commands** — Find platform-specific deploy commands
5. **Write CLAUDE.md config** — Persist configuration for future deploys

## Execution

```bash
# Platform detection
echo "=== DETECTING DEPLOY PLATFORM ==="

if [ -f "fly.toml" ]; then
  echo "PLATFORM:fly.io"
  fly info 2>/dev/null | head -5
  fly apps list 2>/dev/null | head -5
elif [ -f "render.yaml" ]; then
  echo "PLATFORM:render"
elif [ -f "vercel.json" ] || [ -f ".vercel/project.json" ]; then
  echo "PLATFORM:vercel"
elif [ -f "netlify.toml" ]; then
  echo "PLATFORM:netlify"
elif [ -f "app.json" ]; then
  echo "PLATFORM:heroku"
elif [ -d ".github/workflows" ]; then
  echo "PLATFORM:github-actions"
  ls .github/workflows/*.yml 2>/dev/null | head -5
else
  echo "PLATFORM:unknown"
fi

# Git remote analysis
GIT_REMOTE=$(git remote get-url origin 2>/dev/null)
echo "GIT_REMOTE:$GIT_REMOTE"

# Detect production URL from various sources
echo "=== DETECTING PRODUCTION URL ==="

# From CLAUDE.md
PROD_URL=$(grep -oE 'https?://[^ ]+' CLAUDE.md 2>/dev/null | grep -v localhost | head -1)
echo "FROM_CLAUDE_MD:$PROD_URL"

# From fly.toml
[ -f "fly.toml" ] && grep -oE 'https?://[a-zA-Z0-9.-]+' fly.toml | head -1

# From Vercel
[ -f ".vercel/project.json" ] && cat .vercel/project.json | grep -oE '"url": "[^"]*"' | head -1

# Health check endpoint detection
echo "=== HEALTH CHECK ENDPOINTS ==="
for endpoint in "/health" "/api/health" "/status" "/"; do
  if curl -s -o /dev/null -w "%{http_code}" "https://example.com$endpoint" 2>/dev/null | grep -qE '200|301|302'; then
    echo "HEALTH_ENDPOINT:$endpoint"
    break
  fi
done

# Deploy commands detection
echo "=== DEPLOY COMMANDS ==="
[ -f "package.json" ] && grep -E '"deploy"|"start"|"serve"' package.json | head -3
[ -f "Makefile" ] && grep -E '^deploy:' Makefile | head -3
[ -f "fly.toml" ] && echo "fly deploy"
[ -f "render.yaml" ] && echo "render deploy"
[ -f ".github/workflows/*.yml" ] && echo "git push to main"

# Write configuration to CLAUDE.md
echo ""
echo "=== CONFIGURATION SUMMARY ==="
PLATFORM=${PLATFORM:-unknown}
echo "Platform: $PLATFORM"
echo "Production URL: ${PROD_URL:-not detected}"
echo "Health check: ${HEALTH_ENDPOINT:-not detected}"

# Persist to CLAUDE.md
mkdir -p .gstack
cat > .gstack/deploy-config.json << EOF
{
  "platform": "$PLATFORM",
  "production_url": "$PROD_URL",
  "health_endpoint": "$HEALTH_ENDPOINT",
  "configured_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"setup-deploy","event":"completed","platform":"'"$PLATFORM"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```