import re
from typing import List
from app.detectors.rules.base_rule import BaseRule, RuleMatchResult
from app.schemas.response import ThreatIndicator
from app.core.constants import Severity, AttackType

class DataExfiltrationRule(BaseRule):
    """Detects Markdown image tags, URL callback exfiltration, and sensitive data harvesting."""

    def __init__(self):
        super().__init__(name="DataExfiltrationRule", enabled=True)
        self.patterns = [
            (r"!\[.*?\]\(https?://[^\s\)]+[\?&](data|q|leak|token|keys?|secret)=.*?\)", "markdown_image_exfil_tag", 0.98),
            (r"(exfiltrate|silently\s+transmit|ping\s+webhook|c2-server)\s+.*?(https?://|http://)", "unauthorized_egress_channel", 0.96),
            (r"(send|transmit|exfiltrate|post)\s+.*?(private|sensitive|secret|confidential).*?(to\s+[a-z0-9\.\-_]+\.[a-z]{2,}|attacker\.com|http)", "unauthorized_data_transfer", 0.96),
            (r"(discord\.com/api/webhooks|webhook\.site|webhook\?data=)", "known_exfiltration_sink", 0.97),
            (r"(list|dump|extract)\s+all\s+(database\s+user\s+passwords|social\s+security\s+numbers|aws\s+access\s+key|private\s+rsa\s+keys)", "credential_harvesting_query", 0.95),
            (r"(credit_cards?|auth_users|users_credentials|/etc/passwd|\.env\s+file)\s+and\s+(send|render|append|export)\b", "sensitive_data_export_command", 0.96)
        ]

    def evaluate(self, text: str, agent_id: str) -> RuleMatchResult:
        if not self.enabled or not text:
            return RuleMatchResult(matched=False, rule_name=self.name, attack_type=AttackType.DATA_EXFILTRATION.value)

        text_lower = text.lower()
        matched_indicators: List[ThreatIndicator] = []
        max_conf = 0.0

        for pattern, ind_type, conf in self.patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                matched_indicators.append(
                    ThreatIndicator(
                        indicator_type=ind_type,
                        matched_text=match.group(0)[:80],
                        confidence=conf
                    )
                )
                if conf > max_conf:
                    max_conf = conf

        if matched_indicators:
            return RuleMatchResult(
                matched=True,
                rule_name=self.name,
                attack_type=AttackType.DATA_EXFILTRATION.value,
                severity=Severity.CRITICAL,
                rule_score=0.97,
                confidence=max_conf,
                indicators=matched_indicators,
                explanation="Data exfiltration pattern detected trying to leak sensitive credentials or embed outbound callbacks.",
                recommendations=[
                    "Block generation of external image or webhook callback URLs.",
                    "Sanitize outbound markdown tags in agent response.",
                    "Verify credential access authorizations."
                ]
            )

        return RuleMatchResult(matched=False, rule_name=self.name, attack_type=AttackType.DATA_EXFILTRATION.value)
