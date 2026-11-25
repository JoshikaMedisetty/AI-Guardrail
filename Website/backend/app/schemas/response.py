from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict, Union
from datetime import datetime, timezone
from app.core.constants import Decision, Severity

class ThreatIndicator(BaseModel):
    indicator_type: str = Field(..., description="Category of threat indicator (e.g. override_instruction, leak_attempt)")
    matched_text: Optional[str] = Field(None, description="Extracted suspicious text span or pattern")
    confidence: Optional[float] = Field(default=None, description="Detection confidence for this indicator")

class GuardrailCheckResponse(BaseModel):
    allowed: bool = Field(..., description="True if content is safe and allowed, False if blocked")
    blocked: bool = Field(..., description="True if content was identified as a threat and blocked")
    decision: Decision = Field(..., description="Security decision: ALLOW, WARN, or BLOCK")
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Calculated aggregate risk score from 0.00 to 1.00")
    confidence: Optional[float] = Field(None, description="Confidence of the detection verdict")
    severity: Severity = Field(..., description="Severity level: LOW, MEDIUM, HIGH, CRITICAL")
    attack_type: Optional[str] = Field(None, description="Identified attack category or null for safe requests")
    message: Optional[str] = Field(None, description="Human readable status message")
    request_id: str = Field(..., description="Unique UUID tracking this inspection transaction")
    agent_id: str = Field(..., description="Target Agent identifier")
    model_prediction: Optional[str] = Field(None, description="Raw ML model classification: NORMAL or PROMPT_INJECTION")
    model_score: Optional[float] = Field(None, description="Raw decision boundary distance / score from Linear SVM")
    detected_indicators: List[ThreatIndicator] = Field(default_factory=list, description="List of detected attack vectors/indicators")
    indicators: List[str] = Field(default_factory=list, description="List of indicator labels")
    explanation: str = Field(..., description="Detailed rationale explaining the security decision")
    recommended_actions: List[str] = Field(default_factory=list, description="Recommended remediation measures")
    processing_time_ms: float = Field(..., description="Total guardrail processing latency in milliseconds")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC timestamp of inspection")

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    service: str = "Universal AI Guardrail"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SystemMetaResponse(BaseModel):
    status: str = "ACTIVE"
    monitored_requests: int
    threats_detected: int
    requests_blocked: int
    warnings_issued: int
    accuracy_rate: float
    avg_latency_ms: float
    thresholds: dict

class ModelStatusResponse(BaseModel):
    prompt_injection_model: str = Field(..., description="Model status: READY or UNAVAILABLE")
    model_type: Optional[str] = Field(None, description="Loaded model class name, e.g. LinearSVC")
    vectorizer: str = Field(..., description="Vectorizer status: READY or UNAVAILABLE")
    classes: List[Union[int, str]] = Field(default_factory=list, description="Target class labels discovered from model")
    prediction_method: str = Field(default="predict", description="Inference method used")
    decision_score: str = Field(default="unavailable", description="Whether decision_function is available")
    probability: str = Field(default="unavailable", description="Whether predict_proba is available")
    detail: Optional[str] = Field(None, description="Operational detail or load notice")

class WebsiteScanResponse(BaseModel):
    allowed: bool = Field(default=True, description="True if content is allowed")
    blocked: bool = Field(default=False, description="True if content is blocked")
    request_id: str
    agent_id: str
    url: str
    resource_type: str
    scan_status: str
    decision: Decision
    risk_score: float
    confidence: Optional[float] = None
    attack_type: Optional[str] = None
    severity: Severity
    explanation: str
    sanitized_content: Optional[str] = None
    processing_time_ms: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
