import pytest
from app.detectors.base import BaseDetector, DetectorResult
from app.services.guardrail_service import GuardrailService
from app.schemas.request import GuardrailCheckRequest
from app.core.constants import Decision

def test_base_detector_abc_enforcement():
    """Verify that BaseDetector cannot be instantiated without implementing detect()."""
    with pytest.raises(TypeError):
        BaseDetector()  # Abstract class should raise TypeError

class MockCustomDetector(BaseDetector):
    def detect(self, request_text: str, agent_id: str) -> DetectorResult:
        if "forbidden_token" in request_text:
            return DetectorResult(
                is_threat=True,
                risk_score=0.98,
                confidence=0.99,
                attack_type="Custom Attack",
                indicators=[],
                explanation="Custom detector detected forbidden_token",
                recommended_actions=["Block custom token"]
            )
        return DetectorResult(
            is_threat=False,
            risk_score=0.02,
            confidence=0.99,
            attack_type=None,
            indicators=[],
            explanation="Clean",
            recommended_actions=[]
        )

def test_plugging_custom_detector_into_service():
    """Verify that any BaseDetector subclass can be dynamically registered in GuardrailService."""
    custom_service = GuardrailService(detectors=[MockCustomDetector()])
    
    # Safe request
    resp_safe = custom_service.check_request(
        GuardrailCheckRequest(agent_id="test-agent", request="Hello world")
    )
    assert resp_safe.decision == Decision.ALLOW
    assert resp_safe.risk_score < 0.40

    # Malicious request
    resp_threat = custom_service.check_request(
        GuardrailCheckRequest(agent_id="test-agent", request="This contains forbidden_token payload")
    )
    assert resp_threat.decision == Decision.BLOCK
    assert resp_threat.risk_score >= 0.70
    assert resp_threat.attack_type == "Custom Attack"
