#!/usr/bin/env python3
"""
gstack-harness CLI — unified entry point.

Usage:
  python harness/cli.py discover          — list all skills
  python harness/cli.py run <skill-name>  — invoke a skill
  python harness/cli.py status           — show harness state
  python harness/cli.py help             — show this message
"""
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from harness.runtime import (
    SkillRunner, Coordinator, MemoryLayer, ContextBudget,
    HookManager, QualityGate, AgentPool, AgentCategory
)


def cmd_discover():
    runner = SkillRunner()
    specs = runner.discover()
    print(f"Available skills ({len(specs)}):")
    for name, spec in sorted(specs.items()):
        print(f"  {name:30s} [{spec.phase}] {spec.specialist}")


def cmd_run(skill_name: str):
    runner = SkillRunner()
    coordinator = Coordinator(runner)

    result = coordinator.run_skill(skill_name)

    output = {
        "skill": result.skill_name,
        "status": result.status,
        "output": result.output,
        "duration_seconds": result.duration_seconds,
        "errors": result.errors,
        "concerns": result.concerns,
    }

    print(json.dumps(output, indent=2))


def cmd_status():
    runner = SkillRunner()
    specs = runner.discover()

    pool = AgentPool()

    print("gstack-harness Runtime Status")
    print("=" * 40)
    print(f"Skills discovered: {len(specs)}")
    print(f"Agents registered: {len(pool.list_all())}")
    print(f"Agent categories: {[c.value for c in AgentCategory]}")

    ctx = ContextBudget()
    ok, violations = ctx.enforce_budget()
    print(f"Context budget: {'OK' if ok else 'EXCEEDED'}")
    if violations:
        for v in violations:
            print(f"  - {v}")


def cmd_help():
    print(__doc__)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"

    if cmd == "discover":
        cmd_discover()
    elif cmd == "run":
        skill_name = sys.argv[2] if len(sys.argv) > 2 else None
        if not skill_name:
            print("Error: run requires <skill-name>", file=sys.stderr)
            print("Usage: python harness/cli.py run <skill-name>", file=sys.stderr)
            sys.exit(1)
        cmd_run(skill_name)
    elif cmd == "status":
        cmd_status()
    elif cmd == "help":
        cmd_help()
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        cmd_help()
        sys.exit(1)


if __name__ == "__main__":
    main()