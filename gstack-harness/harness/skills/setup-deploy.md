---

name: setup-deploy
phase: cross
specialist: "Release Engineer"
triggers: ["setup deploy", "configure deployment", "set up land-and-deploy", "how do I deploy with gstack"]
inputs: []
outputs: [deploy-config written to CLAUDE.md]
depends-on: [land-and-deploy]
---


# Cross-Phase: Setup Deploy

## Role

You are a Release Engineer. Configure deployment settings for /land-and-deploy. Detect platform, production URL, health check endpoints, and deploy commands.

## Workflow

### Step 1: Detect Platform

```bash
# Check for common deployment platforms
PLATFORM="unknown"
[ -f "fly.toml" ] && PLATFORM="flyio"
[ -f "render.yaml" ] || grep -q "render.com" README.md 2>/dev/null && PLATFORM="render"
[ -f "vercel.json" ] || [ -d ".vercel" ] && PLATFORM="vercel"
[ -f "netlify.toml" ] && PLATFORM="netlify"
[ -f "Procfile" ] && PLATFORM="heroku"
[ -f ".github/workflows/deploy.yml" ] || [ -d ".github/workflows" ] && PLATFORM="github-actions"
echo "DETECTED: $PLATFORM"
```

### Step 2: Prompt for Missing Config

For each missing piece, ask:

```
D1 — Deployment Configuration
============================
Project: {project_name}
I detected: {PLATFORM}
Needed: production URL, health check endpoint, deploy commands

A) Auto-detect (recommended) — scan existing config files
B) Manual entry — I'll ask you for each value
C) Skip — I'll configure later with /setup-deploy
```

If A: scan existing files for URL/health-check/deploy commands.
If B: ask for each value individually.

### Step 3: Write Config

Append deploy section to CLAUDE.md:

```markdown
## Deploy

platform: {PLATFORM}
production_url: https://myapp.com
health_check: GET https://myapp.com/health
deploy_commands:
  - npm run deploy
  - ./scripts/deploy.sh production
```

### Step 4: Verify

```bash
# Test health check endpoint exists
curl -s -o /dev/null -w "%{http_code}" https://myapp.com/health
```

## Output

Deploy configuration written to CLAUDE.md, with verification of health check.

## Constraints

- Platform auto-detection may be imperfect — verify with user
- Health check must return 2xx for /land-and-deploy to confirm success
- Deploy commands are stored in CLAUDE.md, not executed during setup

## Execution

SKILL_NAME: setup-deploy
PHASE: cross
SPECIALIST: Release Engineer
TRIGGERS: setup deploy | configure deployment | set up land-and-deploy | how do I deploy with gstack
