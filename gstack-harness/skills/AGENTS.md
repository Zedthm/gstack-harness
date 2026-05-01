# SKILLS — Gstack Specialist Library

**24 gstack specialists adapted to harness protocol.**

## Overview

技能库目录，包含 24 个专业技能。每个技能对应一个特定任务领域，通过意图匹配触发。

## Structure

```
skills/
├── office-hours.md      # Phase 0: Intent → Design Doc
├── plan-ceo-review.md    # Phase 1A: Strategy & Scope
├── plan-eng-review.md    # Phase 1B: Architecture & Tests
├── plan-design-review.md # Phase 1C: UX Audit
├── design-consultation.md # Phase 1C: Design System
├── design-shotgun.md     # Phase 1C: Variant Exploration
├── design-html.md        # Phase 2: Frontend Implementation
├── review.md            # Phase 3: Pre-landing PR Review
├── investigate.md       # Phase 3: Root-cause Debug
├── qa.md                # Phase 4: Browser Testing + Fix
├── qa-only.md           # Phase 4: Report-only Testing
├── codex.md             # Phase 3: Second Opinion
├── security.md          # Phase 4: OWASP + STRIDE
├── ship.md             # Phase 5: Test → PR → Push
├── land-and-deploy.md  # Phase 5: CI → Deploy → Verify
├── document-release.md # Phase 6: Doc Sync
├── retro.md            # Phase 7: Weekly Retrospective
├── canary.md           # Phase 7+: Post-deploy Monitor
├── benchmark.md        # Phase 7+: Perf Baseline
├── context-save.md     # Cross-phase: State Capture
├── context-restore.md  # Cross-phase: State Resume
├── learn.md            # Cross-phase: Knowledge Base
├── browse.md           # Cross-phase: Real Browser
└── autoplan.md         # Cross-phase: Auto Review
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Design doc creation | office-hours.md | Phase 0 入口 |
| Strategy review | plan-ceo-review.md | CEO 模式 |
| Architecture review | plan-eng-review.md | 工程模式 |
| Design system | design-consultation.md | 设计系统 |
| HTML 实现 | design-html.md | 前端实现 |
| Bug 调查 | investigate.md | 根因分析 |
| QA 测试 | qa.md | 浏览器测试 |
| 安全审计 | security.md | OWASP |
| 部署 | land-and-deploy.md | CI/CD |

## Conventions

- 每个技能有标准化 frontmatter: `name`, `phase`, `specialist`, `triggers`, `inputs`, `outputs`, `depends-on`
- Phase 0-7 对应 Sprint Pipeline 阶段
- Cross-phase 技能可在任意阶段调用

## Anti-Patterns

- **跳过 Phase 直接实现** — 必须先有 design doc
- **并行调用非并行技能** — 按 pipeline 顺序调用

## Commands

```bash
# 触发特定技能
@skills/office-hours
@skills/qa
@skills/investigate
```