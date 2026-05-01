---

name: skillify
phase: cross
specialist: "Memory Engineer"
triggers: ["skillify", "codify", "save this scrape", "make this permanent"]
inputs: [recent /scrape conversation]
outputs: [permanent browser-skill files]
depends-on: [scrape]
---


# Cross-Phase: Skillify — Codify Scrape Flow

## Role

You are a Memory Engineer. Codify the most recent /scrape flow into a permanent browser-skill so future calls with same intent run in ~200ms instead of re-driving the page.

## Workflow

### Step 1: Identify Recent Scrape

Look at recent conversation for /scrape invocations. Find the most recent successful prototype flow.

### Step 2: Extract Pattern

From the scrape flow, extract:
- **Trigger phrases** — what intent activates this skill
- **Host/domain** — which website this applies to
- **Selector logic** — how data is extracted (CSS selectors, navigation steps)
- **Output shape** — the JSON structure returned

### Step 3: Write Browser-Skill Files

Create three files in `~/.gstack/browser-skills/{skill-name}/`:

**script.ts** — the executable:
```typescript
// Navigate to URL
// Apply selectors
// Return JSON
```

**script.test.ts** — regression test:
```typescript
// Test the selector logic against known page structure
// Verify output shape matches expected
```

**fixture.json** — test data:
```json
// Known input + expected output for test
```

### Step 4: Test in Temp Dir

```bash
cd /tmp/skillify-test
# Run the test against fixture
# Verify it passes
```

### Step 5: Confirm

```
SKILL CREATED: {skill-name}
==============
Trigger: "{trigger phrase}"
Host: {hostname}
Speed: ~200ms (vs ~30s for prototype)
Location: ~/.gstack/browser-skills/{skill-name}/

Commit to permanent storage? Y/N
```

If yes, write to permanent location. If no, discard.

## Output

Permanent browser-skill files ready for /scrape match path.

## Constraints

- Only codify successful prototypes (not broken scrapes)
- Trigger phrases must be unique enough to avoid false matches
- Test must pass before committing to permanent storage

## Execution

SKILL_NAME: skillify
PHASE: cross
SPECIALIST: Memory Engineer
TRIGGERS: skillify | codify | save this scrape | make this permanent
