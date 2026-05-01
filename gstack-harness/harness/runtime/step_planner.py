import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Step:
    number: int
    name: str
    description: str
    step_type: str
    content: str
    code_block: Optional[str] = None


class StepPlanner:

    def parse_workflow(self, body: str) -> list[Step]:
        workflow_match = re.search(
            r"##\s+Workflow\s*\n(.*?)(?=\n##\s|\Z)",
            body,
            re.DOTALL | re.IGNORECASE
        )
        if not workflow_match:
            return []

        workflow_content = workflow_match.group(1)
        steps = []

        step_pattern = re.compile(
            r"^#{1,3}\s+Step\s+(\d+)[:.]\s*(.*?)(?=\n#{1,3}\s+Step|\n##|\Z)",
            re.DOTALL | re.MULTILINE
        )

        for match in step_pattern.finditer(workflow_content):
            number = int(match.group(1))
            title = match.group(2).strip()

            step_content = match.group(0)
            desc, code = self._split_content(step_content)
            step_type = self._classify_step(desc, code)

            steps.append(Step(
                number=number,
                name=title,
                description=desc,
                step_type=step_type,
                content=step_content,
                code_block=code
            ))

        return sorted(steps, key=lambda s: s.number)

    def _split_content(self, content: str) -> tuple[str, Optional[str]]:
        code_match = re.search(r"```(?:\w+)?\n(.*?)```", content, re.DOTALL)
        if code_match:
            code = code_match.group(1).strip()
            desc_start = content[:code_match.start()]
            desc = re.sub(r"^#{1,3}\s+Step\s+\d+[:.]\s*", "", desc_start, flags=re.IGNORECASE).strip()
            return desc, code
        desc = re.sub(r"^#{1,3}\s+Step\s+\d+[:.]\s*", "", content, flags=re.IGNORECASE).strip()
        return desc, None

    def _classify_step(self, description: str, code_block: Optional[str]) -> str:
        if code_block:
            return "bash"
        desc_lower = description.lower()
        if "ask" in desc_lower or "?" in description:
            return "ask"
        if "read" in desc_lower or "read file" in desc_lower:
            return "read"
        if "write" in desc_lower or "create file" in desc_lower or "write" in desc_lower:
            return "write"
        if "if " in desc_lower or "check" in desc_lower:
            return "conditional"
        return "prose"

    def parse_step_number(self, step_name: str) -> Optional[int]:
        m = re.search(r"Step\s+(\d+)", step_name, re.IGNORECASE)
        return int(m.group(1)) if m else None