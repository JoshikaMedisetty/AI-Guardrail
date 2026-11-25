from typing import List, Dict, Any, Optional
from app.core.constants import Decision, Severity, AttackType
from app.schemas.response import ThreatIndicator

class ExplanationService:
    """
    Security Forensic Explanation Generator.
    
    Generates human-readable, structured root-cause explanations:
    1. What happened?
    2. Why was it detected/blocked?
    3. What action was taken?
    4. Actionable mitigation measures checklist.
    """

    @staticmethod
    def generate_explanation(
        decision: Decision,
        severity: Severity,
        attack_type: Optional[str],
        indicators: List[ThreatIndicator],
        agent_id: str
    ) -> Dict[str, Any]:
        """Generate structured forensic explanation without leaking system secrets."""
        
        if decision == Decision.ALLOW:
            return {
                "what_happened": "Request analyzed and cleared by AI Guardrail.",
                "why_suspicious": "No adversarial instruction override, jailbreak token, or exfiltration pattern detected.",
                "action_taken": "REQUEST ALLOWED (Transparent background execution)",
                "summary": "Request analyzed by Guardrail. No malicious patterns or instruction overrides detected. Request appears safe.",
                "recommendations": []
            }

        # Attack specific narrative
        if attack_type == AttackType.JAILBREAK.value:
            what = "Jailbreak attempt detected trying to enforce unrestricted persona or bypass agent safety controls."
            why = "The request contained behavioral override tokens attempting to force compliance beyond safety policies."
        elif attack_type == AttackType.SYSTEM_PROMPT_LEAK.value:
            what = "System prompt reflection and extraction attack detected."
            why = "The input requested verbatim disclosure of proprietary developer system instructions or hidden guardrail configurations."
        elif attack_type == AttackType.DATA_EXFILTRATION.value:
            what = "Data exfiltration attempt detected trying to leak internal credentials or inject external callback channels."
            why = "Request attempted to embed unauthorized markdown image pixels, webhooks, or credential export pipelines."
        elif attack_type == AttackType.OBFUSCATION.value:
            what = "Obfuscated attack payload detected attempting to hide malicious directives via encoding transformations."
            why = "Decoded base64/hex sequences contained prohibited instructions attempting to evade static filters."
        else:
            what = "An attempt was detected to override or manipulate the agent's baseline instructions."
            why = "The request contained directives attempting to manipulate the agent into performing unauthorized actions."

        action_taken = "REQUEST BLOCKED" if decision == Decision.BLOCK else "REQUEST WARNED & SANITIZED"

        # Actionable mitigation measures
        recommendations = [
            "Do not execute the injected instruction.",
            "Preserve the agent's original instructions.",
            "Do not expose system prompts or sensitive internal state.",
            "Verify the source and authentication of the request.",
            "Review the affected agent actions and session logs."
        ]

        if attack_type == AttackType.DATA_EXFILTRATION.value:
            recommendations.append("Enforce egress filtering on outbound URLs and markdown rendering.")
        elif attack_type == AttackType.JAILBREAK.value:
            recommendations.append("Terminate unsafe session context and enforce immutable base system prompts.")

        summary = f"{what} {why}"

        return {
            "what_happened": what,
            "why_suspicious": why,
            "action_taken": action_taken,
            "summary": summary,
            "recommendations": list(dict.fromkeys(recommendations))
        }
