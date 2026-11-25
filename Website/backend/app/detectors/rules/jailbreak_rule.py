import re
from typing import List
from app.detectors.rules.base_rule import BaseRule, RuleMatchResult
from app.schemas.response import ThreatIndicator
from app.core.constants import Severity, AttackType

class JailbreakRule(BaseRule):
    """Detects persona modifications, DAN mode, and unrestricted compliance prompts."""

    def __init__(self):
        super().__init__(name="JailbreakRule", enabled=True)
        self.patterns = [
            (r"\bDAN\s*(mode|\d+\.\d+)?\b|\bdo\s+anything\s+now\b", "dan_jailbreak_token", 0.98),
            (r"developer\s+mode\s+(enabled|activated|on)\b", "developer_mode_simulation", 0.96),
            (r"act\s+as\s+(an?\s+)?(unrestricted|jailbroken|evil|unfiltered|black-hat|chaosgpt)\b", "unrestricted_persona_shift", 0.95),
            (r"(broken\s+free\s+of|without\s+applying\s+any)\s+(safety|ethics|filters|limitations)", "safety_bypass_assertion", 0.94),
            (r"in\s+this\s+(simulation|alternate\s+reality|movie\s+script)[,\s]+(ethics|rules|laws)\s+do\s+not\s+exist", "hypothetical_frame_bypass", 0.92),
            (r"(aim|stan|evilbot|godmode)\s+(mode\s+)?(activated|persona)", "known_jailbreak_persona", 0.96),
            (r"answer\s+all\s+(questions|inquiries)\s+without\s+(restrictions?|censorship|filters?)", "unrestricted_compliance_demand", 0.94)
        ]

    def evaluate(self, text: str, agent_id: str) -> RuleMatchResult:
        if not self.enabled or not text:
            return RuleMatchResult(matched=False, rule_name=self.name, attack_type=AttackType.JAILBREAK.value)

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
                attack_type=AttackType.JAILBREAK.value,
                severity=Severity.CRITICAL,
                rule_score=0.96,
                confidence=max_conf,
                indicators=matched_indicators,
                explanation="Jailbreak attempt detected trying to enforce unrestricted persona or bypass agent safety controls.",
                recommendations=[
                    "Block persona alteration commands.",
                    "Enforce immutable base system boundary policies.",
                    "Terminate unsafe conversation session context.",
                    "Log security incident for telemetry review."
                ]
            )

        return RuleMatchResult(matched=False, rule_name=self.name, attack_type=AttackType.JAILBREAK.value)
