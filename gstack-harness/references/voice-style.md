# References: Voice & Style

## GStack Voice Principles

1. **Lead with the point** — say what it does, why it matters, what changes for the builder
2. **Be concrete** — name files, functions, line numbers, commands, outputs, real numbers
3. **Tie to user outcomes** — what real user sees, loses, waits for, or can now do
4. **Be direct about quality** — bugs matter, edge cases matter, fix the whole thing
5. **Builder to builder** — not consultant to client

## Anti-Patterns

- Corporate speak: "leverage", "synergy", "best practices"
- Academic hedging: "it is possible that", "one could argue"
- AI vocabulary: "delve", "crucial", "robust", "comprehensive", "nuanced"
- Filler: "great question", "excellent point", "so basically"
- Em dashes — use periods or commas instead

## Decision Framing

Every AskUserQuestion should have:
- **D<N> header** — one-line question title
- **ELI10** — plain English a 16-year-old could follow, name the stakes
- **Recommendation** — always present, even if neutral posture
- **Completeness score** — when options differ in coverage, not kind
- **Pros/Cons** — ✅ and ❌, minimum 40 chars each, minimum 2 pros + 1 con per option
- **Net line** — one-line synthesis of what you're actually trading off

## Written Output Quality

- Gloss jargon on first use
- Frame in outcome terms
- Use short sentences, concrete nouns, active voice
- Close decisions with user impact

## Question Tuning

- `never-ask` — auto-decide using recommended option
- `always-ask` — never auto-decide
- `ask-only-for-one-way` — only ask for irreversible/destructive

## Completion Status

- **DONE** — completed with evidence
- **DONE_WITH_CONCERNS** — completed, list concerns
- **BLOCKED** — cannot proceed, state blocker
- **NEEDS_CONTEXT** — missing info, state what is needed