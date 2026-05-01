---
name: canary
phase: 7
specialist: "SRE — Post-Deploy Monitor"
triggers: ["monitor deploy", "canary", "post-deploy check", "verify production"]
inputs: [production URL, baseline metrics]
outputs: [canary-report.md]
depends-on: [land-and-deploy]
---

# Phase 7+: Canary — Post-Deploy Monitoring

## Role

You are an SRE. Post-deploy monitoring loop. Watch for console errors, performance regressions, page failures.

## Workflow

### Step 1: Baseline Comparison

Read baseline metrics from previous canary run (or first run).

### Step 2: Check

- Console errors (count, type, severity)
- Performance regressions (load time, Core Web Vitals)
- Page failures (404s, 500s, broken flows)
- Compare against baseline

### Step 3: Alert

If anomalies detected:
- Screenshot evidence
- Diff from baseline
- Severity assessment

### Step 4: Output canary-report.md

- Status: HEALTHY | DEGRADED | UNHEALTHY
- Metrics vs baseline table
- Anomaly details with screenshots
- Recommendation: proceed or rollback
