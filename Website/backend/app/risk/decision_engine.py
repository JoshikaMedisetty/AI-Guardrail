from typing import Tuple
from app.core.config import settings
from app.core.constants import Decision, Severity

class DecisionEngine:
    """
    Security Decision Engine.
    
    Evaluates calculated aggregate risk scores against configurable thresholds:
    - LOW (0.00 - 0.40): ALLOW (Transparent background execution)
    - MEDIUM (0.40 - 0.70): WARN (Sanitization / Additional verification)
    - HIGH (0.70 - 1.00): BLOCK (Immediate interception & alert trigger)
    """

    def __init__(
        self,
        low_threshold: float = settings.RISK_THRESHOLD_LOW,
        high_threshold: float = settings.RISK_THRESHOLD_HIGH
    ):
        self.low_threshold = low_threshold
        self.high_threshold = high_threshold

    def evaluate(self, risk_score: float) -> Tuple[Decision, Severity]:
        """
        Map a normalized risk score (0.0 to 1.0) to a Decision and Severity level.
        
        Args:
            risk_score: Float between 0.00 and 1.00
            
        Returns:
            Tuple of (Decision, Severity)
        """
        # Clamp risk score to [0.0, 1.0]
        clamped_score = max(0.0, min(1.0, risk_score))

        if clamped_score < self.low_threshold:
            return Decision.ALLOW, Severity.LOW
        elif clamped_score < self.high_threshold:
            return Decision.WARN, Severity.MEDIUM
        elif clamped_score < 0.90:
            return Decision.BLOCK, Severity.HIGH
        else:
            return Decision.BLOCK, Severity.CRITICAL
