import json
from dataclasses import dataclass, field
from typing import Optional, Any
from pathlib import Path


@dataclass
class ContextSection:
    name: str
    max_bytes: int
    content: str = ""

    def size(self) -> int:
        return len(self.content.encode('utf-8'))

    def is_within_limit(self) -> bool:
        return self.size() <= self.max_bytes

    def truncate(self) -> str:
        if self.is_within_limit():
            return self.content
        max_chars = self.max_bytes // 4
        return self.content[:max_chars] + "... [TRUNCATED]"


@dataclass
class ContextBudget:
    max_always_on: int = 50000
    max_memory_index: int = 25000
    max_skill_catalog: int = 15360
    max_agents_md: int = 5120
    max_config: int = 1024

    _always_on: ContextSection = field(default=None)
    _instructions: ContextSection = field(default=None)
    _resources: dict[str, ContextSection] = field(default_factory=dict)

    def __post_init__(self):
        self._always_on = ContextSection("always_on", self.max_always_on)
        self._instructions = ContextSection("instructions", 0)

    def get_always_on(self) -> str:
        return self._always_on.content

    def set_always_on(self, content: str):
        self._always_on.content = content
        if not self._always_on.is_within_limit():
            self._always_on.content = self._always_on.truncate()

    def load_instructions(self, skill_name: str, instructions: str, max_size: int = 15360):
        self._instructions = ContextSection(f"instructions:{skill_name}", max_size)
        self._instructions.content = instructions
        if not self._instructions.is_within_limit():
            self._instructions.content = self._instructions.truncate()

    def get_instructions(self) -> str:
        return self._instructions.content if self._instructions else ""

    def load_resource(self, name: str, content: str, max_size: int = 50000):
        section = ContextSection(f"resource:{name}", max_size)
        section.content = content
        if not section.is_within_limit():
            section.content = section.truncate()
        self._resources[name] = section

    def get_resource(self, name: str) -> Optional[str]:
        section = self._resources.get(name)
        return section.content if section else None

    def enforce_budget(self) -> tuple[bool, list[str]]:
        violations = []
        if not self._always_on.is_within_limit():
            violations.append(f"always_on exceeds {self._always_on.max_bytes} bytes")
        if self._instructions and not self._instructions.is_within_limit():
            violations.append(f"instructions exceeds {self._instructions.max_bytes} bytes")
        for name, section in self._resources.items():
            if not section.is_within_limit():
                violations.append(f"resource:{name} exceeds {section.max_bytes} bytes")
        return len(violations) == 0, violations

    def total_size(self) -> int:
        total = self._always_on.size()
        if self._instructions:
            total += self._instructions.size()
        for section in self._resources.values():
            total += section.size()
        return total

    def clear_resources(self):
        self._resources.clear()

    def to_dict(self) -> dict:
        return {
            "always_on_size": self._always_on.size(),
            "always_on_preview": self._always_on.content[:200],
            "instructions_loaded": bool(self._instructions and self._instructions.content),
            "resource_count": len(self._resources),
            "total_bytes": self.total_size(),
        }