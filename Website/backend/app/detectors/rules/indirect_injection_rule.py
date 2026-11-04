import re
from typing import List
from app.detectors.rules.base_rule import BaseRule, RuleMatchResult
from app.schemas.response import ThreatIndicator
from app.core.constants import Severity, AttackType

class IndirectInjectionRule(BaseRule):
    """Detects indirect prompt injection embedded inside data tags, comments, or external text."""

    def __init__(self):
        super().__init__(name="IndirectInjectionRule", enabled=True)
        self.patterns = [
            (r"\[SYSTEM\s+INSTRUCTION:.*?\]", "bracketed_system_injection", 0.94),
            (r"<\s*system\s*>.*?</\s*system\s*>", "xml_system_tag_injection", 0.95),
            (r"<!--\s*Note:\s*Override.*?-->", "html_comment_override_injection", 0.93),
            (r"\[ADMIN\s+OVERRIDE:.*?\]", "admin_override_tag_injection", 0.96),
            (r"<\s*payload\s*>.*?</\s*payload\s*>", "payload_tag_injection", 0.92),
            (r"###\s*INSTRUCTION:\s*(Give|Ignore|Rate|Execute).*?\n", "markdown_header_injection", 0.91)
        ]

    def evaluate(self, text: str, agent_id: str) -> RuleMatchResult:
        if not self.enabled or not text:
            return RuleMatchResult(matched=False, rule_name=self.name, attack_type="Indirect Prompt Injection")

        matched_indicators: List[ThreatIndicator] = []
        max_conf = 0.0

        for pattern, ind_type, conf in self.patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                matched_indicators.append(
                    ThreatIndicator(
                        indicator_type=ind_type,
                        matched_text=match.group(0)[:80],
                        confidence=conf
                    )
                )
                if conf > max_conf:
                    max_conf = conf

        if matched_indicators:
            return RuleMatchResult(
                matched=True,
                rule_name=self.name,
                attack_type="Indirect Prompt Injection",
                severity=Severity.HIGH,
                rule_score=0.91,
                confidence=max_conf,
                indicators=matched_indicators,
                explanation="Indirect prompt injection detected embedded inside structured document tags or external content.",
                recommendations=[
                    "Strip HTML/XML pseudo-system directives from ingested context.",
                    "Treat all external data retrieved by agents as untrusted data rather than instructions.",
                    "Enforce strict delimiter isolation between data and system prompts."
                ]
            )

        return RuleMatchResult(matched=False, rule_name=self.name, attack_type="Indirect Prompt Injection")
