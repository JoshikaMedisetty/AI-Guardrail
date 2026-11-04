import pytest
from app.risk.decision_engine import DecisionEngine
from app.core.constants import Decision, Severity

def test_decision_engine_low_risk_allow():
    """Scores below low_threshold (0.40) must map to ALLOW and LOW severity."""
    engine = DecisionEngine(low_threshold=0.40, high_threshold=0.70)
    decision, severity = engine.evaluate(0.15)
    assert decision == Decision.ALLOW
    assert severity == Severity.LOW

def test_decision_engine_medium_risk_warn():
    """Scores between 0.40 and 0.70 must map to WARN and MEDIUM severity."""
    engine = DecisionEngine(low_threshold=0.40, high_threshold=0.70)
    decision, severity = engine.evaluate(0.55)
    assert decision == Decision.WARN
    assert severity == Severity.MEDIUM

def test_decision_engine_high_risk_block():
    """Scores between 0.70 and 0.89 must map to BLOCK and HIGH severity."""
    engine = DecisionEngine(low_threshold=0.40, high_threshold=0.70)
    decision, severity = engine.evaluate(0.75)
    assert decision == Decision.BLOCK
    assert severity == Severity.HIGH

def test_decision_engine_critical_risk_block():
    """Scores >= 0.90 must map to BLOCK and CRITICAL severity."""
    engine = DecisionEngine(low_threshold=0.40, high_threshold=0.70)
    decision, severity = engine.evaluate(0.95)
    assert decision == Decision.BLOCK
    assert severity == Severity.CRITICAL

def test_decision_engine_custom_thresholds():
    """Verify custom strict security thresholds work as expected."""
    strict_engine = DecisionEngine(low_threshold=0.20, high_threshold=0.50)
    decision, severity = strict_engine.evaluate(0.35)
    assert decision == Decision.WARN
    assert severity == Severity.MEDIUM
