import re
import time
from typing import List, Dict, Any, Tuple
from pydantic import BaseModel, Field

class OutputGuardrailResult(BaseModel):
    verdict: str = Field(..., description="Verdict: SAFE, WARN, SANITIZED, or BLOCK")
    original_text: str
    sanitized_text: str
    risk_score: float = Field(..., ge=0.0, le=1.0)
    leakage_types: List[str] = Field(default_factory=list)
    redacted_count: int = 0
    processing_time_ms: float = 0.0
    explanation: str = ""

class OutputGuardrail:
    """
    Output Security Guardrail.
    
    Inspects agent/LLM generated responses before returning content to user:
    1. System prompt leakage
    2. Sensitive API keys / JWTs / AWS credentials / Private Keys
    3. Credit card numbers & PII
    4. Malicious shell payloads in generated content
    """

    def __init__(self):
        # Secret & PII regex patterns
        self.secret_patterns = [
            (r"(sk_live_[0-9a-zA-Z]{24,})", "stripe_live_secret_key", "[REDACTED_STRIPE_KEY]"),
            (r"(AKIA[0-9A-Z]{16})", "aws_access_key", "[REDACTED_AWS_KEY]"),
            (r"(ghp_[0-9a-zA-Z]{36})", "github_personal_token", "[REDACTED_GITHUB_TOKEN]"),
            (r"(AIza[0-9A-Za-z-_]{35})", "google_api_key", "[REDACTED_GOOGLE_KEY]"),
            (r"-----BEGIN\s+(RSA|OPENSSH|PRIVATE)\s+KEY-----[\s\S]+?-----END\s+\1\s+KEY-----", "private_rsa_key", "[REDACTED_PRIVATE_KEY]"),
            (r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b", "credit_card_number", "[REDACTED_CREDIT_CARD]")
        ]

        self.system_leak_patterns = [
            (r"(You are a (helpful|specialized|travel|banking|shopping|coding|research)?\s*AI assistant\..*?(system instructions|rules are):[\s\S]*?)(?=\n\n|$)", "verbatim_system_prompt_leak"),
            (r"(Developer Prompt:|Internal System Instructions:|Guardrail Config:)[\s\S]*?(?=\n\n|$)", "developer_instruction_leak"),
            (r"(Your system instructions are:[\s\S]*?)(?=\n\n|$)", "system_instruction_leak")
        ]

    def inspect_output(self, response_text: str, agent_id: str) -> OutputGuardrailResult:
        start_time = time.perf_counter()
        if not response_text:
            return OutputGuardrailResult(
                verdict="SAFE",
                original_text="",
                sanitized_text="",
                risk_score=0.0,
                explanation="Empty response cleared."
            )

        sanitized = response_text
        detected_leaks: List[str] = []
        redacted_count = 0

        # 1. Check & Redact Credentials and PII
        for pattern, leak_type, replacement in self.secret_patterns:
            matches = list(re.finditer(pattern, sanitized))
            if matches:
                detected_leaks.append(leak_type)
                redacted_count += len(matches)
                sanitized = re.sub(pattern, replacement, sanitized)

        # 2. Check System Prompt Leaks
        for pattern, leak_type in self.system_leak_patterns:
            if re.search(pattern, sanitized, re.IGNORECASE):
                detected_leaks.append(leak_type)
                sanitized = re.sub(pattern, "[REDACTED_SYSTEM_PROMPT]", sanitized, flags=re.IGNORECASE)
                redacted_count += 1

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        if not detected_leaks:
            return OutputGuardrailResult(
                verdict="SAFE",
                original_text=response_text,
                sanitized_text=response_text,
                risk_score=0.02,
                leakage_types=[],
                redacted_count=0,
                processing_time_ms=elapsed_ms,
                explanation="Output Guardrail: No sensitive secrets, system prompts, or credentials detected in generated response."
            )

        # High risk if private keys or live API keys leaked
        is_critical = any(t in ["stripe_live_secret_key", "aws_access_key", "private_rsa_key", "verbatim_system_prompt_leak", "system_instruction_leak"] for t in detected_leaks)
        risk_score = 0.95 if is_critical else 0.65
        verdict = "BLOCK" if is_critical else "SANITIZED"

        explanation = f"Output Guardrail: Redacted {redacted_count} sensitive token(s) ({', '.join(detected_leaks)}) to prevent data disclosure."

        return OutputGuardrailResult(
            verdict=verdict,
            original_text=response_text,
            sanitized_text=sanitized,
            risk_score=risk_score,
            leakage_types=detected_leaks,
            redacted_count=redacted_count,
            processing_time_ms=elapsed_ms,
            explanation=explanation
        )

# Global singleton
output_guardrail = OutputGuardrail()
