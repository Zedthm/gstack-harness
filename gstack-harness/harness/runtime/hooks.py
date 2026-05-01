from dataclasses import dataclass, field
from typing import Callable, Optional
from enum import Enum


class Phase(Enum):
    INTENT_GATE = "intent_gate"
    THINK = "think"
    PLAN = "plan"
    BUILD = "build"
    REVIEW_TEST = "review_test"
    SHIP = "ship"


@dataclass
class Hook:
    name: str
    phase: str
    event: str
    callback: Callable
    when_fn: Optional[Callable] = None

    def should_fire(self, phase: str, event: str, data: dict) -> bool:
        if self.phase != "*" and self.phase != phase:
            return False
        if self.event != event:
            return False
        if self.when_fn and not self.when_fn(data):
            return False
        return True


class HookManager:
    def __init__(self):
        self._hooks: list[Hook] = []
        self._register_builtin()

    def _register_builtin(self):
        self.register_hook(Hook(
            name="builtin_on_phase_start",
            phase="*",
            event="before",
            callback=lambda data: None
        ))

        self.register_hook(Hook(
            name="builtin_on_phase_end",
            phase="*",
            event="after",
            callback=lambda data: None
        ))

        self.register_hook(Hook(
            name="builtin_on_skill_start",
            phase="*",
            event="before",
            callback=lambda data: None
        ))

        self.register_hook(Hook(
            name="builtin_on_skill_end",
            phase="*",
            event="after",
            callback=lambda data: None
        ))

        self.register_hook(Hook(
            name="builtin_on_error",
            phase="*",
            event="after",
            callback=lambda data: None,
            when_fn=lambda data: data.get("error") is not None
        ))

    def register_hook(self, hook: Hook):
        self._hooks.append(hook)

    def unregister_hook(self, name: str):
        self._hooks = [h for h in self._hooks if h.name != name]

    def emit(self, phase: str, event: str, data: dict) -> Optional[dict]:
        for hook in self._hooks:
            if hook.should_fire(phase, event, data):
                try:
                    result = hook.callback(data)
                    if result and result.get("intercept"):
                        return {"intercepted": True, "hook": hook.name, "reason": result.get("reason")}
                except Exception as e:
                    print(f"Hook error in {hook.name}: {e}")
        return None

    def list_hooks(self) -> list[str]:
        return [h.name for h in self._hooks]