from dataclasses import dataclass, field
from typing import Optional, Any
from enum import Enum


class AgentCategory(Enum):
    COORDINATOR = "coordinator"
    EXECUTOR = "executor"
    REVIEWER = "reviewer"
    QA = "qa"
    DESIGNER = "designer"


@dataclass
class AgentProfile:
    name: str
    category: AgentCategory
    skills: list[str] = field(default_factory=list)
    tools: list[str] = field(default_factory=list)
    context_budget: int = 50000
    description: str = ""


@dataclass
class AgentAssignment:
    skill_name: str
    agent_profile: AgentProfile
    context: dict = field(default_factory=dict)
    status: str = "assigned"


class AgentPool:
    def __init__(self):
        self._agents: dict[str, AgentProfile] = {}
        self._skill_map: dict[str, str] = {}
        self._register_defaults()

    def _register_defaults(self):
        profiles = [
            AgentProfile(
                name="coordinator",
                category=AgentCategory.COORDINATOR,
                skills=["office-hours", "autoplan", "plan-ceo-review", "plan-eng-review"],
                tools=["SkillRunner", "Coordinator", "ContextBudget", "HookManager"],
                context_budget=50000,
                description="Orchestrates multi-agent workflows, manages context, emits hooks"
            ),
            AgentProfile(
                name="executor",
                category=AgentCategory.EXECUTOR,
                skills=["design-html", "investigate"],
                tools=["Edit", "Write", "Bash"],
                context_budget=30000,
                description="Implements features following specs, writes code"
            ),
            AgentProfile(
                name="reviewer",
                category=AgentCategory.REVIEWER,
                skills=["review", "codex", "health"],
                tools=["Read", "Grep", "Glob"],
                context_budget=25000,
                description="Code review, finds bugs, enforces quality gates"
            ),
            AgentProfile(
                name="qa",
                category=AgentCategory.QA,
                skills=["qa", "qa-only", "browse", "canary", "benchmark", "devex-review"],
                tools=["Bash", "Playwright"],
                context_budget=35000,
                description="Browser testing, bug detection, performance measurement"
            ),
            AgentProfile(
                name="designer",
                category=AgentCategory.DESIGNER,
                skills=["design-review", "design-consultation", "design-shotgun", "design-html", "plan-design-review"],
                tools=["Read", "Write", "Bash"],
                context_budget=25000,
                description="UI/UX design, design systems, visual QA"
            ),
        ]

        for profile in profiles:
            self.register(profile)

        self._skill_map = {
            "review": "reviewer",
            "codex": "reviewer",
            "health": "reviewer",
            "qa": "qa",
            "qa-only": "qa",
            "browse": "qa",
            "canary": "qa",
            "benchmark": "qa",
            "devex-review": "qa",
            "design-review": "designer",
            "design-consultation": "designer",
            "design-shotgun": "designer",
            "design-html": "designer",
            "plan-design-review": "designer",
            "office-hours": "coordinator",
            "autoplan": "coordinator",
            "plan-ceo-review": "coordinator",
            "plan-eng-review": "coordinator",
            "plan-devex-review": "coordinator",
            "design-html": "executor",
            "investigate": "executor",
        }

    def register(self, profile: AgentProfile):
        self._agents[profile.name] = profile

    def get(self, name: str) -> Optional[AgentProfile]:
        return self._agents.get(name)

    def list_by_category(self, category: str) -> list[AgentProfile]:
        cat = AgentCategory(category)
        return [a for a in self._agents.values() if a.category == cat]

    def list_all(self) -> list[str]:
        return list(self._agents.keys())

    def agent_for_skill(self, skill_name: str) -> Optional[AgentProfile]:
        agent_name = self._skill_map.get(skill_name)
        if agent_name:
            return self._agents.get(agent_name)
        return self._agents.get("executor")

    def dispatch(self, skill_name: str, context: dict = None) -> AgentAssignment:
        profile = self.agent_for_skill(skill_name)
        if not profile:
            return AgentAssignment(
                skill_name=skill_name,
                agent_profile=None,
                context=context or {},
                status="NO_AGENT"
            )

        return AgentAssignment(
            skill_name=skill_name,
            agent_profile=profile,
            context=context or {},
            status="assigned"
        )