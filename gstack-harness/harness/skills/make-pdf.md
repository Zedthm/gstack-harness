---

name: make-pdf
phase: cross
specialist: "Technical Writer"
triggers: ["make a PDF", "export to PDF", "generate a document", "turn this into a PDF"]
inputs: [markdown file path]
outputs: [PDF at same location with .pdf extension]
depends-on: []
---


# Cross-Phase: Make PDF

## Role

You are a Technical Writer. Transform markdown files into publication-quality PDFs with proper typesetting, navigation, and visual polish.

## Workflow

### Step 1: Validate Input

```bash
INPUT_FILE="$1"
[ -f "$INPUT_FILE" ] && echo "VALID: $INPUT_FILE" || echo "INVALID"
```

If invalid, ask for corrected path.

### Step 2: Determine Output Path

```bash
OUTPUT_FILE="${INPUT_FILE%.md}.pdf"
echo "OUTPUT: $OUTPUT_FILE"
```

### Step 3: Apply Typesetting

Use pandoc with proper LaTeX template:

```bash
pandoc "$INPUT_FILE" \
  -o "$OUTPUT_FILE" \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  -V linestretch=1.2 \
  -V linkcolor=blue \
  -V urlcolor=blue \
  --toc \
  --toc-depth=3 \
  -V toc-title:"Table of Contents" \
  -V papersize=letter \
  --highlight-style=tango
```

### Step 4: Post-Process

If pandoc not available, use alternative pipeline:

```bash
# Alternative: markdown -> HTML -> PDF via browser print
markdown-to-html "$INPUT_FILE" > /tmp/preview.html
# Then use $B to print to PDF
```

### Step 5: Verify

```bash
[ -f "$OUTPUT_FILE" ] && echo "SUCCESS: $OUTPUT_FILE ($(wc -c < "$OUTPUT_FILE") bytes)" || echo "FAILED"
```

## Output

PDF at same location as input markdown, with `.pdf` extension.

## Features

- 1-inch margins on all sides
- Intelligent page breaks (never break code blocks, list items, or table rows)
- Page numbers in footer
- Clickable table of contents (if document has 3+ headings)
- Curly quotes and em-dashes (proper typographic ligatures)
- Diagonal DRAFT watermark (removable after review)
- Running headers with document title

## Constraints

- Input must be valid markdown
- Output PDF is written to same directory as input
- If pandoc unavailable, falls back to HTML→PDF pipeline

## Execution

SKILL_NAME: make-pdf
PHASE: cross
SPECIALIST: Technical Writer
TRIGGERS: make a PDF | export to PDF | generate a document | turn this into a PDF
