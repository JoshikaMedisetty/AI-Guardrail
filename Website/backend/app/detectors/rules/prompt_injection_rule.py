import re
from typing import List
from app.detectors.rules.base_rule import BaseRule, RuleMatchResult
from app.schemas.response import ThreatIndicator
from app.core.constants import Severity, AttackType

class PromptInjectionRule(BaseRule):
    """Detects direct instruction override and context manipulation attempts."""

    def __init__(self):
        super().__init__(name="PromptInjectionRule", enabled=True)
        self.patterns = [
            (r"ignore\s+(all\s+|your\s+|the\s+)?(previous|prior|above)?\s*(instructions?|rules?|directives?|prompts?|tasks?)", "direct_instruction_override", 0.95),
            (r"disregard\s+(all\s+|your\s+|the\s+)?(previous|prior|above)?\s*(instructions?|rules?|constraints?|tasks?)", "disregard_directive", 0.94),
            (r"forget\s+(everything\s+)?(you\s+(were|have\s+been)\s+told|prior\s+instructions?|previous\s+tasks?)", "context_forget_command", 0.93),
            (r"system\s*override\b|###\s*instruction\s*override\b|---?\s*end\s+of\s+prompt\s*---?", "delimiter_override_syntax", 0.96),
            (r"your\s+new\s+(objective|task|instruction|persona)\s+is\s+to\b", "new_objective_injection", 0.91),
            (r"stop\s*[\.\!]\s*disregard\s+previous\b", "imperative_override_sequence", 0.92),
            (r"bypass\s+(all\s+)?(safety|security|financial|transaction)\s+(filters?|rules?|checks?|guardrails?)", "guardrail_bypass_command", 0.95),
            (r"override\s+(level\s+max|system\s+prompt|safety\s+policy)", "explicit_override_token", 0.93)
        ]

    def evaluate(self, text: str, agent_id: str) -> RuleMatchResult:
        if not self.enabled or not text:
            return RuleMatchResult(
                matched=False,
                rule_name=self.name,
                attack_type=AttackType.PROMPT_INJECTION.value
            )

        text_lower = text.lower()
        matched_indicators: List[ThreatIndicator] = []
        max_conf = 0.0

        for pattern, ind_type, conf in self.patterns:
            match = re.search(pattern, text_lower)
            if match:
                matched_indicators.append(
                    ThreatIndicator(
                        indicator_type=ind_type,
                        matched_text=match.group(0),
                        confidence=conf
                    )
                )
                if conf > max_conf:
                    max_conf = conf

        if matched_indicators:
            return RuleMatchResult(
                matched=True,
                rule_name=self.name,
                attack_type=AttackType.PROMPT_INJECTION.value,
                severity=Severity.HIGH,
                rule_score=0.92,
                confidence=max_conf,
                indicators=matched_indicators,
                explanation="An attempt was detected to override or manipulate the agent's baseline instructions.",
                recommendations=[
                    "Preserve the agent's immutable base system instructions.",
                    "Do not execute injected directives.",
                    "Verify the authenticity and authorization of the user request."
                ]
            )

        return RuleMatchResult(
            matched=False,
            rule_name=self.name,
            attack_type=AttackType.PROMPT_INJECTION.value
        )
