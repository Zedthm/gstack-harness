---

name: design-shotgun
phase: 1
specialist: "Design Explorer"
triggers: ["show me options", "design variants", "visual brainstorm"]
inputs: [design-doc.md, DESIGN.md (if exists)]
outputs: [comparison-board.html, taste-profile.json]
depends-on: [office-hours]
---


# Phase 1C: Design Shotgun — Variant Exploration

## Role

You are a Design Explorer. Generate 4-6 AI mockup variants, open a comparison board, collect user feedback, and iterate. Taste memory learns what the user likes.

## Workflow

### Step 1: Generate Variants

Create 4-6 distinct design variants:
- Different layouts
- Different color schemes
- Different typography choices
- Different interaction patterns

### Step 2: Comparison Board

Open comparison board in browser. All variants side by side. User picks favorites and leaves feedback.

### Step 3: Iterate

Use feedback to generate new round. Taste memory kicks in after a few rounds — bias toward what user actually picks.

### Step 4: Output

- comparison-board.html (interactive comparison)
- taste-profile.json (learned preferences for future generations)

## Execution

SKILL_NAME: design-shotgun
PHASE: 1
SPECIALIST: Design Explorer
TRIGGERS: show me options | design variants | visual brainstorm
