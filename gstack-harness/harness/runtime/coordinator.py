import json
import time
from enum import Enum
from typing import Optional, Any
from dataclasses import dataclass, field

from .skill_runner import SkillRunner, SkillSpec, DispatchResult
from .hooks import HookManager
from .gates import QualityGate


class OrchestrationMode(Enum):
    COORDINATOR = "coordinator"
    FORK = "fork"
    SWARM = "swarm"


class DispatchTable:
    def __init__(self):
        self._table = {
            "review": OrchestrationMode.FORK,
            "plan-ceo-review": OrchestrationMode.FORK,
            "plan-eng-review": OrchestrationMode.FORK,
            "plan-design-review": OrchestrationMode.FORK,
            "plan-devex-review": OrchestrationMode.FORK,
            "autoplan": OrchestrationMode.FORK,
            "codex": OrchestrationMode.FORK,
            "security": OrchestrationMode.FORK,
            "qa": OrchestrationMode.SWARM,
            "qa-only": OrchestrationMode.SWARM,
            "devex-review": OrchestrationMode.SWARM,
            "browse": OrchestrationMode.SWARM,
            "benchmark": OrchestrationMode.SWARM,
            "canary": OrchestrationMode.SWARM,
            "office-hours": OrchestrationMode.COORDINATOR,
            "design-consultation": OrchestrationMode.COORDINATOR,
            "design-shotgun": OrchestrationMode.COORDINATOR,
            "design-html": OrchestrationMode.COORDINATOR,
            "investigate": OrchestrationMode.COORDINATOR,
            "ship": OrchestrationMode.COORDINATOR,
            "land-and-deploy": OrchestrationMode.COORDINATOR,
            "retro": OrchestrationMode.COORDINATOR,
            "document-release": OrchestrationMode.COORDINATOR,
            "context-save": OrchestrationMode.COORDINATOR,
            "context-restore": OrchestrationMode.COORDINATOR,
            "learn": OrchestrationMode.COORDINATOR,
            "health": OrchestrationMode.COORDINATOR,
        }

    def get_mode(self, skill_name: str) -> OrchestrationMode:
        return self._table.get(skill_name, OrchestrationMode.COORDINATOR)


class Coordinator:
    def __init__(self, runner: Optional[SkillRunner] = None, gate: Optional[QualityGate] = None):
        self.runner = runner or SkillRunner()
        self.dispatch_table = DispatchTable()
        self._gate = gate or QualityGate()
        self._memory = None
        self._hooks = None
        self._context = None
        self._history: list = []

    @property
    def memory(self):
        if self._memory is None:
            from .memory import AutoMemory
            self._memory = AutoMemory()
        return self._memory

    @property
    def hooks(self):
        if self._hooks is None:
            self._hooks = HookManager()
        return self._hooks

    @property
    def context(self):
        if self._context is None:
            from .context import ContextBudget
            self._context = ContextBudget()
        return self._context

    def emit_hook(self, phase: str, event: str, data: dict = None):
        try:
            self.hooks.emit(phase, event, data or {})
        except Exception as e:
            print(f"Hook error: {e}")

    def run_skill(self, skill_name: str, context: dict = None) -> DispatchResult:
        start = time.time()
        skill = self.runner.find_by_name(skill_name)

        if not skill:
            return DispatchResult(
                skill_name=skill_name,
                status="BLOCKED",
                output=None,
                duration_seconds=time.time() - start,
                errors=[f"Skill not found: {skill_name}"]
            )

        self.emit_hook(skill.phase, "skill_start", {
            "skill": skill_name,
            "specialist": skill.specialist
        })

        try:
            result = self._execute_skill(skill, context or {})
            duration = time.time() - start

            self.emit_hook(skill.phase, "skill_end", {
                "skill": skill_name,
                "status": result.status,
                "duration": duration
            })

            self._history.append(result)
            return result

        except Exception as e:
            duration = time.time() - start
            self.emit_hook(skill.phase, "skill_error", {
                "skill": skill_name,
                "error": str(e)
            })
            return DispatchResult(
                skill_name=skill_name,
                status="BLOCKED",
                output=None,
                duration_seconds=duration,
                errors=[str(e)]
            )

    def _execute_skill(self, skill: SkillSpec, context: dict) -> DispatchResult:
        from .executor import SkillExecutor

        skill_file = self.runner.skills_dir / f"{skill.name}.md"
        if not skill_file.exists():
            return DispatchResult(
                skill_name=skill.name,
                status="BLOCKED",
                output=None,
                duration_seconds=0.0,
                errors=[f"Skill file not found: {skill_file}"]
            )

        body = skill_file.read_text()

        executor = SkillExecutor(
            skill=skill,
            hooks=self.hooks,
            gate=self._gate
        )

        result = executor.execute_all(body)
        return result

    def run_parallel(self, skill_names: list[str], context: dict = None) -> dict[str, DispatchResult]:
        results = {}
        for name in skill_names:
            results[name] = self.run_skill(name, context)
        return results

    def run_swarm(self, skill_names: list[str], context: dict = None) -> dict[str, DispatchResult]:
        return self.run_parallel(skill_names, context)

    def load_context(self):
        saved = self.memory.get("coordinator_context")
        if saved:
            pass

    def save_context(self):
        pass

    def history(self) -> list:
        return self._history