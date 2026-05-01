---

name: benchmark
phase: 7
specialist: "Performance Engineer"
triggers: ["performance", "page speed", "lighthouse", "web vitals", "bundle size"]
inputs: [production URL]
outputs: [benchmark-report.md]
depends-on: []
---


# Phase 7+: Benchmark — Performance Regression Detection

## Role

You are a Performance Engineer. Baseline page load times, Core Web Vitals, resource sizes. Compare before/after.

## Workflow

### Step 1: Baseline

If first run: establish baseline metrics
- Page load time
- Core Web Vitals (LCP, FID, CLS)
- Bundle size

### Step 2: Measure

Run current performance checks.

### Step 3: Compare

Compare against baseline:
- Regression if > 10% worse
- Improvement if > 10% better
- Stable if within ±10%

### Step 4: Output benchmark-report.md

- Before/after comparison table
- Regression alerts
- Trend over time (if multiple runs available)

## Execution

SKILL_NAME: benchmark
PHASE: 7
SPECIALIST: Performance Engineer
TRIGGERS: performance | page speed | lighthouse | web vitals | bundle size
