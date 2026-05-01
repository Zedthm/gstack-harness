# HARNESS/CORE — Multi-Agent Orchestration Engine

**8 core components forming the harness orchestration layer.**

## Overview

Harness 核心层，提供多代理协调、内存管理、上下文工程、工具安全、生命周期管理等基础能力。

## Structure

```
harness/core/
├── bootstrap.md           # Init sequence with trust boundary
├── coordinator.md          # Multi-agent orchestration (3 patterns)
├── handoff-protocol.md     # Agent-to-agent handoff format
├── harness-skills.md       # Skill runtime + lazy loading
├── memory.md               # Memory persistence + extraction
├── context-engineering.md  # Select/Write/Compress/Isolate
├── permission-gate.md      # Tool safety + fail-closed
└── task-decomposition.md   # Typed IDs + state machines + eviction
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| 初始化流程 | bootstrap.md | 信任边界初始化 |
| 多代理协调 | coordinator.md | 3 种模式: Coordinator/Fork/Swarm |
| 技能运行时 | harness-skills.md | 懒加载 + 意图匹配 |
| 内存持久化 | memory.md | 分层内存架构 |
| 上下文工程 | context-engineering.md | 4 种操作 |
| 工具安全 | permission-gate.md | 失败关闭默认 |
| 任务分解 | task-decomposition.md | 类型化 ID + 状态机 |

## Key Concepts

### Three Delegation Patterns

| Pattern | Context | Depth | Best For |
|---------|---------|-------|----------|
| **Coordinator** | Zero-inheritance | Bounded | Multi-phase: research → synthesize → implement → verify |
| **Fork** | Full inheritance | Single-level only | Quick parallel splits sharing loaded context |
| **Swarm** | Shared task list | Flat roster | Long-running independent workstreams |

### Context Engineering Operations

- **Select**: JIT 加载，非全量加载
- **Write**: agent 写回持久存储 (学习循环)
- **Compress**: 响应式压缩 + 恢复指针
- **Isolate**: 零继承 (审查者)，单级分叉 (并行审查)

### Memory Hierarchy

Instruction memory: org → user → project → local (local wins)
Auto-memory: user | feedback | project | reference — type taxonomy required

## Anti-Patterns

- **Lazy delegation**: "Based on your findings, fix it" → 质量损失 40%+
- **Recursive fork**: fork 子节点再次 fork → 浪费 turn
- **Verification from implementation context**: 验证者继承实现者假设 → 漏掉 bug
- **Unbounded depth**: 无限层级 → 无法追踪或取消
- **Tool overflow**: 给 worker 不需要的工具 → 非预期动作

## Quality Gates

**P1 (blocking)**: factual accuracy, no hallucination, self-contained, security. Must be zero.
**P2 (should fix)**: completeness, portability, tone, formatting. Max 4 allowed.
**P3 (cosmetic)**: spelling, spacing. No limit.

## Commands

```bash
# 协调者触发
@harness/coordinator
# 查看 handoff 格式
cat harness/core/handoff-protocol.md
```