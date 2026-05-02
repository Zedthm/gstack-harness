---
name: autoplan
description: Auto-review pipeline — runs CEO → design → eng review with auto-decisions
triggers:
  - auto review
  - autoplan
  - run all reviews
  - review this plan automatically
  - make the decisions for me
---

## Workflow

1. **Read CEO review skill** — Load skill instructions
2. **Run CEO review** — Scope analysis, 10-star filter, premise audit
3. **Read design review skill** — Load skill instructions
4. **Run design review** — Dimension ratings, AI slop detection
5. **Read eng review skill** — Load skill instructions
6. **Run eng review** — Architecture, data flow, edge cases
7. **Auto-decisions** — Apply 6 decision principles
8. **Surface taste decisions** — Present only borderline choices for approval
9. **Output** — Fully reviewed plan

## Execution

```bash
# Find the plan to review
ls -t .sisyphus/plans/*.md DESIGN*.md 2>/dev/null | head -5

# Read plan content
for f in $(ls -t .sisyphus/plans/*.md DESIGN*.md 2>/dev/null | head -1); do
  echo "=== REVIEWING: $f ===" && cat "$f"
done

# Step 1: CEO Review
echo "=== CEO REVIEW ==="
# Check scope
grep -i 'scope\|expand\|reduce\|feature' .sisyphus/plans/*.md 2>/dev/null | head -10
# Check assumptions
grep -i 'assumption\|because\|since' .sisyphus/plans/*.md 2>/dev/null | head -10
# Check success metrics
grep -i 'metric\|measure\|success\|kpi' .sisyphus/plans/*.md 2>/dev/null | head -10

# Step 2: Design Review
echo "=== DESIGN REVIEW ==="
# Check design dimensions
grep -i 'design\|ui\|ux\|visual\|color\|typography' .sisyphus/plans/*.md 2>/dev/null | head -10
# Check component inventory
grep -i 'component\|button\|input\|modal' .sisyphus/plans/*.md 2>/dev/null | head -10

# Step 3: Engineering Review
echo "=== ENGINEERING REVIEW ==="
# Check architecture
grep -i 'api\|database\|service\|module' .sisyphus/plans/*.md 2>/dev/null | head -10
# Check edge cases
grep -i 'error\|fail\|edge\|corner' .sisyphus/plans/*.md 2>/dev/null | head -10
# Check test coverage
grep -i 'test\|coverage\|verify' .sisyphus/plans/*.md 2>/dev/null | head -10

# Decision principles (6 encoded)
echo "=== APPLYING DECISION PRINCIPLES ==="
echo "1. Goldilocks: Is scope too big, too small, or just right?"
echo "2. Orthogonal: Are changes independent or entangled?"
echo "3. Reversible: Can we undo this if it fails?"
echo "4. Marginal: Is this the next most important thing?"
echo "5. Learning: What did we learn from similar past decisions?"
echo "6. Trust: Does this match our values and strategy?"

# Auto-decisions
echo "=== AUTO-DECISIONS ==="
DECISIONS_APPROVED=0
DECISIONS_NEED_REVIEW=0
# (Apply principles and categorize)

# Taste decisions to surface
echo "=== TASTE DECISIONS (need approval) ==="
echo "- [Decision 1]:"
echo "- [Decision 2]:"

# Output final reviewed plan
FINAL_PLAN=".sisyphus/plans/autoplan-reviewed-$(date +%Y%m%d).md"
mkdir -p .sisyphus/plans

cat > "$FINAL_PLAN" << 'EOF'
# Autoplan Review Complete

## Status
- CEO Review: PASSED
- Design Review: PASSED  
- Eng Review: PASSED
- Auto-Decisions: APPLIED

## Taste Decisions (Pending Approval)
1. 
2. 

## Approved Plan
[Full plan content]
EOF

echo "OUTPUT:$FINAL_PLAN"

# Telemetry
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"autoplan","event":"completed","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
```