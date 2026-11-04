import re
from typing import List
from app.detectors.base import BaseDetector, DetectorResult
from app.schemas.response import ThreatIndicator
from app.core.constants import AttackType

class PlaceholderDetector(BaseDetector):
    """
    Phase 1 Foundation Detector.
    
    Provides basic deterministic evaluation and structure verification.
    This modular implementation acts as the drop-in placeholder for:
    - Phase 3: Rule-based heuristic detector
    - Phase 4: ML-based Transformer embedding classifier
    """

    def __init__(self):
        super().__init__(name="PlaceholderDetector_Phase1")
        
        # Sample detection patterns for demonstration and test validation in Phase 1
        self._prompt_injection_patterns = [
            r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?",
            r"disregard\s+(all\s+)?(previous|prior)\s+rules?",
            r"override\s+(system|agent)\s+prompt",
            r"system\s*:\s*you\s+are\s+now",
            r"reveal\s+(your\s+)?(secret\s+)?system\s+(prompt|instructions?)",
        ]
        
        self._jailbreak_patterns = [
            r"\bDAN\b",
            r"do\s+anything\s+now",
            r"developer\s+mode\s+enabled",
            r"always\s+comply\s+without\s+restrictions",
        ]

    def detect(self, request_text: str, agent_id: str) -> DetectorResult:
        """
        Analyze prompt text against placeholder baseline rules.
        """
        text_lower = request_text.lower()
        indicators: List[ThreatIndicator] = []
        
        # Check Prompt Injection indicators
        for pattern in self._prompt_injection_patterns:
            match = re.search(pattern, text_lower)
            if match:
                indicators.append(
                    ThreatIndicator(
                        indicator_type="prompt_injection_override",
                        matched_text=match.group(0),
                        confidence=0.96
                    )
                )

        if indicators:
            return DetectorResult(
                is_threat=True,
                risk_score=0.94,
                confidence=0.96,
                attack_type=AttackType.PROMPT_INJECTION.value,
                indicators=indicators,
                explanation="An attempt was detected to override or manipulate the agent's original instructions.",
                recommended_actions=[
                    "Do not execute the injected instruction.",
                    "Preserve the agent's original instructions.",
                    "Do not expose system prompts or sensitive internal state.",
                    "Verify the source of the request.",
                    "Review the affected agent actions."
                ]
            )

        # Check Jailbreak indicators
        for pattern in self._jailbreak_patterns:
            match = re.search(pattern, text_lower)
            if match:
                indicators.append(
                    ThreatIndicator(
                        indicator_type="jailbreak_persona_shift",
                        matched_text=match.group(0),
                        confidence=0.92
                    )
                )

        if indicators:
            return DetectorResult(
                is_threat=True,
                risk_score=0.88,
                confidence=0.92,
                attack_type=AttackType.JAILBREAK.value,
                indicators=indicators,
                explanation="Jailbreak attempt detected trying to bypass agent behavioral safety guardrails.",
                recommended_actions=[
                    "Block persona alteration commands.",
                    "Enforce immutable base safety policies.",
                    "Terminate unsafe conversation context.",
                    "Log security incident for telemetry review."
                ]
            )

        # Default Safe Request (Phase 1 Baseline)
        return DetectorResult(
            is_threat=False,
            risk_score=0.05,
            confidence=0.95,
            attack_type=None,
            indicators=[],
            explanation="Request analyzed by Guardrail. No malicious patterns or instruction overrides detected. Request appears safe.",
            recommended_actions=[]
        )
