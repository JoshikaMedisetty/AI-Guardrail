from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.response import ThreatIndicator

class DetectorResult(BaseModel):
    """Standardized detection result returned by all guardrail detector modules."""
    is_threat: bool = Field(..., description="Whether this detector flagged the request as suspicious/threatening")
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Risk score contributed by this detector (0.0 to 1.0)")
    confidence: Optional[float] = Field(default=None, description="Confidence level of this detector's assessment (null if using raw decision score)")
    attack_type: Optional[str] = Field(None, description="Classified attack category if threat detected")
    model_prediction: Optional[str] = Field(None, description="Model classification string: NORMAL or PROMPT_INJECTION")
    model_score: Optional[float] = Field(None, description="Raw decision score or boundary distance")
    indicators: List[ThreatIndicator] = Field(default_factory=list, description="Extracted threat indicators and tokens")
    explanation: str = Field(..., description="Explanation of why this detection verdict was reached")
    recommended_actions: List[str] = Field(default_factory=list, description="Actionable mitigation recommendations")

class BaseDetector(ABC):
    """
    Abstract Base Class for all AI Guardrail Detectors.
    
    All detector implementations (RuleBasedDetector, MLDetector, etc.)
    must implement this interface.
    """
    
    def __init__(self, name: str = "BaseDetector"):
        self.name = name

    @abstractmethod
    def detect(self, request_text: str, agent_id: str) -> DetectorResult:
        """
        Analyze the incoming agent request and return a standardized DetectorResult.
        """
        pass
