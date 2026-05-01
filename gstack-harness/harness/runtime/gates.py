from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class Verdict(Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARN = "WARN"


@dataclass
class GateResult:
    verdict: Verdict
    P1_count: int = 0
    P2_count: int = 0
    P3_count: int = 0
    issues: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)

    def summary(self) -> str:
        return f"GateResult({self.verdict.value}, P1={self.P1_count}, P2={self.P2_count}, P3={self.P3_count})"


class QualityGate:
    def __init__(self, max_P2: int = 5):
        self.max_P2 = max_P2

    def evaluate(self, findings: dict) -> GateResult:
        p1 = findings.get("P1", 0)
        p2 = findings.get("P2", 0)
        p3 = findings.get("P3", 0)
        issues = findings.get("issues", [])
        recommendations = findings.get("recommendations", [])

        if p1 > 0:
            verdict = Verdict.FAIL
        elif p2 > self.max_P2:
            verdict = Verdict.FAIL
        elif p3 > 10:
            verdict = Verdict.WARN
        else:
            verdict = Verdict.PASS

        return GateResult(
            verdict=verdict,
            P1_count=p1,
            P2_count=p2,
            P3_count=p3,
            issues=issues,
            recommendations=recommendations
        )

    def enforce(self, skill_name: str, result: GateResult):
        if result.P1_count > 0:
            raise BlockedError(
                f"QUALITY GATE BLOCKED: {skill_name}\n"
                f"P1 issues: {result.P1_count}\n"
                f"Issues: {result.issues}"
            )

    def report(self, result: GateResult) -> str:
        lines = [
            f"QUALITY GATE: {result.verdict.value}",
            f"P1 (blocking): {result.P1_count}",
            f"P2 (<5 allowed): {result.P2_count}/{self.max_P2}",
            f"P3 (recommendations): {result.P3_count}",
        ]
        if result.issues:
            lines.append("ISSUES:")
            for issue in result.issues:
                lines.append(f"  - {issue}")
        if result.recommendations:
            lines.append("RECOMMENDATIONS:")
            for rec in result.recommendations:
                lines.append(f"  - {rec}")
        return "\n".join(lines)


class BlockedError(Exception):
    pass