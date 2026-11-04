from typing import List, Dict, Any, Optional
from app.detectors.base import DetectorResult
from app.core.constants import Severity

class RiskCalculator:
    """
    Centralized Multi-Detector Ensemble Risk Engine.
    
    Combines signals from:
    1. ML Detector (Linear SVM prediction & decision score)
    2. Rule Engine Match Score
    3. Threat Severity Weight
    4. Indicator density boost
    """

    def __init__(self, w_ml: float = 0.55, w_rule: float = 0.30, w_sev: float = 0.15):
        self.w_ml = w_ml
        self.w_rule = w_rule
        self.w_sev = w_sev

    def calculate_ensemble_risk(self, results: List[DetectorResult], severity: Severity) -> float:
        if not results:
            return 0.05

        ml_score = 0.0
        rule_score = 0.0
        has_rule_match = False
        has_ml_match = False
        total_indicators = 0

        for r in results:
            total_indicators += len(r.indicators)
            if r.model_prediction is not None or "ML" in getattr(r, "name", "") or "Linear SVM" in r.explanation:
                ml_score = r.risk_score
                if r.is_threat:
                    has_ml_match = True
            else:
                if r.risk_score > rule_score:
                    rule_score = r.risk_score
                if r.is_threat:
                    has_rule_match = True

        # Severity weight mapping
        sev_weights = {
            Severity.LOW: 0.05,
            Severity.MEDIUM: 0.50,
            Severity.HIGH: 0.85,
            Severity.CRITICAL: 1.00
        }
        sev_score = sev_weights.get(severity, 0.05)

        # Indicator density boost (up to +0.10 for multiple corroborated triggers)
        indicator_boost = min(0.10, total_indicators * 0.03) if (has_rule_match or has_ml_match) else 0.0

        # Weighted risk calculation
        if has_rule_match and has_ml_match:
            # Multi-detector corroboration -> highest confidence block
            combined = (self.w_ml * ml_score) + (self.w_rule * rule_score) + (self.w_sev * sev_score) + indicator_boost
            return round(min(1.00, max(0.85, combined)), 4)
        elif has_ml_match:
            # ML flagged prompt injection
            combined = (0.75 * ml_score) + (0.10 * rule_score) + (0.15 * sev_score)
            return round(min(1.00, max(0.75, combined)), 4)
        elif has_rule_match:
            # Deterministic rule trigger
            combined = (0.80 * rule_score) + (0.20 * sev_score)
            return round(min(1.00, max(0.75, combined)), 4)
        else:
            # Clean safe request (both ML and rules agree safe)
            return round(min(0.20, max(0.02, ml_score * 0.5)), 4)

    @staticmethod
    def calculate_aggregate_confidence(results: List[DetectorResult]) -> Optional[float]:
        """Compute average confidence if calibrated probabilities exist, else 0.95 for empty or None."""
        if not results:
            return 0.95
        valid_confs = [r.confidence for r in results if r.confidence is not None]
        if not valid_confs:
            return None
        return round(sum(valid_confs) / len(valid_confs), 4)

    @staticmethod
    def calculate_aggregate_risk(results: List[DetectorResult]) -> float:
        calc = RiskCalculator()
        return calc.calculate_ensemble_risk(results, Severity.LOW)
