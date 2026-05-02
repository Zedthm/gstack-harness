---
name: cso
description: Chief Security Officer mode — OWASP Top 10 + STRIDE threat model, secrets archaeology
triggers:
  - security audit
  - threat model
  - pentest review
  - OWASP
  - CSO review
  - see-so
  - security review
  - security check
  - vulnerability scan
---

## Workflow

1. **Secrets archaeology** — Scan for exposed API keys, tokens, passwords
2. **Dependency audit** — Check for vulnerable dependencies
3. **CI/CD security** — Analyze pipeline for injection risks
4. **OWASP Top 10** — Check each category against the codebase
5. **STRIDE threat model** — Analyze for Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation
6. **LLM/AI security** — Check prompt injection vectors, data exfiltration paths
7. **Skill supply chain** — Verify skill files haven't been tampered with
8. **Output** — Security report with confidence scores

## Execution

```bash
# Secrets archaeology - scan for exposed secrets
echo "=== SCANNING FOR SECRETS ==="
grep -rE '(api[_-]?key|secret[_-]?key|token|password|credential)' --include='*.go' --include='*.ts' --include='*.js' --include='*.py' --include='*.yaml' --include='*.json' -l . 2>/dev/null | grep -v node_modules | grep -v .git | head -20

# Check environment files
cat .env 2>/dev/null | head -5 || echo "NO_ENV_FILE"
cat .env.example 2>/dev/null | head -5 || echo "NO_ENV_EXAMPLE"

# Git history secrets scan
git log --all -p --source --remotes 2>/dev/null | grep -iE '(api[_-]?key|secret|token|password)=["'\''][^"'\'']{8,}["'\'']' | head -10

# Dependency vulnerabilities
[ -f package.json ] && npm audit --audit-level=high 2>/dev/null | head -30 || echo "NPM_AUDIT:unavailable"
[ -f go.mod ] && go verify ./... 2>/dev/null | head -20 || echo "GO_VERIFY:unavailable"
[ -f requirements.txt ] && pip audit 2>/dev/null | head -20 || echo "PIP_AUDIT:unavailable"

# CI/CD security
cat .github/workflows/*.yml 2>/dev/null | grep -E 'run:|command:|script:' | head -20 || echo "NO_GITHUB_ACTIONS"
cat .gitlab-ci.yml 2>/dev/null | head -30 || echo "NO_GITLAB_CI"

# OWASP Top 10 checks
echo "=== OWASP A1: INJECTION ==="
grep -rE '(exec|eval|system)\s*\(' --include='*.go' --include='*.ts' --include='*.js' --include='*.py' -l . 2>/dev/null | grep -v node_modules | head -10

echo "=== OWASP A2: AUTH FAILURES ==="
grep -rE '(auth|login|password).*==' --include='*.go' --include='*.ts' --include='*.py' -l . 2>/dev/null | head -10

echo "=== OWASP A3: SENSITIVE DATA ==="
grep -rE '(ssn|credit|card|secret|private[_-]?key)' --include='*.go' --include='*.ts' --include='*.py' -l . 2>/dev/null | grep -v node_modules | head -10

# LLM/AI security
grep -rE '(system[_-]?prompt|user[_-]?input|saniti)' --include='*.go' --include='*.ts' --include='*.py' -l . 2>/dev/null | head -10

# Skill supply chain verification
ls -la .claude/skills/*/SKILL.md 2>/dev/null | head -20
git status .claude/skills/ 2>/dev/null | head -10

# STRIDE analysis
echo "=== STRIDE ANALYSIS ==="
echo "S - Spoofing: Check authentication bypass patterns"
echo "T - Tampering: Check for SQL/NoSQL injection"
echo "R - Repudiation: Check audit logging"
echo "I - Info Disclosure: Check data exposure"
echo "D - Denial of Service: Check rate limiting"
echo "E - Elevation of Privilege: Check authorization"

# Create security report
mkdir -p .gstack/security-audit
cat > .gstack/security-audit/report.md << 'EOF'
# Security Audit Report

## Confidence Level: X/10

## Findings

### Critical
- 

### High
- 

### Medium
- 

### Low
- 

## False Positive Exclusions
- 
EOF

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"cso","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```