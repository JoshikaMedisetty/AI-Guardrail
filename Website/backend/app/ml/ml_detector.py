from typing import Optional, List, Dict, Any
from app.detectors.base import BaseDetector, DetectorResult
from app.ml.model_manager import model_manager
from app.schemas.response import ThreatIndicator
from app.core.constants import AttackType

class MLDetector(BaseDetector):
    """
    Trained Machine Learning Prompt Injection Guardrail Detector.
    
    Uses singleton ModelManager to access pre-trained TF-IDF vectorizer
    and Linear SVM classifier without reloading per request or modifying weights.
    """

    def __init__(self):
        super().__init__(name="MLLinearSVMDetector")
        self.model_manager = model_manager

    def _attribute_attack_type(self, text: str) -> str:
        """Categorize malicious pattern based on semantic cues."""
        tl = text.lower()
        if "dan" in tl or "developer mode" in tl or "unrestricted" in tl or "chaosgpt" in tl or "jailbreak" in tl:
            return AttackType.JAILBREAK.value
        elif "system prompt" in tl or "repeat" in tl or "initial prompt" in tl or "verbatim" in tl or "reveal" in tl:
            return AttackType.SYSTEM_PROMPT_LEAK.value
        elif "![exfil]" in tl or "http://" in tl or "webhook" in tl or "exfiltrate" in tl:
            return AttackType.DATA_EXFILTRATION.value
        elif "base64" in tl or "decode" in tl or "rot13" in tl:
            return AttackType.OBFUSCATION.value
        else:
            return AttackType.PROMPT_INJECTION.value

    def detect(self, request_text: str, agent_id: str) -> DetectorResult:
        """
        Execute ML prompt-injection detection on incoming prompt.
        """
        if not self.model_manager.is_loaded:
            return DetectorResult(
                is_threat=False,
                risk_score=0.0,
                confidence=None,
                attack_type=None,
                model_prediction="UNAVAILABLE",
                model_score=None,
                indicators=[],
                explanation="ML Model UNAVAILABLE: Pre-trained artifacts prompt_injection_model.pkl and tfidf_vectorizer.pkl not loaded.",
                recommended_actions=["Deploy prompt_injection_model.pkl and tfidf_vectorizer.pkl in backend/models/."]
            )

        # Execute pure inference through trained vectorizer and Linear SVM
        inference = self.model_manager.predict(request_text)
        is_threat = inference["is_threat"]
        model_pred_str = inference["model_prediction"]
        model_score = inference["model_score"]

        if is_threat:
            attack_type = self._attribute_attack_type(request_text)
            
            # For Linear SVM, decision score is distance to hyperplane (positive = injection, negative = normal)
            # We map positive decision score to an elevated risk score for the risk engine
            base_risk = 0.85
            if model_score is not None and model_score > 0:
                base_risk = min(0.98, 0.80 + 0.05 * min(3.5, model_score))
            
            # Extract key trigger tokens for explainability
            indicators: List[ThreatIndicator] = []
            words = request_text.split()
            for w in words[:6]:
                if len(w) > 3:
                    indicators.append(
                        ThreatIndicator(
                            indicator_type="ml_feature_trigger",
                            matched_text=w,
                            confidence=None
                        )
                    )

            return DetectorResult(
                is_threat=True,
                risk_score=round(base_risk, 4),
                confidence=None,  # Linear SVM uses decision_function, not predict_proba
                attack_type=attack_type,
                model_prediction=model_pred_str,
                model_score=model_score,
                indicators=indicators[:3],
                explanation=f"The request was classified as a prompt injection attempt by the trained Linear SVM detector (score: {model_score}).",
                recommended_actions=[
                    "Do not execute the injected instruction.",
                    "Preserve the original agent instructions.",
                    "Do not expose system prompts or sensitive information.",
                    "Verify the source of the request.",
                    "Review the affected agent action."
                ]
            )

        # Benign / Normal request
        return DetectorResult(
            is_threat=False,
            risk_score=0.05,
            confidence=None,
            attack_type=None,
            model_prediction=model_pred_str,
            model_score=model_score,
            indicators=[],
            explanation="The request was classified as normal by the trained Linear SVM detector.",
            recommended_actions=[]
        )
