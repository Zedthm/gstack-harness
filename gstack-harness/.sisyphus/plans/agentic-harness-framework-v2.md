# Plan: Agentic Harness Framework v2

## TL;DR

> **Quick Summary**: TypeScript/Bun 重写 gstack-harness，实现 agentic-harness-patterns 的全部 6 层机制。41 个 Skill 转换为 ## Workflow + ## Execution 格式。Bun.spawn 作为进程执行模型。
>
> **Deliverables**:
> - 6 层核心运行时 (Memory, Skills, Tools, Context, Multi-agent, Lifecycle)
> - 41 个 Skill 完全重写为 ## Workflow + ## Execution 格式
> - 端到端测试验证所有层
>
> **Estimated Effort**: Large (50+ TODOs)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: T1 skill-runner → T2 executor → T5 hooks → T7 coordinator

---

## Context

### 问题

gstack-harness 当前是 Python 实现，但 gstack 是 TypeScript/Bun 技术栈。两套系统不兼容。现有 Python 运行时 70% 是 stub（hooks 全是 no-op，Fork/Swarm 是 run_parallel 别名，AutoMemory 无 taxonomy/extraction）。

### 目标

Build Agentic Harness Framework in TypeScript/Bun — universal，任何 agent 只要有 Skill Runner 接口就能用。完整实现 agentic-harness-patterns 的 6 层，而不是空架子。

### 关键决策 (已确认)

| 决策 | 选择 | 理由 |
|------|------|------|
| 语言栈 | **TypeScript/Bun** | gstack 统一技术栈 |
| Skill 格式 | **## Workflow + ## Execution** | 与 agentic-harness-patterns 一致 |
| 进程执行 | **Bun.spawn** | 纯 TS/Bun，无 Python 依赖 |
| 框架性质 | **Universal** | 不绑定特定 agent (OpenCode/Claude Code/OpenClaw 通用) |
| Skill 打包 | **Bundled** | 41 skills 内嵌框架，不外置 |
| Memory 路径 | **$CWD/.gstack-harness/** | 项目本地，gitignore |

### Metis Review 识别的关键缺口

1. **语言栈冲突**: Python 实现 vs TypeScript gstack → **解决：TS/Bun 重写**
2. **Skill 格式不兼容**: {{PREAMBLE}} vs ## Workflow → **解决：## Workflow + ## Execution**
3. **进程执行模型**: Python subprocess → **解决：Bun.spawn**
4. **Fake Fork/Swarm**: run_parallel 别名 → **解决：真正进程 fork**
5. **Hook 全是 no-op**: 5 个 builtins 全空 → **解决：完整 hooks 实现**
6. **AutoMemory 无实质**: 无 taxonomy/extraction → **解决：完整 memory 层**

---

## Work Objectives

### Core Objective

实现完整的 Agentic Harness Framework v2 —— 一个 universal 的 agent 执行框架，任何支持 Skill Runner 接口的 agent 都能用。6 层全部有真实实现，不是 stub。

### Concrete Deliverables

- `src/runtime/skill-runner.ts` - Skill 加载和协调入口
- `src/runtime/executor.ts` - 步骤执行引擎 (Bun.spawn)
- `src/runtime/memory.ts` - AutoMemory with taxonomy + extraction
- `src/runtime/context.ts` - Context 管理与注入
- `src/runtime/hooks.ts` - 5 个 hook 类型完整实现
- `src/runtime/hooks/gates.ts` - 工具安全门卫
- `src/runtime/hooks/builtins.ts` - 内置 hooks (PreToolUse/PostToolUse/OnAgentStart/OnAgentEnd/OnError)
- `src/runtime/coordinator.ts` - 多 agent 协调
- `src/runtime/task.ts` - Task 定义与生命周期
- `src/runtime/fork.ts` - 真正进程 fork (Bun.spawn)
- `src/runtime/swarm.ts` - Swarm 多进程协调
- `harness/skills/*.md` - 41 个 Skill 重写为 ## Workflow + ## Execution
- `tests/e2e/*.test.ts` - 端到端测试

### Definition of Done

- [ ] `bun run skill-runner.ts --skill invest` 能正确执行
- [ ] `bun run skill-runner.ts --skill review` 能正确执行
- [ ] Hooks 在正确的时机被调用 (非 no-op)
- [ ] Memory extraction 真正工作 (有 taxonomy)
- [ ] Fork 能创建独立进程 (不只是 thread)
- [ ] 41 个 Skill 全部是 ## Workflow + ## Execution 格式

### Must Have

- 6 层每层都有真实可执行代码
- Bun.spawn 执行 bash 步骤
- 工具安全门卫 (fail-closed)
- 内置 hooks 全部实现 (5/5)
- Memory extraction agent
- 至少 5 个 Skill 的 ## Workflow + ## Execution 重写

### Must NOT Have

- 不绑定特定 agent (OpenCode/Claude Code/OpenClaw 都可用)
- 不使用 Python subprocess (纯 Bun.spawn)
- 不使用 {{PREAMBLE}} 格式 (改用 ## Workflow)
- 不有 no-op hooks (全部要真实实现)

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (端到端测试优先)
- **Framework**: Bun test (bun test)
- **No TDD for framework core**: 先有实现，再有测试

### QA Policy

Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/`.

- **Frontend/UI**: N/A (纯 CLI 框架)
- **TUI/CLI**: interactive_bash (tmux) - 运行命令，验证输出
- **API/Backend**: Bash (curl) - N/A
- **Library/Module**: Bash (bun) - `bun run skill-runner.ts --skill <name>`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - 立即启动，无依赖):
├── T1:  skill-runner.ts        (Skill Runner 核心)
├── T2:  executor.ts            (步骤执行引擎)
├── T3:  memory.ts              (AutoMemory + extraction)
└── T4:  context.ts             (Context 管理)

Wave 2 (Hooks + Safety - T1 完成后):
├── T5:  hooks.ts + builtins.ts  (5 个 hook 类型)
├── T6:  hooks/gates.ts          (工具安全门卫)
└── T7:  task.ts                 (Task 生命周期)

Wave 3 (Multi-agent - T2+T3 完成后):
├── T8:  fork.ts                 (真正进程 fork)
├── T9:  swarm.ts               (Swarm 协调)
└── T10: coordinator.ts         (多 agent 协调)

Wave 4 (Skill Rewrite - T1-T9 完成后):
├── T11: 重写 5 个核心 Skill
└── T12: 重写其余 36 个 Skill

Wave FINAL (验证):
├── T13: e2e 测试
├── T14: 集成测试 + linter
└── T15: 文档更新
```

### Critical Path

```
T1 (skill-runner) → T2 (executor) → T5 (hooks) → T7 (task) → T10 (coordinator) → T11 (skill rewrite) → T13 (e2e)
```

---

## TODOs

---

## TODOs

- [x] 1. **skill-runner.ts — Skill Runner 核心**

  **What to do**:
  - 创建 `src/runtime/skill-runner.ts`
  - 实现 Skill 加载器：扫描 `harness/skills/*.md`
  - 解析 ## Workflow + ## Execution 格式
  - Skill 调度：给定 skill name → 找到文件 → 解析 → 执行
  - CLI 接口：`bun run skill-runner.ts --skill <name> [--arg <value>]`

  **Must NOT do**:
  - 不实现 {{PREAMBLE}} 解析（只支持 ## Workflow）
  - 不绑定特定 agent

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `typescript`, `cli-design`
  - **Reason**: 核心 runtime，需要扎实的 TS 能力

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4)
  - **Blocks**: T5 (hooks), T7 (task)
  - **Blocked By**: None

  **References**:
  - `harness/skills/investigate/SKILL.md` - 现有 Skill 格式参考
  - `agentic-harness-patterns/docs/distillation-harness-practice.md` - Skill Runner 设计

  **Acceptance Criteria**:
  - [ ] `bun run skill-runner.ts --skill investigate` 能正确执行
  - [ ] Skill 文件被正确加载和解析
  - [ ] CLI 参数正确传递

  **QA Scenarios**:
  ```
  Scenario: skill-runner 加载并执行 investigate skill
    Tool: Bash
    Preconditions: skill-runner.ts 已实现，harness/skills/investigate/SKILL.md 存在
    Steps:
      1. bun run src/runtime/skill-runner.ts --skill investigate
      2. 验证输出包含 "investigate" 相关内容
    Expected Result: Skill 被正确加载，步骤被逐条执行
    Evidence: .sisyphus/evidence/task-1-investigate.{ext}

  Scenario: 未知 skill 返回错误
    Tool: Bash
    Preconditions: 无效 skill name
    Steps:
      1. bun run src/runtime/skill-runner.ts --skill nonexistent
      2. 验证错误信息
    Expected Result: 优雅的错误处理，不是崩溃
    Evidence: .sisyphus/evidence/task-1-error-handling.{ext}
  ```

  **Commit**: YES
  - Message: `feat(harness): add skill-runner core`
  - Files: `src/runtime/skill-runner.ts`

---

- [x] 2. **executor.ts — 步骤执行引擎**

  **What to do**:
  - 创建 `src/runtime/executor.ts`
  - 实现步骤执行器：解析 ## Workflow 步骤列表 → 逐条执行
  - Bun.spawn 执行 bash 命令（非 Python subprocess）
  - 步骤类型支持：
    - `bash`: 执行 shell 命令
    - `tool`: 调用工具
    - `agent`: 启动子 agent
  - 步骤状态追踪：pending → running → success/failed
  - 错误处理：步骤失败时可选 stop/error-continue

  **Must NOT do**:
  - 不使用 Python subprocess
  - 不支持 {{PREAMBLE}} 格式

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `typescript`, `process-spawning`
  - **Reason**: Bun.spawn 需要正确处理 stdout/stderr

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3, T4)
  - **Blocks**: T5 (hooks), T7 (task)
  - **Blocked By**: None

  **References**:
  - `src/runtime/skill-runner.ts` - 调用 executor
  - Bun.spawn 官方文档

  **Acceptance Criteria**:
  - [ ] Bash 步骤通过 Bun.spawn 执行
  - [ ] stdout/stderr 正确捕获
  - [ ] 步骤状态正确追踪

  **QA Scenarios**:
  ```
  Scenario: executor 执行 bash 步骤
    Tool: Bash
    Preconditions: executor.ts 已实现
    Steps:
      1. echo 'echo "hello"' | bun run src/runtime/executor.ts
      2. 验证 "hello" 输出
    Expected Result: Bun.spawn 正确执行命令，输出被捕获
    Evidence: .sisyphus/evidence/task-2-bash-exec.{ext}

  Scenario: 步骤失败处理
    Tool: Bash
    Preconditions: 故意失败的步骤
    Steps:
      1. bun run src/runtime/executor.ts --step 'exit 1'
      2. 验证错误被正确报告
    Expected Result: 优雅的错误处理，不是崩溃
    Evidence: .sisyphus/evidence/task-2-error.{ext}
  ```

  **Commit**: YES
  - Message: `feat(harness): add executor with Bun.spawn`
  - Files: `src/runtime/executor.ts`

---

- [x] 3. **memory.ts — AutoMemory with Extraction**

  **What to do**:
  - 创建 `src/runtime/memory.ts`
  - 实现 Memory 接口：
    - `save(agent_id, memory_type, content)` - 存储记忆
    - `recall(agent_id, query)` - 检索记忆
    - `extract(agent_id, raw_content)` - 从原始内容提取结构化记忆
  - Taxonomy 支持：skill-patterns, error-patterns, project-context, user-preferences
  - Extraction agent：LLM 调用提取结构化信息
  - Background extraction：异步提取，不阻塞主流程
  - Memory 路径：`$CWD/.gstack-harness/memory/`

  **Must NOT do**:
  - 不实现空壳（必须真正有 extraction）
  - 不使用假的 taxonomy

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `typescript`, `llm-integration`
  - **Reason**: 需要 LLM 调用进行 extraction

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T4)
  - **Blocks**: T8 (fork 需要 memory)
  - **Blocked By**: None

  **References**:
  - `agentic-harness-patterns/docs/distillation-harness-practice.md` - extraction methodology
  - `src/runtime/skill-runner.ts` - memory 被 skill 调用

  **Acceptance Criteria**:
  - [ ] Memory 能保存和检索
  - [ ] Extraction 能从原始内容提取结构化信息
  - [ ] Background extraction 不阻塞主流程

  **QA Scenarios**:
  ```
  Scenario: memory 保存和检索
    Tool: Bash
    Preconditions: memory.ts 已实现
    Steps:
      1. bun run src/runtime/memory.ts --save --agent test --type skill-patterns --content "test pattern"
      2. bun run src/runtime/memory.ts --recall --agent test --query "test"
      3. 验证 "test pattern" 被返回
    Expected Result: 记忆被正确保存和检索
    Evidence: .sisyphus/evidence/task-3-memory.{ext}

  Scenario: extraction 从原始内容提取
    Tool: Bash
    Preconditions: memory.ts 有 extraction 功能
    Steps:
      1. echo "Claude said: 'use Zod for validation'" | bun run src/runtime/memory.ts --extract
      2. 验证返回结构化记忆 (type: skill-patterns, content: use Zod)
    Expected Result: LLM extraction 工作
    Evidence: .sisyphus/evidence/task-3-extraction.{ext}
  ```

  **Commit**: YES
  - Message: `feat(harness): add memory with extraction`
  - Files: `src/runtime/memory.ts`

---

- [x] 4. **context.ts — Context 管理与注入**

  **What to do**:
  - 创建 `src/runtime/context.ts`
  - Context 接口：
    - `build(agent_id, task)` - 构建 context
    - `inject(skill_name)` - 注入 skill 相关的 context
    - `snapshot()` - 保存当前 context 快照
    - `restore(snapshot)` - 恢复 context
  - Context 组成：
    - Recent memories (从 memory 层)
    - Active task state
    - Skill metadata
    - User preferences
  - Context 注入到 Skill 步骤时可用

  **Must NOT do**:
  - 不实现简单的字符串替换
  - 不丢失 context 层级关系

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `typescript`
  - **Reason**: 需要管理复杂的状态

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T3)
  - **Blocks**: T7 (task)
  - **Blocked By**: None

  **References**:
  - `src/runtime/memory.ts` - context 从 memory 读取
  - `src/runtime/skill-runner.ts` - skill-runner 调用 context

  **Acceptance Criteria**:
  - [ ] Context 能被构建和注入
  - [ ] Context 快照能保存和恢复
  - [ ] Skill 能访问相关 context

  **QA Scenarios**:
  ```
  Scenario: context 构建和注入
    Tool: Bash
    Preconditions: context.ts 已实现
    Steps:
      1. bun run src/runtime/context.ts --build --agent test --task "implement feature"
      2. bun run src/runtime/context.ts --inject --skill investigate
      3. 验证 context 包含 memory 内容
    Expected Result: Context 正确构建和注入
    Evidence: .sisyphus/evidence/task-4-context.{ext}

  Scenario: context 快照和恢复
    Tool: Bash
    Preconditions: 有已构建的 context
    Steps:
      1. bun run src/runtime/context.ts --snapshot
      2. bun run src/runtime/context.ts --restore
      3. 验证状态一致
    Expected Result: 快照保存和恢复正确
    Evidence: .sisyphus/evidence/task-4-snapshot.{ext}
  ```

  **Commit**: YES
  - Message: `feat(harness): add context management`
  - Files: `src/runtime/context.ts`

---

---

- [x] 5. **hooks.ts + builtins.ts — Hook 系统**

  **What to do**:
  - 创建 `src/runtime/hooks.ts` - Hook 注册表
  - 创建 `src/runtime/hooks/builtins.ts` - 5 个内置 hooks:
    - `PreToolUse(tool_name, args)` - 工具调用前
    - `PostToolUse(tool_name, args, result)` - 工具调用后
    - `OnAgentStart(agent_id, task)` - Agent 启动时
    - `OnAgentEnd(agent_id, result)` - Agent 结束时
    - `OnError(agent_id, error)` - 错误发生时
  - Hook 注册表：注册/注销/触发 hooks
  - Hook 链：一个事件可触发多个 hooks，按优先级排序

  **Must NOT do**:
  - 不实现 no-op hooks（必须真实实现每个 hook）
  - 不硬编码所有行为到 executor

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `typescript`, `event-systems`
  - **Reason**: Hook 系统是事件驱动，需要正确的设计

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6, T7)
  - **Blocks**: T11 (skill rewrite 需要 hooks)
  - **Blocked By**: T1 (skill-runner)

  **References**:
  - `src/runtime/executor.ts` - executor 触发 hooks
  - `agentic-harness-patterns` - hooks 设计参考

  **Acceptance Criteria**:
  - [ ] 5 个内置 hooks 全部非 no-op
  - [ ] Hooks 在正确时机被触发
  - [ ] Hook 链按优先级执行

  **QA Scenarios**:
  ```
  Scenario: PreToolUse hook 在工具调用前触发
    Tool: Bash
    Preconditions: hooks.ts + builtins.ts 已实现
    Steps:
      1. bun run src/runtime/skill-runner.ts --skill test --hook PreToolUse
      2. 验证 PreToolUse hook 在工具前被调用
    Expected Result: Hook 正确触发
    Evidence: .sisyphus/evidence/task-5-pretool.{ext}

  Scenario: OnError hook 在错误时触发
    Tool: Bash
    Preconditions: 有会失败的步骤
    Steps:
      1. bun run src/runtime/skill-runner.ts --skill test --error
      2. 验证 OnError hook 被调用
    Expected Result: 错误被 hook 捕获
    Evidence: .sisyphus/evidence/task-5-onerror.{ext}
  ```

  **Commit**: YES
  - Message: `feat(harness): add hooks and builtins`
  - Files: `src/runtime/hooks.ts`, `src/runtime/hooks/builtins.ts`

---

- [x] 6. **hooks/gates.ts — 工具安全门卫**

  **What to do**:
  - 创建 `src/runtime/hooks/gates.ts`
  - 实现 fail-closed 安全门卫：
    - 工具白名单：只有白名单中的工具才能执行
    - 并发分类：工具分为 serial/paralle
    - `PreToolUse` gate：检查工具是否在白名单
    - `PostToolUse` gate：检查返回结果是否安全
  - 默认拒绝：不在白名单的工具默认被拒绝
  - 配置接口：白名单可配置

  **Must NOT do**:
  - 不实现 fail-open（安全考量）
  - 不硬编码所有工具

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `typescript`, `security-design`
  - **Reason**: 安全关键路径

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T7)
  - **Blocks**: T11
  - **Blocked By**: T1

  **References**:
  - `src/runtime/hooks/builtins.ts` - PreToolUse hook
  - `src/runtime/executor.ts` - 执行工具

  **Acceptance Criteria**:
  - [ ] 白名单外的工具被拒绝
  - [ ] 并发工具正确调度
  - [ ] Fail-closed 行为正确

  **QA Scenarios**:
  ```
  Scenario: 白名单工具允许执行
    Tool: Bash
    Preconditions: gates.ts 已实现
    Steps:
      1. bun run src/runtime/executor.ts --tool bash --allowlist
      2. 验证工具执行成功
    Expected Result: 白名单工具正常执行
    Evidence: .sisyphus/evidence/task-6-allow.{ext}

  Scenario: 白名单外工具被拒绝
    Tool: Bash
    Preconditions: 有不在白名单的工具
    Steps:
      1. bun run src/runtime/executor.ts --tool dangerous_tool
      2. 验证工具被拒绝
    Expected Result: Fail-closed，安全拒绝
    Evidence: .sisyphus/evidence/task-6-deny.{ext}
  ```

  **Commit**: YES
  - Message: `feat(harness): add tool safety gates`
  - Files: `src/runtime/hooks/gates.ts`

---

- [x] 7. **task.ts — Task 生命周期**

  **What to do**:
  - 创建 `src/runtime/task.ts`
  - Task 定义：
    ```typescript
    interface Task {
      id: string  // 唯一 ID，格式: task_<timestamp>_<random>
      skill_name: string
      args: Record<string, string>
      status: 'pending' | 'running' | 'success' | 'failed'
      steps: Step[]
      created_at: Date
      updated_at: Date
    }
    ```
  - Task 生命周期：
    - `create(skill_name, args)` → 创建 task
    - `run(task_id)` → 执行 task
    - `status(task_id)` → 查询状态
    - `cancel(task_id)` → 取消 task
  - Task 存储：Memory 层持久化

  **Must NOT do**:
  - 不使用简单数字 ID
  - 不丢失 task 状态

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `typescript`
  - **Reason**: 状态管理关键

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6)
  - **Blocks**: T10 (coordinator)
  - **Blocked By**: T1, T2

  **References**:
  - `src/runtime/executor.ts` - 执行 task steps
  - `src/runtime/memory.ts` - task 持久化

  **Acceptance Criteria**:
  - [ ] Task ID 唯一且格式正确
  - [ ] Task 状态正确追踪
  - [ ] Task 能被取消

  **QA Scenarios**:
  ```
  Scenario: 创建和执行 task
    Tool: Bash
    Preconditions: task.ts 已实现
    Steps:
      1. bun run src/runtime/task.ts --create --skill investigate
      2. 记录返回的 task_id
      3. bun run src/runtime/task.ts --run <task_id>
      4. 验证状态变为 running → success
    Expected Result: Task 正确创建和执行
    Evidence: .sisyphus/evidence/task-7-create.{ext}

  Scenario: 取消 task
    Tool: Bash
    Preconditions: 有运行中的 task
    Steps:
      1. bun run src/runtime/task.ts --cancel <task_id>
      2. 验证状态变为 failed
    Expected Result: Task 被正确取消
    Evidence: .sisyphus/evidence/task-7-cancel.{ext}
  ```

  **Commit**: YES
  - Message: `feat(harness): add task lifecycle`
  - Files: `src/runtime/task.ts`

---

- [x] 8. **fork.ts — 真正进程 Fork**

  **What to do**:
  - 创建 `src/runtime/fork.ts`
  - 实现真正的进程 fork（Bun.spawn，非 thread）：
    ```typescript
    interface ForkOptions {
      agent_id: string
      skill_name: string
      args?: Record<string, string>
      memory?: boolean  // 是否继承 memory
    }
    fork(options: ForkOptions): Promise<ForkResult>
    ```
  - Fork 创建独立进程，有独立 PID
  - 进程间通信：IPC channel
  - Fork 结果：exit code, stdout, stderr
  - 与 run_parallel 的区别：fork 是真正独立进程

  **Must NOT do**:
  - 不实现 thread 伪装成 fork
  - 不使用 Python subprocess

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `typescript`, `process-management`
  - **Reason**: 进程管理复杂

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9, T10)
  - **Blocks**: T11
  - **Blocked By**: T3 (memory)

  **References**:
  - `src/runtime/executor.ts` - 步骤执行
  - Bun.spawn 文档

  **Acceptance Criteria**:
  - [ ] Fork 创建独立进程（独立 PID）
  - [ ] IPC 通信工作
  - [ ] Fork 结果正确返回

  **QA Scenarios**:
  ```
  Scenario: fork 创建独立进程
    Tool: Bash
    Preconditions: fork.ts 已实现
    Steps:
      1. bun run src/runtime/fork.ts --agent test --skill investigate
      2. 记录返回的 PID
      3. 验证 PID 存在且是子进程
    Expected Result: 独立进程被创建
    Evidence: .sisyphus/evidence/task-8-fork.{ext}

  Scenario: fork 结果收集
    Tool: Bash
    Preconditions: fork 已执行
    Steps:
      1. bun run src/runtime/fork.ts --wait
      2. 验证 exit code, stdout, stderr 正确
    Expected Result: Fork 结果正确
    Evidence: .sisyphus/evidence/task-8-result.{ext}
  ```

  **Commit**: YES
  - Message: `feat(harness): add real process fork`
  - Files: `src/runtime/fork.ts`

---

- [x] 9. **swarm.ts — Swarm 多进程协调**

  **What to do**:
  - 创建 `src/runtime/swarm.ts`
  - Swarm 接口：
    ```typescript
    interface SwarmOptions {
      agents: AgentConfig[]
      coordination: 'sequential' | 'parallel' | 'hierarchical'
    }
    swarm(options: SwarmOptions): Promise<SwarmResult>
    ```
  - 协调模式：
    - `sequential`: 一个接一个
    - `parallel`: 同时运行多个 fork
    - `hierarchical`: 主 agent → 子 agents
  - 结果聚合：收集所有 fork 的结果

  **Must NOT do**:
  - 不实现 run_parallel 别名（要有真实 swarm 逻辑）
  - 不混淆 thread 和进程

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `typescript`, `distributed-systems`
  - **Reason**: 多进程协调复杂

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T8, T10)
  - **Blocks**: T11
  - **Blocked By**: T8 (fork)

  **References**:
  - `src/runtime/fork.ts` - fork 是 swarm 的基础
  - `src/runtime/coordinator.ts` - 更高层协调

  **Acceptance Criteria**:
  - [ ] 三种协调模式都工作
  - [ ] 结果正确聚合
  - [ ] hierarchical 模式正确处理父子关系

  **QA Scenarios**:
  ```
  Scenario: parallel swarm
    Tool: Bash
    Preconditions: swarm.ts 已实现
    Steps:
      1. bun run src/runtime/swarm.ts --mode parallel --agents 3
      2. 验证 3 个进程同时运行
    Expected Result: 并行执行
    Evidence: .sisyphus/evidence/task-9-parallel.{ext}

  Scenario: hierarchical swarm
    Tool: Bash
    Preconditions: swarm.ts 有 hierarchical
    Steps:
      1. bun run src/runtime/swarm.ts --mode hierarchical --depth 2
      2. 验证父子关系正确
    Expected Result: 层级协调正确
    Evidence: .sisyphus/evidence/task-9-hierarchical.{ext}
  ```

  **Commit**: YES
  - Message: `feat(harness): add swarm coordination`
  - Files: `src/runtime/swarm.ts`

---

- [x] 10. **coordinator.ts — 多 Agent 协调**

  **What to do**:
  - 创建 `src/runtime/coordinator.ts`
  - Coordinator 接口：
    ```typescript
    interface Coordinator {
      register(agent: AgentConfig): void
      schedule(task: Task): Promise<TaskResult>
      monitor(agent_id: string): AgentStatus
      terminate(agent_id: string): void
    }
    ```
  - Agent 注册表：管理所有活跃 agents
  - 任务调度：基于 agent 可用性和优先级
  - 资源管理：监控 agent 资源使用
  - 容错：agent 失败时重新调度

  **Must NOT do**:
  - 不实现简单的任务队列
  - 不假设所有 agents 都健康

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `typescript`, `distributed-systems`
  - **Reason**: 协调逻辑复杂

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T8, T9)
  - **Blocks**: T11
  - **Blocked By**: T1, T2, T3, T7

  **References**:
  - `src/runtime/task.ts` - task 由 coordinator 调度
  - `src/runtime/swarm.ts` - swarm 是 coordinator 的工具

  **Acceptance Criteria**:
  - [ ] Agent 注册和监控工作
  - [ ] 任务调度正确
  - [ ] 容错机制工作

  **QA Scenarios**:
  ```
  Scenario: 注册和调度
    Tool: Bash
    Preconditions: coordinator.ts 已实现
    Steps:
      1. bun run src/runtime/coordinator.ts --register --agent test
      2. bun run src/runtime/coordinator.ts --schedule --skill investigate
      3. 验证任务被调度
    Expected Result: 协调正确
    Evidence: .sisyphus/evidence/task-10-schedule.{ext}

  Scenario: agent 失败容错
    Tool: Bash
    Preconditions: 有 agent 失败场景
    Steps:
      1. bun run src/runtime/coordinator.ts --fail-agent test
      2. 验证任务被重新调度
    Expected Result: 容错正确
    Evidence: .sisyphus/evidence/task-10-fault.{ext}
  ```

  **Commit**: YES
  - Message: `feat(harness): add multi-agent coordinator`
  - Files: `src/runtime/coordinator.ts`

---

---

- [x] 11. **Skill Rewrite — 核心 5 个 Skill**

  **What to do**:
  将以下 5 个核心 Skill 重写为 ## Workflow + ## Execution 格式（不是 {{PREAMBLE}}）：

  1. **investigate** - 根因调试
     - ## Workflow: 调查步骤列表
     - ## Execution: 每个步骤的具体 bash 命令
     - 现有文件: `harness/skills/investigate/SKILL.md`

  2. **review** - PR/代码审查
     - ## Workflow: 审查步骤
     - ## Execution: git diff, lint, test 命令

  3. **qa** - QA 测试
     - ## Workflow: QA 步骤
     - ## Execution: 浏览器自动化命令

  4. **design-review** - 设计审查
     - ## Workflow: 设计审查步骤
     - ## Execution: 截图、diff 命令

  5. **ship** - 发布
     - ## Workflow: 发布步骤
     - ## Execution: git, test, deploy 命令

  **格式转换**:
  ```
  # OLD ( {{PREAMBLE}} ):
  {{bash: echo "hello"}}
  
  # NEW ( ## Workflow + ## Execution ):
  ## Workflow
  1. 步骤描述
  
  ## Execution
  ```bash
  echo "hello"
  ```
  ```

  **Must NOT do**:
  - 不保留 {{PREAMBLE}} 格式
  - 不删除现有功能

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `typescript`, `writing`
  - **Reason**: 需要理解现有 Skill 并转换

  **Parallelization**:
  - **Can Run In Parallel**: YES (5 个 skill 可以并行重写)
  - **Parallel Group**: Wave 4
  - **Blocks**: T13 (e2e 测试需要 skill 重写)
  - **Blocked By**: T1-T10 (所有 runtime)

  **References**:
  - `harness/skills/investigate/SKILL.md` - investigate skill
  - `agentic-harness-patterns/docs/distillation-harness-practice.md` - ## Workflow 格式参考

  **Acceptance Criteria**:
  - [ ] 5 个 Skill 都是 ## Workflow + ## Execution 格式
  - [ ] 现有功能保持不变
  - [ ] `bun run skill-runner.ts --skill <name>` 能正确执行

  **QA Scenarios**:
  ```
  Scenario: investigate skill 执行
    Tool: Bash
    Preconditions: investigate skill 已重写
    Steps:
      1. bun run src/runtime/skill-runner.ts --skill investigate
      2. 验证调查步骤被执行
    Expected Result: Skill 正确执行
    Evidence: .sisyphus/evidence/task-11-investigate.{ext}

  Scenario: review skill 执行
    Tool: Bash
    Preconditions: review skill 已重写
    Steps:
      1. bun run src/runtime/skill-runner.ts --skill review
      2. 验证审查步骤被执行
    Expected Result: Skill 正确执行
    Evidence: .sisyphus/evidence/task-11-review.{ext}
  ```

  **Commit**: YES
  - Message: `feat(skills): rewrite 5 core skills to Workflow+Execution`
  - Files: `harness/skills/investigate/`, `harness/skills/review/`, etc.

---

- [x] 12. **Skill Rewrite — 剩余 36 个 Skill**

  **What to do**:
  将其余 36 个 Skill 全部重写为 ## Workflow + ## Execution 格式：

  - office-hours, plan-ceo-review, plan-eng-review, plan-design-review
  - design-consultation, design-shotgun, design-html
  - investigate, review, qa, qa-only, design-review
  - devex-review, plan-devex-review
  - ship, land-and-deploy, canary, benchmark
  - document-release, retro
  - browse, setup-browser-cookies, open-gstack-browser
  - pair-agent
  - cso
  - review
  - investigate
  - office-hours
  - careful, freeze, guard, unfreeze
  - setup-deploy, setup-gbrain, gstack-upgrade
  - learn
  - (其余 Skill...)

  **Must NOT do**:
  - 不保留任何 {{PREAMBLE}} 格式
  - 不改变 Skill 行为

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `typescript`, `writing`
  - **Reason**: 大量 skill 需要转换

  **Parallelization**:
  - **Can Run In Parallel**: YES (可以分组并行重写)
  - **Parallel Group**: Wave 4
  - **Blocks**: T13
  - **Blocked By**: T11

  **References**:
  - `harness/skills/*/SKILL.md` - 所有 skill 文件

  **Acceptance Criteria**:
  - [ ] 41 个 Skill 全部是 ## Workflow + ## Execution 格式
  - [ ] `bun run skill-runner.ts --skill <each>` 全部能执行

  **QA Scenarios**:
  ```
  Scenario: 批量 skill 测试
    Tool: Bash
    Preconditions: 所有 skill 已重写
    Steps:
      1. for skill in office-hours plan-ceo-review plan-eng-review ...; do
           bun run src/runtime/skill-runner.ts --skill $skill --help
         done
      2. 验证所有 skill 都能被加载
    Expected Result: 所有 skill 正确加载
    Evidence: .sisyphus/evidence/task-12-batch.{ext}
  ```

  **Commit**: YES
  - Message: `feat(skills): rewrite remaining 36 skills to Workflow+Execution`
  - Files: `harness/skills/*/`

---

- [x] 13. **e2e 测试 — 端到端验证**

  **What to do**:
  创建端到端测试验证所有 6 层：

  1. **test/skill-runner-e2e.test.ts**
     - Skill 加载测试
     - Skill 执行测试
     - 错误处理测试

  2. **test/executor-e2e.test.ts**
     - Bun.spawn 执行测试
     - 步骤状态追踪测试
     - 错误处理测试

  3. **test/memory-e2e.test.ts**
     - Memory save/recall 测试
     - Extraction 测试
     - Background extraction 测试

  4. **test/hooks-e2e.test.ts**
     - Hook 触发测试
     - Hook 链测试

  5. **test/task-e2e.test.ts**
     - Task 创建/运行/取消测试

  6. **test/fork-e2e.test.ts**
     - Fork 创建独立进程测试
     - IPC 通信测试

  7. **test/swarm-e2e.test.ts**
     - 三种协调模式测试
     - 结果聚合测试

  **Must NOT do**:
  - 不写 mock 测试（要真实执行）
  - 不跳过任何层

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `typescript`, `testing`
  - **Reason**: e2e 测试需要全面

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: FINAL (with T14, T15)
  - **Blocked By**: T1-T12

  **References**:
  - `src/runtime/*.ts` - 所有 runtime 文件
  - Bun test 文档

  **Acceptance Criteria**:
  - [ ] 所有 e2e 测试通过
  - [ ] bun test → PASS (N tests, 0 failures)

  **QA Scenarios**:
  ```
  Scenario: 完整 skill 执行 e2e
    Tool: Bash
    Preconditions: 所有 runtime + skills 已实现
    Steps:
      1. bun run src/runtime/skill-runner.ts --skill investigate
      2. 验证完整流程（memory → context → executor → hooks）
    Expected Result: 端到端正确
    Evidence: .sisyphus/evidence/task-13-e2e.{ext}
  ```

  **Commit**: YES
  - Message: `test(harness): add e2e tests`
  - Files: `tests/e2e/*.test.ts`

---

- [x] 14. **集成测试 + Linter**

  **What to do**:
  - TypeScript 类型检查: `tsc --noEmit`
  - Linter 运行: `bun lint` 或 `eslint`
  - Bundle 验证: 确保没有循环依赖
  - 集成测试: runtime 模块之间的交互

  **Must NOT do**:
  - 不修复类型错误
  - 不忽略 linter 警告

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `typescript`
  - **Reason**: 检查和修复

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T13, T15)
  - **Parallel Group**: FINAL
  - **Blocked By**: T1-T12

  **References**:
  - `tsconfig.json` - TypeScript 配置
  - `.eslintrc` - Linter 配置

  **Acceptance Criteria**:
  - [ ] tsc --noEmit → PASS
  - [ ] Linter → PASS
  - [ ] 无循环依赖

  **QA Scenarios**:
  ```
  Scenario: 类型检查通过
    Tool: Bash
    Preconditions: 有类型错误
    Steps:
      1. bun run tsc --noEmit
      2. 验证无错误
    Expected Result: 类型检查通过
    Evidence: .sisyphus/evidence/task-14-types.{ext}
  ```

  **Commit**: YES
  - Message: `test(harness): add integration tests`
  - Files: `tests/integration/*.test.ts`

---

- [x] 15. **文档更新**

  **What to do**:
  - 更新 README.md：Framework 说明
  - 更新 ARCHITECTURE.md：6 层设计
  - 创建 HARNESS.md：使用指南
  - 更新 CHANGELOG.md

  **Must NOT do**:
  - 不写空洞的文档
  - 不复制粘贴

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `technical-writing`
  - **Reason**: 文档需要清晰

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T13, T14)
  - **Parallel Group**: FINAL
  - **Blocked By**: T1-T12

  **References**:
  - `README.md` - 现有 README
  - `ARCHITECTURE.md` - 现有架构文档

  **Acceptance Criteria**:
  - [ ] README.md 更新
  - [ ] ARCHITECTURE.md 更新
  - [ ] HARNESS.md 创建

  **QA Scenarios**:
  ```
  Scenario: 文档存在且可读
    Tool: Bash
    Preconditions: 文档已更新
    Steps:
      1. cat README.md | head -50
      2. cat ARCHITECTURE.md | head -50
      3. cat HARNESS.md | head -50
    Expected Result: 文档内容正确
    Evidence: .sisyphus/evidence/task-15-docs.{ext}
  ```

  **Commit**: YES
  - Message: `docs(harness): update documentation`
  - Files: `README.md`, `ARCHITECTURE.md`, `HARNESS.md`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`

  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found.

  **Output**: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

---

- [x] F2. **Code Quality Review** — `unspecified-high`

  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports.

  **Output**: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

---

- [x] F3. **Real Manual QA** — `unspecified-high`

  Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Save to `.sisyphus/evidence/final-qa/`.

  **Output**: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

---

- [x] F4. **Scope Fidelity Check** — `deep`

  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance.

  **Output**: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(harness): add core runtime foundation` - skill-runner, executor, memory, context
- **Wave 2**: `feat(harness): add hooks and safety gates` - hooks, builtins, gates
- **Wave 3**: `feat(harness): add multi-agent support` - fork, swarm, coordinator
- **Wave 4**: `feat(harness): rewrite skills to Workflow+Execution format` - skills/*
- **FINAL**: `test(harness): add e2e tests and integration` - tests/*

---

## Success Criteria

### Verification Commands

```bash
bun test                    # 所有测试通过
bun run skill-runner.ts --skill invest  # 能正确执行 invest skill
```

### Final Checklist

- [ ] 所有 6 层有真实实现
- [ ] Bun.spawn 执行 bash 步骤
- [ ] 5 个 hook 全部非 no-op
- [ ] Memory extraction 工作
- [ ] Fork 能创建独立进程
- [ ] 41 个 Skill 是 ## Workflow + ## Execution 格式