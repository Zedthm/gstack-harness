# Bootstrap Sequence — Deep Dive

See `harness/core/bootstrap.md` for the core guide. This deep dives into dependency ordering edge cases.

## Dependency Graph

```
config parse
    │
    ├── safe env vars
    │       │
    │       └── TLS/CA config
    │               │
    │               └── mTLS config
    │                       │
    │                       └── trust dialog ← CRITICAL INFLECTION
    │                               │
    │                               ├── full env vars (with secrets)
    │                               ├── telemetry init
    │                               └── background caches (fire-and-forget)
    │
    └── memory subsystem
            │
            ├── skill discovery
            ├── permission pipeline
            ├── context cache
            ├── background extraction
            ├── task registry
            ├── hook registry
            └── cleanup handlers (SIGTERM/SIGINT)
```

## Fast-Path Commands

These require zero subsystems and dispatch before anything loads:
- Version query (`--version`)
- Help display (`--help`)
- Schema dump (`--schema`)
- Diagnostic flags (`--doctor --fast`)

## Multi-Mode Support

All these entry modes share the same init path:

| Mode | Dialog? | Error Output |
|------|---------|-------------|
| Interactive CLI | Yes | TTY |
| Server/Daemon | No — skip | Stderr |
| SDK Embedding | No — skip | Callback |
| Headless/CI | No — skip | Stderr + exit 1 |
| Spawned Session | Auto-choose | Completion report |

## Gotchas

- **TLS cache defeat:** Certificate store read at boot. Configuring custom CA after first handshake → no effect on cached pool connections.
- **Memoization caching rejections:** Some memoize implementations cache rejections. Use variant that clears on rejection, or manual once-guard that resets on error.
- **Telemetry double-init:** Guard flag must be set BEFORE async initializer resolves. Setting after leaves window for second caller to double-init.
- **Feature flags must be inline:** Build-time dead-code elimination only works when flag check appears directly at call site. Extracting to helper function defeats bundler's static analysis.
