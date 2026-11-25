import pytest
from app.risk.calculator import RiskCalculator
from app.detectors.base import DetectorResult
from app.core.constants import Severity

def test_risk_calculator_empty_results():
    """Empty detector list defaults to baseline safe values."""
    assert RiskCalculator.calculate_aggregate_confidence([]) == 0.95

def test_risk_calculator_ensemble_risk():
    """Aggregator should combine multi-detector risk signals."""
    results = [
        DetectorResult(
            is_threat=False,
            risk_score=0.10,
            confidence=0.90,
            explanation="Rule Detector passed",
            recommended_actions=[]
        ),
        DetectorResult(
            is_threat=True,
            risk_score=0.85,
            confidence=0.96,
            attack_type="Prompt Injection",
            explanation="ML Classifier flagged",
            recommended_actions=[]
        )
    ]
    calc = RiskCalculator()
    aggregate_risk = calc.calculate_ensemble_risk(results, Severity.HIGH)
    assert aggregate_risk >= 0.70

    aggregate_conf = RiskCalculator.calculate_aggregate_confidence(results)
    assert aggregate_conf == round((0.90 + 0.96) / 2, 4)
