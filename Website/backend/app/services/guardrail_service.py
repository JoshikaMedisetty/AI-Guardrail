import time
import uuid
import unicodedata
import re
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.detectors.base import BaseDetector, DetectorResult
from app.detectors.rule_detector import RuleBasedDetector
from app.ml.ml_detector import MLDetector
from app.risk.decision_engine import DecisionEngine
from app.risk.calculator import RiskCalculator
from app.services.explanation_service import ExplanationService
from app.schemas.request import GuardrailCheckRequest, WebsiteScanRequest
from app.schemas.response import GuardrailCheckResponse, ThreatIndicator, WebsiteScanResponse
from app.core.constants import Decision, Severity
from app.database.session import SessionLocal
from app.models.log import GuardrailAuditLog, SecurityAlert, Agent, GuardrailSettingsModel, SystemConfigModel, ApiKey
from app.utils.logger import logger

def normalize_text(text: str) -> str:
    """Normalize input text: unicode normalization, whitespace collapsing, strip control chars."""
    if not text:
        return ""
    # Unicode NFKD normalization
    norm = unicodedata.normalize("NFKD", text)
    # Collapse multiple whitespace and tabs
    norm = re.sub(r'[\r\n\t]+', ' ', norm)
    norm = re.sub(r' +', ' ', norm)
    return norm.strip()

class GuardrailService:
    """
    Production AI Guardrail Pipeline Service.
    
    Orchestrates the complete security workflow:
    1. Ingests agent input request / external resource content.
    2. Authenticates agent API key if supplied.
    3. Normalizes input content (Unicode, whitespace, encoding).
    4. Evaluates active dynamic security policy toggles.
    5. Runs Multi-Vector Detection Ensemble:
       - Rule-Based Security Detector (specialized security rules)
       - Real ML Detector (Trained Linear SVM + TF-IDF)
    6. Computes ensemble risk score.
    7. Evaluates DecisionEngine thresholds (ALLOW / WARN / BLOCK).
    8. Generates structured explainability and remediation recommendations.
    9. Persists transaction telemetry, audit trails, and alerts to database.
    """

    def __init__(self, detectors: Optional[List[BaseDetector]] = None):
        self.detectors: List[BaseDetector] = detectors or [
            RuleBasedDetector(),
            MLDetector()
        ]
        self.decision_engine = DecisionEngine()
        self.risk_calculator = RiskCalculator()

    def register_detector(self, detector: BaseDetector) -> None:
        self.detectors.append(detector)

    def _persist_transaction(
        self,
        request_id: str,
        agent_id: str,
        request_text: str,
        decision: Decision,
        risk_score: float,
        confidence: Optional[float],
        attack_type: Optional[str],
        severity: Severity,
        model_prediction: Optional[str],
        model_score: Optional[float],
        indicators: List[ThreatIndicator],
        explanation: str,
        recommendations: List[str],
        latency_ms: float,
        website_url: Optional[str] = None,
        source_domain: Optional[str] = None,
        resource_type: str = "user_input",
        scan_status: str = "CLEAN",
        action_taken: str = "ALLOWED",
        user_id: Optional[str] = None
    ) -> None:
        """Persists audit log, updates agent metrics, and creates alerts."""
        db = SessionLocal()
        try:
            # 1. Audit Log
            log_entry = GuardrailAuditLog(
                id=request_id,
                agent_id=agent_id,
                user_id=user_id,
                website_url=website_url,
                source_domain=source_domain,
                resource_type=resource_type,
                scan_status=scan_status,
                action_taken=action_taken,
                request_text=request_text,
                decision=decision.value,
                risk_score=risk_score,
                confidence=confidence,
                attack_type=attack_type,
                severity=severity.value,
                model_prediction=model_prediction,
                model_score=model_score,
                detected_indicators=[ind.model_dump() for ind in indicators],
                explanation=explanation,
                processing_time_ms=latency_ms
            )
            db.add(log_entry)

            # 2. Update Agent Stats
            agent = db.query(Agent).filter(Agent.id == agent_id).first()
            if agent:
                agent.request_count += 1
                if decision == Decision.BLOCK or action_taken == "BLOCKED":
                    agent.threat_count += 1
                agent.last_activity = datetime.now(timezone.utc)
                agent.avg_latency_ms = round((agent.avg_latency_ms * 0.9) + (latency_ms * 0.1), 2)
            else:
                # Auto-register new agent
                name = agent_id.replace("-", " ").title()
                new_agent = Agent(
                    id=agent_id,
                    name=name,
                    status="Protected",
                    integration_method="API",
                    request_count=1,
                    threat_count=1 if (decision == Decision.BLOCK or action_taken == "BLOCKED") else 0,
                    avg_latency_ms=latency_ms
                )
                db.add(new_agent)

            # 3. Create Security Alert if Blocked or High Risk
            if decision == Decision.BLOCK or action_taken == "BLOCKED" or (decision == Decision.WARN and severity in [Severity.HIGH, Severity.CRITICAL]):
                alert_id = f"ALT-{uuid.uuid4().hex[:6].upper()}"
                agent_name = agent.name if agent else agent_id.replace("-", " ").title()
                alert = SecurityAlert(
                    id=alert_id,
                    request_id=request_id,
                    agent_id=agent_id,
                    agent_name=agent_name,
                    website_url=website_url,
                    attack_type=attack_type or "PROMPT_INJECTION",
                    threat=attack_type or "PROMPT_INJECTION",
                    severity=severity.value,
                    risk_score=risk_score,
                    confidence=confidence,
                    model_name="Linear SVM",
                    model_prediction=model_prediction or "PROMPT_INJECTION",
                    model_score=model_score,
                    status="BLOCKED" if action_taken == "BLOCKED" else "WARNED",
                    action_taken=action_taken,
                    detected_input=request_text[:2000],
                    what_detected=f"Detected {attack_type or 'threat'} targeting {agent_name}{f' via {website_url}' if website_url else ''}.",
                    why_blocked=explanation,
                    indicators=[ind.model_dump() for ind in indicators],
                    recommendations=recommendations
                )
                db.add(alert)

            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning(f"Telemetry persistence notice: {e}")
        finally:
            db.close()

    def check_request(self, payload: GuardrailCheckRequest) -> GuardrailCheckResponse:
        """
        Execute full guardrail inspection on incoming agent request.
        """
        start_time = time.perf_counter()
        request_id = f"gr-{uuid.uuid4().hex[:12]}"
        
        raw_text = payload.get_text_content()
        normalized_content = normalize_text(raw_text)

        # 1. Run all registered detectors in ensemble
        detector_results: List[DetectorResult] = []
        for detector in self.detectors:
            try:
                res = detector.detect(request_text=normalized_content, agent_id=payload.agent_id)
                detector_results.append(res)
            except Exception as e:
                logger.error(f"Detector '{detector.name}' error: {e}")

        # 2. Extract primary threat indicators, attack type, and ML model details
        all_indicators: List[ThreatIndicator] = []
        indicator_labels: List[str] = []
        identified_attack_type: Optional[str] = None
        model_prediction: Optional[str] = None
        model_score: Optional[float] = None
        has_threat = any(r.is_threat for r in detector_results)

        for r in detector_results:
            if r.indicators:
                all_indicators.extend(r.indicators)
                for ind in r.indicators:
                    if ind.indicator_type not in indicator_labels:
                        indicator_labels.append(ind.indicator_type)
            if r.attack_type and not identified_attack_type:
                identified_attack_type = r.attack_type
            if r.model_prediction is not None:
                model_prediction = r.model_prediction
            if r.model_score is not None:
                model_score = r.model_score

        # Determine preliminary severity
        if has_threat:
            if identified_attack_type in ["Jailbreak", "Data Exfiltration"]:
                prelim_sev = Severity.CRITICAL
            else:
                prelim_sev = Severity.HIGH
        else:
            prelim_sev = Severity.LOW

        # 3. Calculate Ensemble Risk Score & Confidence
        aggregate_risk = self.risk_calculator.calculate_ensemble_risk(detector_results, prelim_sev)
        aggregate_confidence = self.risk_calculator.calculate_aggregate_confidence(detector_results)

        # 4. Evaluate Final Decision & Severity
        decision, final_severity = self.decision_engine.evaluate(aggregate_risk)

        # 5. Generate Structured Explanation
        explanation_data = ExplanationService.generate_explanation(
            decision=decision,
            severity=final_severity,
            attack_type=identified_attack_type,
            indicators=all_indicators,
            agent_id=payload.agent_id
        )

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        is_blocked = (decision == Decision.BLOCK)
        is_allowed = not is_blocked

        # 6. Persist Audit Telemetry to DB
        self._persist_transaction(
            request_id=request_id,
            agent_id=payload.agent_id,
            request_text=raw_text,
            decision=decision,
            risk_score=aggregate_risk,
            confidence=aggregate_confidence,
            attack_type=identified_attack_type if decision != Decision.ALLOW else None,
            severity=final_severity,
            model_prediction=model_prediction,
            model_score=model_score,
            indicators=all_indicators,
            explanation=explanation_data["summary"],
            recommendations=explanation_data["recommendations"],
            latency_ms=elapsed_ms,
            website_url=payload.source_url,
            resource_type=payload.content_type or payload.source or "user_input",
            scan_status="THREAT_DETECTED" if is_blocked else "CLEAN",
            action_taken="BLOCKED" if is_blocked else "ALLOWED",
            user_id=payload.user_id
        )

        return GuardrailCheckResponse(
            allowed=is_allowed,
            blocked=is_blocked,
            request_id=request_id,
            agent_id=payload.agent_id,
            decision=decision,
            risk_score=aggregate_risk,
            confidence=aggregate_confidence or 0.95,
            attack_type=identified_attack_type if decision != Decision.ALLOW else None,
            severity=final_severity,
            message="Malicious content detected and blocked" if is_blocked else "Content verified safe",
            model_prediction=model_prediction,
            model_score=model_score,
            detected_indicators=all_indicators,
            indicators=indicator_labels,
            explanation=explanation_data["summary"],
            recommended_actions=explanation_data["recommendations"],
            processing_time_ms=elapsed_ms
        )

    def scan_external_resource(self, payload: WebsiteScanRequest) -> WebsiteScanResponse:
        """
        Inspects external website content, scraped DOM, 3rd-party API responses, or tool outputs.
        Detects indirect prompt injection, hidden instructions, zero-width text, and exfiltration attempts.
        """
        start_time = time.perf_counter()
        request_id = f"scan-{uuid.uuid4().hex[:12]}"

        # Query system config policies
        db = SessionLocal()
        try:
            cfg_rows = db.query(SystemConfigModel).all()
            cfg_dict = {c.key: c.value for c in cfg_rows}
        except Exception:
            cfg_dict = {}
        finally:
            db.close()

        is_dom = payload.resource_type in ["webpage_dom", "webpage", "html"]
        is_api = payload.resource_type in ["api_response", "api"]
        is_tool = payload.resource_type in ["tool_output", "tool"]

        dom_scan_enabled = cfg_dict.get("MODULE_WEBPAGE_SCAN", "true").lower() == "true"
        api_scan_enabled = cfg_dict.get("MODULE_API_SCAN", "true").lower() == "true"
        tool_scan_enabled = cfg_dict.get("MODULE_TOOL_SCAN", "true").lower() == "true"
        action_mode = cfg_dict.get("ACTION_MODE", "BLOCK").upper()

        normalized_content = normalize_text(payload.content)

        # Fast path if specific module is toggled off
        if (is_dom and not dom_scan_enabled) or (is_api and not api_scan_enabled) or (is_tool and not tool_scan_enabled):
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            self._persist_transaction(
                request_id=request_id,
                agent_id=payload.agent_id,
                request_text=payload.content[:1000],
                decision=Decision.ALLOW,
                risk_score=0.0,
                confidence=1.0,
                attack_type=None,
                severity=Severity.LOW,
                model_prediction="BYPASS",
                model_score=None,
                indicators=[],
                explanation=f"Resource scan bypassed (Module policy disabled for {payload.resource_type}).",
                recommendations=[],
                latency_ms=elapsed_ms,
                website_url=payload.url,
                resource_type=payload.resource_type,
                scan_status="CLEAN",
                action_taken="ALLOWED"
            )
            return WebsiteScanResponse(
                allowed=True,
                blocked=False,
                request_id=request_id,
                agent_id=payload.agent_id,
                url=payload.url,
                resource_type=payload.resource_type,
                scan_status="CLEAN",
                decision=Decision.ALLOW,
                risk_score=0.0,
                confidence=1.0,
                attack_type=None,
                severity=Severity.LOW,
                explanation="Scanned resource allowed (Inspection bypassed per policy).",
                sanitized_content=payload.content,
                processing_time_ms=elapsed_ms
            )

        # 1. Run all registered detectors
        detector_results: List[DetectorResult] = []
        for detector in self.detectors:
            try:
                res = detector.detect(request_text=normalized_content, agent_id=payload.agent_id)
                detector_results.append(res)
            except Exception as e:
                logger.error(f"Detector '{detector.name}' error on website scan: {e}")

        # 2. Check for specialized DOM/HTML indirect injection patterns
        dom_indicators: List[ThreatIndicator] = []
        html_comments = re.findall(r'<!--(.*?)-->', payload.content, re.DOTALL)
        for comment in html_comments:
            c_low = comment.lower()
            if any(k in c_low for k in ["ignore previous", "new instruction", "exfiltrate", "system prompt", "send to", "leak", "bypass", "assistant:"]):
                dom_indicators.append(ThreatIndicator(
                    indicator_type="hidden_comment_instruction",
                    matched_text=comment.strip()[:120],
                    confidence=0.95
                ))

        hidden_tags = re.findall(r'<[a-z0-9]+[^>]*(?:display:\s*none|visibility:\s*hidden|font-size:\s*0|opacity:\s*0)[^>]*>(.*?)</[a-z0-9]+>', payload.content, re.IGNORECASE | re.DOTALL)
        for hidden in hidden_tags:
            h_low = hidden.lower()
            if any(k in h_low for k in ["ignore", "password", "token", "key", "secret", "override", "instruction"]):
                dom_indicators.append(ThreatIndicator(
                    indicator_type="invisible_text_injection",
                    matched_text=hidden.strip()[:120],
                    confidence=0.92
                ))

        exfil_matches = re.findall(r'!\[.*?\]\((https?://[^)]*(?:leak|exfil|token|key|pwd|cred|steal)[^)]*)\)', payload.content, re.IGNORECASE)
        for exfil in exfil_matches:
            dom_indicators.append(ThreatIndicator(
                indicator_type="data_exfiltration_channel",
                matched_text=exfil[:120],
                confidence=0.96
            ))

        all_indicators: List[ThreatIndicator] = []
        for r in detector_results:
            if r.indicators:
                all_indicators.extend(r.indicators)
        all_indicators.extend(dom_indicators)

        identified_attack_type: Optional[str] = None
        for r in detector_results:
            if r.attack_type and not identified_attack_type:
                identified_attack_type = r.attack_type

        if dom_indicators and not identified_attack_type:
            identified_attack_type = "Indirect Prompt Injection"

        has_threat = any(r.is_threat for r in detector_results) or bool(dom_indicators)

        if has_threat:
            if identified_attack_type in ["Jailbreak", "Data Exfiltration"] or "exfiltration" in str(identified_attack_type).lower():
                prelim_sev = Severity.CRITICAL
            else:
                prelim_sev = Severity.HIGH
        else:
            prelim_sev = Severity.LOW

        # 3. Calculate ensemble risk & confidence
        aggregate_risk = self.risk_calculator.calculate_ensemble_risk(detector_results, prelim_sev)
        if dom_indicators:
            aggregate_risk = max(aggregate_risk, 0.88)
        aggregate_confidence = self.risk_calculator.calculate_aggregate_confidence(detector_results)

        # 4. Evaluate Decision
        decision, final_severity = self.decision_engine.evaluate(aggregate_risk)

        # Apply Action Mode (WARN vs BLOCK)
        action_taken = "ALLOWED"
        if decision == Decision.BLOCK:
            if action_mode == "WARN":
                decision = Decision.WARN
                action_taken = "WARNED"
            else:
                action_taken = "BLOCKED"
        elif decision == Decision.WARN:
            action_taken = "WARNED"

        scan_status = "THREAT_DETECTED" if has_threat or decision in [Decision.BLOCK, Decision.WARN] else "CLEAN"

        # 5. Explanations & recommendations
        explanation_data = ExplanationService.generate_explanation(
            decision=decision,
            severity=final_severity,
            attack_type=identified_attack_type,
            indicators=all_indicators,
            agent_id=payload.agent_id
        )

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # 6. Sanitized content output
        if decision == Decision.BLOCK:
            sanitized = f"[SECURITY GUARDRAIL INTERCEPT: Content from {payload.url} blocked due to {identified_attack_type or 'malicious payload'} violation]"
        else:
            sanitized = payload.content

        is_blocked = (action_taken == "BLOCKED")
        is_allowed = not is_blocked

        # 7. Extract domain
        domain = "direct-resource"
        if payload.url:
            import urllib.parse
            try:
                domain = urllib.parse.urlparse(payload.url).netloc or payload.url.split("/")[0]
            except Exception:
                domain = payload.url

        self._persist_transaction(
            request_id=request_id,
            agent_id=payload.agent_id,
            request_text=payload.content[:2000],
            decision=decision,
            risk_score=aggregate_risk,
            confidence=aggregate_confidence,
            attack_type=identified_attack_type if decision != Decision.ALLOW else None,
            severity=final_severity,
            model_prediction="PROMPT_INJECTION" if has_threat else "NORMAL",
            model_score=None,
            indicators=all_indicators,
            explanation=f"Resource Scan [{payload.url}]: {explanation_data['summary']}",
            recommendations=explanation_data["recommendations"],
            latency_ms=elapsed_ms,
            website_url=payload.url,
            source_domain=domain,
            resource_type=payload.resource_type,
            scan_status=scan_status,
            action_taken=action_taken
        )

        return WebsiteScanResponse(
            allowed=is_allowed,
            blocked=is_blocked,
            request_id=request_id,
            agent_id=payload.agent_id,
            url=payload.url,
            resource_type=payload.resource_type,
            scan_status=scan_status,
            decision=decision,
            risk_score=aggregate_risk,
            confidence=aggregate_confidence,
            attack_type=identified_attack_type if decision != Decision.ALLOW else None,
            severity=final_severity,
            explanation=explanation_data["summary"],
            sanitized_content=sanitized,
            processing_time_ms=elapsed_ms
        )

# Global singleton service instance
guardrail_service = GuardrailService()
