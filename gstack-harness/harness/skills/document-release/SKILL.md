---
name: document-release
description: Update all project docs to match what you just shipped — README, ARCHITECTURE, CHANGELOG
triggers:
  - update the docs
  - sync documentation
  - post-ship docs
---

## Workflow

1. **Read all docs** — Load README, ARCHITECTURE, CONTRIBUTING, CHANGELOG
2. **Read diff** — Get the changes from last commit/merge
3. **Cross-reference** — Match diff against each doc section
4. **Update stale content** — Fix outdated instructions, commands, references
5. **CHANGELOG update** — Add entry for this release
6. **TODOS cleanup** — Remove completed TODOs, note deferred items
7. **Verify** — Read back updated docs

## Execution

```bash
# Find all documentation files
find . -maxdepth 3 -type f \( -name 'README.md' -o -name 'ARCHITECTURE.md' -o -name 'CONTRIBUTING.md' -o -name 'CHANGELOG.md' -o -name 'TODO.md' -o -name 'TODOS.md' -o -name 'CLAUDE.md' \) | grep -v node_modules | grep -v .git

# Read existing docs
echo "=== README.md ===" && head -50 README.md
echo "=== CHANGELOG.md ===" && head -30 CHANGELOG.md
echo "=== ARCHITECTURE.md ===" && head -30 ARCHITECTURE.md 2>/dev/null || echo "NO_ARCHITECTURE"

# Get the diff from last commit
git log -1 --format="%H %s"
git diff HEAD~1 --stat 2>/dev/null | head -20

# Check for version bump
cat VERSION 2>/dev/null || git describe --tags 2>/dev/null || echo "NO_VERSION"
git log --oneline -5

# Analyze what changed
CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null)
echo "CHANGED:$CHANGED_FILES"

# Check for new commands/scripts
echo "$CHANGED_FILES" | grep -E 'bin/|scripts/|cmd/' | head -5

# Check for API changes
echo "$CHANGED_FILES" | grep -E 'api|route|endpoint' | head -5

# Check for dependency changes
git diff HEAD~1 -- package.json go.mod Cargo.toml requirements.txt 2>/dev/null | head -30

# Update CHANGELOG
VERSION=$(cat VERSION 2>/dev/null || git describe --tags 2>/dev/null || echo "0.0.0")
DATE=$(date +%Y-%m-%d)
cat >> CHANGELOG.md << EOF

## $VERSION ($DATE)

### Added
- (new feature)

### Changed
- (change)

### Fixed
- (fix)
EOF

# Check TODOS for completed items
grep -n '- \[' TODOS.md 2>/dev/null || grep -n 'TODO' TODO.md 2>/dev/null || echo "NO_TODOS"

# CLAUDE.md sync check
cat CLAUDE.md 2>/dev/null | head -50

# Create backup of docs before changes
mkdir -p .gstack/doc-backup/$(date +%Y%m%d)
cp README.md CHANGELOG.md ARCHITECTURE.md .gstack/doc-backup/$(date +%Y%m%d)/ 2>/dev/null || true

# Persist learnings about doc patterns
~/.claude/skills/gstack/bin/gstack-learnings-log '{"skill":"document-release","type":"pattern","key":"doc_update","insight":"Updated docs for release","confidence":5,"source":"session"}' 2>/dev/null || true

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"document-release","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```