import re
from typing import List
from app.detectors.rules.base_rule import BaseRule, RuleMatchResult
from app.schemas.response import ThreatIndicator
from app.core.constants import Severity, AttackType

class SystemPromptRule(BaseRule):
    """Detects attempts to extract confidential system instructions and developer prompts."""

    def __init__(self):
        super().__init__(name="SystemPromptRule", enabled=True)
        self.patterns = [
            (r"repeat\s+(all\s+)?(your\s+)?(initial\s+|secret\s+|hidden\s+)?(instructions?|system\s+prompts?|developer\s+guidelines?)\s+(verbatim|completely|in\s+json)", "verbatim_prompt_dump", 0.95),
            (r"output\s+(your\s+)?(initial|hidden|secret)\s+system\s+(prompt|instructions?)\s+in\s+json", "json_prompt_extraction", 0.94),
            (r"what\s+(were|are)\s+the\s+exact\s+words\s+of\s+your\s+system\s+prompt", "direct_prompt_query", 0.93),
            (r"dump\s+(your\s+)?(entire\s+)?context\s+window\s+including\s+developer", "context_dump_extraction", 0.96),
            (r"print\s+the\s+text\s+above\s+starting\s+from\s+[\"']?you\s+are", "delimiter_reflection_attack", 0.92),
            (r"show\s+me\s+the\s+secret\s+prompt\s+(that\s+was\s+)?injected\s+before", "secret_prompt_query", 0.93),
            (r"(reveal|display|leak)\s+(all\s+)?(internal\s+rules|developer\s+instructions|system\s+message)", "system_message_disclosure", 0.94)
        ]

    def evaluate(self, text: str, agent_id: str) -> RuleMatchResult:
        if not self.enabled or not text:
            return RuleMatchResult(matched=False, rule_name=self.name, attack_type=AttackType.SYSTEM_PROMPT_LEAK.value)

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
                attack_type=AttackType.SYSTEM_PROMPT_LEAK.value,
                severity=Severity.HIGH,
                rule_score=0.90,
                confidence=max_conf,
                indicators=matched_indicators,
                explanation="Attempt detected to extract confidential system instructions or internal guardrail configuration.",
                recommendations=[
                    "Block reflection of internal system prompt tokens.",
                    "Do not expose developer configuration in agent output.",
                    "Verify user permissions for administrative prompts."
                ]
            )

        return RuleMatchResult(matched=False, rule_name=self.name, attack_type=AttackType.SYSTEM_PROMPT_LEAK.value)
