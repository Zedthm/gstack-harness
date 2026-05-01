# Agent Orchestration — Deep Dive

See `harness/core/coordinator.md` for the coordinator pattern guide. This is the deep dive on when and how to mix patterns.

## Three Patterns

### Coordinator (research → synthesize → implement → verify)
- Workers start from blank context (zero-inheritance)
- Only the synthesizer (coordinator) sees both research and implementation
- Best for: multi-phase work where each phase needs a different perspective

### Fork (full inheritance, single-level)
- Children inherit parent's full message history
- Single-level guard: fork children cannot fork
- Best for: parallel review of the same material from different angles

### Swarm (flat peer roster)
- Peers coordinate through shared artifact, not message-passing
- Peers cannot spawn other peers
- Best for: long-running independent work that occasionally syncs

## Pattern Compatibility

| Mix | Compatible? | Risk |
|-----|------------|------|
| Coordinator → Fork | Yes | Fork children inherit blank context (coordinator's spec), diverge on analysis dimension |
| Coordinator → Swarm | Yes | Swarm peers get coordinator's spec as their shared artifact |
| Fork → Swarm | No | Fork children cannot spawn; swarm peers cannot spawn. Incompatible |
| Swarm → Coordinator | No | Swarm peers are flat; can't become coordinator |

## GSTACK-HARNESS Pattern Mixing

The harness uses Coordinator → Fork for Phase 1 (CEO ∥ Eng ∥ Design), and Coordinator → Swarm for Phase 3 (QA ∥ Security). These are the only valid pattern mixes. No other combinations are permitted in the standard sprint pipeline.
