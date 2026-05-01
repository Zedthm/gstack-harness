import json
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Any
import time


@dataclass
class MemoryEntry:
    key: str
    value: str
    source: str
    timestamp: float
    tags: list[str] = field(default_factory=list)


class MemoryLayer(ABC):
    """Abstract base for memory layers. Local override wins ordering."""

    def __init__(self, base_path: Optional[str] = None):
        self.base_path = Path(base_path) if base_path else self._default_path()
        self.base_path.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, MemoryEntry] = {}
        self._load()

    @abstractmethod
    def _default_path(self) -> Path:
        pass

    @abstractmethod
    def _layer_priority(self) -> int:
        pass

    def _load(self):
        index_file = self.base_path / "index.jsonl"
        if index_file.exists():
            with open(index_file) as f:
                for line in f:
                    if line.strip():
                        entry_data = json.loads(line)
                        entry = MemoryEntry(**entry_data)
                        self._cache[entry.key] = entry

    def _save(self):
        index_file = self.base_path / "index.jsonl"
        with open(index_file, "w") as f:
            for entry in self._cache.values():
                f.write(json.dumps(entry.__dict__) + "\n")

    def get(self, key: str) -> Optional[str]:
        entry = self._cache.get(key)
        return entry.value if entry else None

    def set(self, key: str, value: str, tags: list[str] = None):
        entry = MemoryEntry(
            key=key,
            value=value,
            source=self.__class__.__name__,
            timestamp=time.time(),
            tags=tags or []
        )
        self._cache[key] = entry
        self._save()

    def delete(self, key: str):
        if key in self._cache:
            del self._cache[key]
            self._save()

    def list_keys(self) -> list[str]:
        return list(self._cache.keys())

    def search(self, query: str) -> list[MemoryEntry]:
        q = query.lower()
        return [e for e in self._cache.values() if q in e.value.lower()]


class LocalMemory(MemoryLayer):
    """Most specific - project or workspace local."""

    def _default_path(self) -> Path:
        return Path.cwd() / ".gstack-harness" / "memory"

    def _layer_priority(self) -> int:
        return 0


class ProjectMemory(MemoryLayer):
    """Project-scoped memory."""

    def _default_path(self) -> Path:
        slug = os.environ.get("GSTACK_PROJECT_SLUG", "default")
        home = Path.home()
        return home / ".gstack-harness" / "projects" / slug / "memory"

    def _layer_priority(self) -> int:
        return 1


class UserMemory(MemoryLayer):
    """User-scoped memory across projects."""

    def _default_path(self) -> Path:
        return Path.home() / ".gstack-harness" / "user" / "memory"

    def _layer_priority(self) -> int:
        return 2


class OrgMemory(MemoryLayer):
    """Organization-scoped memory."""

    def _default_path(self) -> Path:
        return Path.home() / ".gstack-harness" / "org" / "memory"

    def _layer_priority(self) -> int:
        return 3


class AutoMemory:
    """Extracts decisions, feedback, patterns from conversation."""

    def __init__(self):
        self.local = LocalMemory()
        self.project = ProjectMemory()
        self.user = UserMemory()
        self.org = OrgMemory()

    def get(self, key: str) -> Optional[str]:
        """Local override wins: check local first, then project, user, org."""
        for layer in [self.local, self.project, self.user, self.org]:
            val = layer.get(key)
            if val is not None:
                return val
        return None

    def set(self, key: str, value: str, tags: list[str] = None, layer: str = "local"):
        """Set in specified layer (default: local)."""
        layer_map = {"local": self.local, "project": self.project, "user": self.user, "org": self.org}
        target = layer_map.get(layer, self.local)
        target.set(key, value, tags)

    def log_decision(self, decision: str, context: str = ""):
        self.set(f"decision:{int(time.time())}", f"{decision} | {context}", tags=["decision"])

    def log_pattern(self, pattern: str, insight: str):
        self.set(f"pattern:{int(time.time())}", f"{pattern}: {insight}", tags=["pattern"])

    def log_feedback(self, feedback: str):
        self.set(f"feedback:{int(time.time())}", feedback, tags=["feedback"])


class MemoryIndex:
    """Maintains search index over all layers."""

    def __init__(self):
        self.layers = [LocalMemory(), ProjectMemory(), UserMemory(), OrgMemory()]

    def search(self, query: str, max_results: int = 10) -> list[tuple[str, MemoryEntry]]:
        results = []
        for layer in self.layers:
            for entry in layer.search(query):
                results.append((layer.__class__.__name__, entry))
        return results[:max_results]