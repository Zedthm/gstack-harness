# Permission Gate — Tool Safety & Access Control

## Golden Rules

1. **Default to fail-closed.** Tools are serial and gated unless explicitly marked safe for concurrency and approved by permission pipeline.
2. **Concurrency classification is per-call, not per-tool.** Same tool can be safe for some inputs and unsafe for others. Partition batch into segments: safe calls run parallel, unsafe calls start serial.
3. **Permission pipeline has side effects.** It tracks denials, transforms modes, and updates state. Not a pure lookup.
4. **Route every tool call through one gate.** No bypass routes except explicitly defined emergency paths.
5. **Add bypass-immune rules for protected paths before shipping any auto-approve mode.**

## GSTACK-HARNESS Permission Pipeline

### Rule Sources (strict priority order)

1. **User override** (current session AskUserQuestion grant)
2. **Project local** (`PROJECT_ROOT/.agents/config.yaml` → permission_rules)
3. **User global** (`~/.mySkills/config.yaml` → permission_rules)
4. **Harness defaults** (fail-closed, built into coordinator)
5. **Policy** (org-wide rules, if org config exists)

Lower priority number wins. User override always beats everything.

### Tool Classification

| Category | Default | Override |
|----------|---------|----------|
| Read-only (Read, Glob, Grep) | Concurrent-safe | Cannot be made unsafe |
| File write (Write, Edit) | Serial, ask-on-write | Can be auto-approve with path ACL |
| Shell (Bash) | Serial, always-ask | Can be auto-approve with allow-list |
| Git operations | Serial, ask-on-commit | Auto-approve for add/stage only |
| Deploy (Bash with deploy flag) | Serial, always-ask | Cannot auto-approve |
| Browser automation (Browse) | Serial, ask | Ask only on authenticated paths |
| Agent delegation (Agent tool) | Serial, ask-on-spawn | Can auto-approve with max 3 agents |
| Telemetry (write to analytics) | Concurrent-safe | Cannot be made unsafe |

### Permission Types

- **deny:** Hard block. Agent cannot proceed.
- **ask:** Requires AskUserQuestion grant per call or per path pattern.
- **allow-path:** Allow with path restriction (e.g., allow writes to `src/`, deny `config/`).
- **allow:** Allow without asking. Only for read-only operations and explicitly approved paths.

### Protected Paths (bypass-immune rules)

These paths can NEVER bypass permission gate, regardless of user settings:

- `/etc/`, `/usr/`, system directories
- `/home/` outside project root
- `~/.ssh/`, `~/.aws/`, `~/.config/` outside mySkills scope
- Any path matching `*.env`, `*credentials*`, `*secrets*`

### Audit Trail

Every permission decision logged:

```
{timestamp} | {tool} | {action} | {path} | {rule_source} | {outcome}
2026-05-01T10:00 | Edit | write | src/auth.ts | path-allow | allowed
2026-05-01T10:01 | Bash | exec | rm -rf /tmp/* | deny | denied
2026-05-01T10:02 | Agent | spawn | qa-specialist | ask | approved (user D2)
```

### Emergency Override

User can override any permission via AskUserQuestion. If user confirms a denied action:
1. Log as user_override in audit trail
2. Execute the specific action
3. Do NOT auto-approve future identical actions
4. Single-session grant only

### Race-Safe Atomic Claims

When permission pipeline evaluates rules from multiple sources simultaneously:
1. Serialize evaluation per tool call
2. No parallel rule evaluation
3. Result cached per-call — not per-tool (same tool, different inputs = different evaluation)

### Gotchas

- **Fail-closed means new tools are safe but slow.** Forgetting to flag a read-only tool as concurrent-safe silently degrades throughput.
- **Multi-source rules are hard to debug when they conflict.** Add a `explain` command for debugging: shows which rule won and why.
- **Default permission for tools is "allow" in many systems.** The harness overrides this to "deny" as default. Any tool without custom permission logic delegates to rule-based system.
- **Bypass-immune rules are the last line of defense.** Don't remove them just because a user keeps hitting them — explain, don't remove.
