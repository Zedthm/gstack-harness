import re
import os
import yaml
from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path


@dataclass
class SkillSpec:
    """Parsed skill definition."""
    name: str
    phase: str  # e.g., "cross", "1", "2", "7+"
    specialist: str
    triggers: list[str]
    inputs: list[str]
    outputs: list[str]
    depends_on: list[str]
    frontmatter: dict
    steps: list[str]  # workflow steps as markdown text
    output_discipline: str  # what the skill produces


@dataclass
class SkillInvocation:
    """A triggered skill invocation."""
    skill: SkillSpec
    trigger: str
    context: dict  # arbitrary context passed by caller
    started_at: str  # ISO timestamp


@dataclass
class DispatchResult:
    """Result of a skill dispatch."""
    skill_name: str
    status: str
    output: any
    duration_seconds: float
    errors: list = field(default_factory=list)
    concerns: list = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


class SkillRunner:
    """
    Discovers, parses, and executes skills.

    Skills live in harness/skills/*.md with YAML frontmatter.
    Triggers are matched against user input to find applicable skills.
    """

    def __init__(self, skills_dir: Optional[str] = None):
        if skills_dir is None:
            base = Path(__file__).parent.parent.parent
            skills_dir = base / "harness" / "skills"
        self.skills_dir = Path(skills_dir)
        self._cache: dict[str, SkillSpec] = {}

    def discover(self) -> dict[str, SkillSpec]:
        """Scan skills directory and parse all skill files."""
        if self._cache:
            return self._cache

        specs = {}
        for md_file in self.skills_dir.glob("*.md"):
            if md_file.name == "AGENTS.md":
                continue
            try:
                spec = self._parse_skill(md_file)
                specs[spec.name] = spec
            except Exception as e:
                print(f"SKIP {md_file.name}: {e}")
        self._cache = specs
        return specs

    def _parse_skill(self, path: Path) -> SkillSpec:
        """Parse a skill markdown file into a SkillSpec."""
        content = path.read_text()
        frontmatter, body = self._split_frontmatter(content)

        fm = yaml.safe_load(frontmatter)

        steps = self._extract_steps(body)

        return SkillSpec(
            name=fm["name"],
            phase=str(fm.get("phase", "cross")),
            specialist=fm.get("specialist", "Unknown"),
            triggers=fm.get("triggers", []),
            inputs=fm.get("inputs", []),
            outputs=fm.get("outputs", []),
            depends_on=fm.get("depends-on", []),
            frontmatter=fm,
            steps=steps,
            output_discipline=self._extract_output_discipline(body)
        )

    def _split_frontmatter(self, content: str) -> tuple[str, str]:
        """Split YAML frontmatter from markdown body."""
        if content.startswith("---"):
            parts = content.split("---", 2)
            return parts[1], parts[2]
        return "", content

    def _extract_steps(self, body: str) -> list[str]:
        """Extract numbered workflow steps from body."""
        steps = []
        lines = body.split("\n")
        in_steps = False
        for line in lines:
            # Detect workflow section
            if re.match(r"^##\s+(Workflow|Steps|Steps\s+\d)", line, re.IGNORECASE):
                in_steps = True
                continue
            if in_steps:
                # Stop at next ## heading (but not ### Step lines)
                if line.startswith("## ") and not re.match(r"^###\s+Step", line):
                    break
                # Match numbered steps like "### Step 1" or "### Step 1:"
                m = re.match(r"^#{1,3}\s+(Step\s+\d+[:.]?\s*.*)", line, re.IGNORECASE)
                if m:
                    steps.append(m.group(1))
        return steps

    def _extract_output_discipline(self, body: str) -> str:
        """Extract output discipline from body."""
        m = re.search(r"##\s+Output\s*\n\s*(.+?)(?:\n##|\Z)", body, re.DOTALL | re.IGNORECASE)
        if m:
            return m.group(1).strip()
        return ""

    def find_by_trigger(self, query: str) -> Optional[SkillSpec]:
        """Find skill matching a trigger phrase."""
        query_lower = query.lower()
        specs = self.discover()
        for name, spec in specs.items():
            for trigger in spec.triggers:
                if trigger.lower() in query_lower:
                    return spec
        return None

    def find_by_name(self, name: str) -> Optional[SkillSpec]:
        """Get skill by exact name."""
        specs = self.discover()
        return specs.get(name)

    def find_by_phase(self, phase: str) -> list[SkillSpec]:
        """Get all skills for a given phase."""
        specs = self.discover()
        return [s for s in specs.values() if s.phase == phase]

    def list_all(self) -> list[str]:
        """List all available skill names."""
        return list(self.discover().keys())