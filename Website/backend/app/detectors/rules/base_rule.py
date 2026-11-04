from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.response import ThreatIndicator
from app.core.constants import Severity, AttackType

class RuleMatchResult(BaseModel):
    """Result returned by an individual security rule."""
    matched: bool = Field(False, description="Whether this security rule was triggered")
    rule_name: str = Field(..., description="Name of the triggering security rule")
    attack_type: str = Field(..., description="Classified attack category")
    severity: Severity = Field(Severity.LOW, description="Severity of the detected threat")
    rule_score: float = Field(0.0, ge=0.0, le=1.0, description="Risk weight contributed by this rule (0.0 to 1.0)")
    confidence: float = Field(0.9, ge=0.0, le=1.0, description="Confidence of this rule match")
    indicators: List[ThreatIndicator] = Field(default_factory=list, description="Extracted threat indicators and tokens")
    explanation: str = Field("", description="Detailed explanation of the rule violation")
    recommendations: List[str] = Field(default_factory=list, description="Remediation steps for this violation")

class BaseRule(ABC):
    """
    Abstract Base Class for all modular guardrail security rules.
    """
    def __init__(self, name: str, enabled: bool = True):
        self.name = name
        self.enabled = enabled

    @abstractmethod
    def evaluate(self, text: str, agent_id: str) -> RuleMatchResult:
        """
        Evaluate normalized text against this rule's heuristics and patterns.
        """
        pass
