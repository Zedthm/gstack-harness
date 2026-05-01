# Hook Lifecycle Pattern

## Golden Rules

1. **Hooks attach side effects at lifecycle moments.** Pre/post tool execution, prompt submission, agent start/end.
2. **Trust is all-or-nothing.** If workspace untrusted, all hooks skip — not just suspicious ones.
3. **Session-scoped hooks are ephemeral.** Cleaned on session end.
4. **Route all hooks through single dispatch point.**

## Hook Types

| Type | Fires When | Blocking? |
|------|-----------|-----------|
| pre_tool_call | Before any tool executes | Yes — can cancel the tool |
| post_tool_call | After tool returns result | No — observe only |
| pre_prompt | Before prompt sent to model | Yes — can modify or reject |
| post_prompt | After model responds | No — observe only |
| agent_start | When agent session begins | No — setup only |
| agent_end | When agent session ends | No — cleanup only |

## Trust Model

Trust levels determine hook activation:

| Trust Level | Built-in Hooks | User-installed Hooks | External Hooks |
|---|---|---|---|
| Trusted | Activate | Activate | Activate |
| Semi-trusted | Activate | Activate | Skip |
| Untrusted | Activate | Skip | Skip |

## GSTACK-HARNESS Hook Integration

### Sprint Phase Hooks
- `agent_start` → bootstrap, memory load, skill discovery
- `post_tool_call` → audit trail for permission-sensitive tools
- `agent_end` → session extraction (background), memory flush, task drain

### Quality Gate Hooks
- `post_prompt` → check specialist output against quality checklist before it enters next phase
- `pre_tool_call` → enforce permission gate before write/deploy operations

### Cleanup Hooks
- `agent_end` → disk cleanup for terminal tasks, temp file sweep, progress-log final update
