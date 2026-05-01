import subprocess
import time
import re
import json
from dataclasses import dataclass, field
from typing import Optional, Any
from pathlib import Path

from .step_planner import StepPlanner, Step
from .skill_runner import SkillSpec, DispatchResult
from .hooks import HookManager
from .gates import QualityGate, GateResult


@dataclass
class StepResult:
    step: Step
    status: str
    output: Any = None
    errors: list = field(default_factory=list)
    duration_seconds: float = 0.0


class SkillExecutor:
    def __init__(
        self,
        skill: Optional[SkillSpec] = None,
        hooks: Optional[HookManager] = None,
        gate: Optional[QualityGate] = None
    ):
        self.skill = skill
        self.hooks = hooks
        self.gate = gate
        self.planner = StepPlanner()
        self.steps: list = []
        self.step_results: list = []

    def parse_workflow(self, skill_body: str) -> list:
        self.steps = self.planner.parse_workflow(skill_body)
        return self.steps

    def execute_step(self, step: Step) -> StepResult:
        start = time.time()
        errors = []
        output = None
        status = "DONE"

        try:
            if step.step_type == "bash" and step.code_block:
                output = self._execute_bash(step.code_block)
            elif step.step_type == "ask":
                output = self._execute_ask(step)
            elif step.step_type == "read":
                output = self._execute_read(step)
            elif step.step_type == "write":
                output = self._execute_write(step)
            elif step.step_type == "conditional":
                output = self._execute_conditional(step)
            else:
                output = f"[prose] {step.description[:100]}"

        except Exception as e:
            errors.append(str(e))
            status = "FAIL"

        duration = time.time() - start

        return StepResult(
            step=step,
            status=status,
            output=output,
            errors=errors,
            duration_seconds=duration
        )

    def _execute_bash(self, code: str) -> str:
        code = code.strip()
        if code.startswith("```"):
            code = re.sub(r"^```(?:\w+)?\n?", "", code)
        if code.endswith("```"):
            code = code[:-3]
        code = code.strip()

        if not code:
            return "[no bash code]"

        result = subprocess.run(
            code,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(Path.cwd())
        )

        if result.returncode != 0:
            return f"[ERROR] {result.stderr}"
        return result.stdout[:1000] if result.stdout else "[OK]"

    def _execute_ask(self, step: Step) -> str:
        return json.dumps({
            "action": "ASK_USER",
            "step": step.number,
            "description": step.description,
            "prompt": step.description,
            "context": {"skill": self.skill.name, "phase": self.skill.phase}
        })

    def _execute_read(self, step: Step) -> str:
        return json.dumps({
            "action": "READ_FILES",
            "step": step.number,
            "description": step.description,
            "files_to_read": self._extract_file_paths(step.description),
            "context": {"skill": self.skill.name}
        })

    def _execute_write(self, step: Step) -> str:
        return json.dumps({
            "action": "WRITE_FILES",
            "step": step.number,
            "description": step.description,
            "files_to_write": self._extract_file_specs(step.description),
            "context": {"skill": self.skill.name}
        })

    def _execute_conditional(self, step: Step) -> str:
        return json.dumps({
            "action": "EVALUATE_CONDITION",
            "step": step.number,
            "description": step.description,
            "condition": step.description,
            "context": {"skill": self.skill.name}
        })

    def _extract_file_paths(self, text: str) -> list[str]:
        """Extract file paths from description text."""
        paths = []
        for pattern in [r'["\']([^"\']+\.md)["\']', r'["\']([^"\']+\.py)["\']',
                         r'["\']([^"\']+\.json)["\']', r'["\']([^"\']+\.yaml)["\']']:
            paths.extend(re.findall(pattern, text))
        return list(set(paths))

    def _extract_file_specs(self, text: str) -> list[dict]:
        """Extract file write specs from description."""
        specs = []
        path_matches = re.findall(r'["\']([^"\']+\.(?:md|py|json|yaml|txt))["\']', text)
        for path in path_matches:
            specs.append({"path": path, "instruction": text[:200]})
        return specs

    def execute_all(self, skill_body: str = None) -> DispatchResult:
        if not self.skill:
            raise ValueError("SkillExecutor requires a skill")

        if skill_body:
            self.parse_workflow(skill_body)

        if not self.steps:
            return DispatchResult(
                skill_name=self.skill.name,
                status="DONE",
                output={"message": "no workflow steps"},
                duration_seconds=0.0
            )

        if self.hooks:
            self.hooks.emit(self.skill.phase, "skill_start", {
                "skill": self.skill.name,
                "steps_count": len(self.steps)
            })

        all_errors = []
        all_concerns = []
        step_outputs = []

        for step in self.steps:
            if self.hooks:
                intercept = self.hooks.emit(self.skill.phase, "step_start", {
                    "skill": self.skill.name,
                    "step": step.number,
                    "step_name": step.name
                })
                if intercept and intercept.get("intercepted"):
                    return DispatchResult(
                        skill_name=self.skill.name,
                        status="BLOCKED",
                        output={
                            "blocked_at_step": step.number,
                            "blocked_by_hook": intercept.get("hook"),
                            "reason": intercept.get("reason")
                        },
                        duration_seconds=sum(r.duration_seconds for r in self.step_results),
                        errors=[f"BLOCKED at step {step.number}: {intercept.get('reason')}"],
                        concerns=[],
                        metadata={"intercepted": True}
                    )

            result = self.execute_step(step)
            self.step_results.append(result)
            step_outputs.append({
                "step": step.number,
                "name": step.name,
                "type": step.step_type,
                "status": result.status,
                "output": str(result.output)[:200] if result.output else None,
                "errors": result.errors,
                "duration": result.duration_seconds
            })

            if self.hooks:
                self.hooks.emit(self.skill.phase, "step_end", {
                    "skill": self.skill.name,
                    "step": step.number,
                    "status": result.status,
                    "duration": result.duration_seconds
                })

            if self.gate and result.errors:
                gate_result = self.gate.evaluate({
                    "P1": 0,
                    "P2": len(result.errors),
                    "P3": 0,
                    "issues": result.errors
                })
                if gate_result.verdict.value == "FAIL":
                    return DispatchResult(
                        skill_name=self.skill.name,
                        status="BLOCKED",
                        output={
                            "blocked_at_step": step.number,
                            "gate_violation": "P1=0 gate violated",
                            "step_errors": result.errors
                        },
                        duration_seconds=sum(r.duration_seconds for r in self.step_results),
                        errors=[f"BLOCKED at step {step.number}: P1=0 gate violated"],
                        concerns=result.errors,
                        metadata={"gate_blocked": True}
                    )

            all_errors.extend(result.errors)

        if self.hooks:
            self.hooks.emit(self.skill.phase, "skill_end", {
                "skill": self.skill.name,
                "status": "DONE" if not all_errors else "DONE_WITH_CONCERNS",
                "steps_completed": len(self.step_results),
                "total_steps": len(self.steps)
            })

        final_status = "DONE" if not all_errors else "DONE_WITH_CONCERNS"
        if any(r.status == "BLOCKED" for r in self.step_results):
            final_status = "BLOCKED"

        return DispatchResult(
            skill_name=self.skill.name,
            status=final_status,
            output={
                "skill": self.skill.name,
                "phase": self.skill.phase,
                "specialist": self.skill.specialist,
                "steps": step_outputs,
                "steps_completed": len([r for r in self.step_results if r.status == "DONE"]),
                "total_steps": len(self.steps),
                "workflow": "executed (real)",
            },
            duration_seconds=sum(r.duration_seconds for r in self.step_results),
            errors=all_errors,
            concerns=all_concerns,
            metadata={
                "step_count": len(self.steps),
                "completed_count": len([r for r in self.step_results if r.status == "DONE"])
            }
        )