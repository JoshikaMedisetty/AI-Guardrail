from typing import List, Optional
from app.detectors.base import BaseDetector, DetectorResult
from app.detectors.rules.base_rule import BaseRule
from app.detectors.rules.prompt_injection_rule import PromptInjectionRule
from app.detectors.rules.jailbreak_rule import JailbreakRule
from app.detectors.rules.system_prompt_rule import SystemPromptRule
from app.detectors.rules.data_exfiltration_rule import DataExfiltrationRule
from app.detectors.rules.obfuscation_rule import ObfuscationRule
from app.detectors.rules.indirect_injection_rule import IndirectInjectionRule
from app.schemas.response import ThreatIndicator

class RuleBasedDetector(BaseDetector):
    """
    Security Rule Engine Detector.
    
    Evaluates modular security rules across prompt injection, jailbreaks,
    system prompt leakage, data exfiltration, obfuscation, and indirect injection.
    """

    def __init__(self, custom_rules: Optional[List[BaseRule]] = None):
        super().__init__(name="RuleBasedSecurityDetector")
        self.rules: List[BaseRule] = custom_rules or [
            PromptInjectionRule(),
            JailbreakRule(),
            SystemPromptRule(),
            DataExfiltrationRule(),
            ObfuscationRule(),
            IndirectInjectionRule()
        ]

    def add_rule(self, rule: BaseRule) -> None:
        self.rules.append(rule)

    def detect(self, request_text: str, agent_id: str) -> DetectorResult:
        all_indicators: List[ThreatIndicator] = []
        highest_score = 0.0
        highest_conf = 0.0
        primary_attack_type: Optional[str] = None
        primary_explanation: Optional[str] = None
        all_recommendations: List[str] = []

        for rule in self.rules:
            result = rule.evaluate(request_text, agent_id)
            if result.matched:
                all_indicators.extend(result.indicators)
                if result.rule_score > highest_score:
                    highest_score = result.rule_score
                    primary_attack_type = result.attack_type
                    primary_explanation = result.explanation
                if result.confidence > highest_conf:
                    highest_conf = result.confidence
                all_recommendations.extend(result.recommendations)

        if all_indicators:
            return DetectorResult(
                is_threat=True,
                risk_score=highest_score,
                confidence=highest_conf,
                attack_type=primary_attack_type,
                indicators=all_indicators,
                explanation=primary_explanation or "Security rule violation detected in input prompt.",
                recommended_actions=list(dict.fromkeys(all_recommendations))
            )

        # Baseline safe when no security rules trigger
        return DetectorResult(
            is_threat=False,
            risk_score=0.03,
            confidence=0.96,
            attack_type=None,
            indicators=[],
            explanation="Rule Engine: No known attack signatures or instruction overrides detected.",
            recommended_actions=[]
        )
