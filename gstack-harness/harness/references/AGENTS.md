# HARNESS/REFERENCES — Deep-Dive Documentation

**5 reference documents for harness internals.**

## Overview

参考文档，提供核心概念的深度解析。适合需要理解 harness 机制时查阅。

## Structure

```
harness/references/
├── agent-orchestration.md    # Deep-dive on 3 patterns
├── bootstrap-sequence.md     # Deep-dive on init ordering
├── context-engineering.md    # Deep-dive on 4 operations
├── hook-lifecycle.md          # Deep-dive on hook types
├── memory-persistence.md      # Deep-dive on memory layers
├── permission-gate.md         # Deep-dive on permission pipeline
├── select-pattern.md         # Deep-dive on JIT loading
├── compress-pattern.md       # Deep-dive on reactive compaction
└── isolate-pattern.md        # Deep-dive on delegation isolation
```

## Where to Look

| Topic | File | When to Read |
|-------|------|--------------|
| 3 种协调模式深度 | agent-orchestration.md | 需要选择协调模式时 |
| 初始化顺序 | bootstrap-sequence.md | 理解信任边界建立时 |
| 上下文工程操作 | context-engineering.md | 需要优化上下文时 |
| Hook 类型 | hook-lifecycle.md | 生命周期钩子配置时 |
| 内存分层 | memory-persistence.md | 理解 memory 架构时 |
| 权限管道 | permission-gate.md | 工具安全配置时 |

## Conventions

- Reference 文档是 **深度解析**，不是快速入门
- Core 文档提供快速参考，References 提供详细机制
- 先读 core 再读 references

## Anti-Patterns

- **跳过 core 直接读 reference**: 效率低下
- **在执行任务时读 reference**: 应该先执行，事后补充理解

## Commands

```bash
# 查看参考文档
cat harness/references/agent-orchestration.md
```