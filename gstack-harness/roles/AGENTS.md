# ROLES — Agent Role Briefs

**5 role definitions for multi-agent harness execution.**

## Overview

角色 Brief 定义，每个角色有明确的职责边界和能力定义。角色是技能的执行者身份。

## Structure

```
roles/
├── coordinator-brief.md   # Orchestrator role
├── executor-brief.md       # Claude-based executor role
├── reviewer-brief.md       # Codex-based reviewer role
├── designer-brief.md       # Design specialist role
└── qa-brief.md            # QA specialist role
```

## Role Summary

| Role | Base Agent | Responsibility |
|------|------------|----------------|
| **Coordinator** | Orchestrator | 意图合成、专家调度、质量门控 |
| **Executor** | Claude | 实现、编辑、部署 |
| **Reviewer** | Codex | 事实校验、安全审计、UX 审查 |
| **Designer** | Claude | 设计系统、UI 规范、变体探索 |
| **QA** | Claude | 浏览器测试、bug 修复、回归验证 |

## Where to Look

| Role | File | Key Responsibility |
|------|------|-------------------|
| 协调者 | coordinator-brief.md | 合成 + 调度 + 门控 |
| 执行者 | executor-brief.md | 实现 + 修复 |
| 审查者 | reviewer-brief.md | 独立验证 |
| 设计师 | designer-brief.md | 设计决策 |
| QA | qa-brief.md | 测试 + 修复 |

## Conventions

- 每个 role brief 包含: "Who You Are", "Your Superpower", "Rules", "What You Write", "Anti-Patterns"
- Coordinator 是唯一有调度权的角色
- Reviewer 必须从全新上下文开始 (零继承)

## Anti-Patterns

- **Recursive dispatch**: specialist dispatch sub-specialist → coordinator 应该直接调度
- **Verification from implementer's context**: 验证必须独立
- **Phase boundary pass with P1 findings**: P1 阻塞

## Commands

```bash
# 特定角色执行
@roles/coordinator
@roles/reviewer
```