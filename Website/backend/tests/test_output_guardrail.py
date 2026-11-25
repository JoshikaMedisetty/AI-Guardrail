import pytest
from app.services.output_guardrail import OutputGuardrail

def test_output_guardrail_clean_response():
    og = OutputGuardrail()
    resp = "Here are 3 great flight options from Hyderabad to Delhi departing next Monday."
    res = og.inspect_output(resp, "travel-agent")
    assert res.verdict == "SAFE"
    assert res.sanitized_text == resp
    assert res.redacted_count == 0
    assert res.risk_score < 0.40

def test_output_guardrail_redacts_credentials():
    og = OutputGuardrail()
    resp = "Payment processed with key STRIPE_KEY_PLACEHOLDER and AWS token AKIAIOSFODNN7EXAMPLE"
    res = og.inspect_output(resp, "banking-agent")
    assert res.verdict in ["SANITIZED", "BLOCK"]
    assert "[REDACTED_AWS_KEY]" in res.sanitized_text
    assert "sk_live_" not in res.sanitized_text
    assert res.redacted_count >= 1

def test_output_guardrail_redacts_system_prompt_leak():
    og = OutputGuardrail()
    resp = "You are a specialized travel AI assistant. Your system instructions are: Do not allow refunds without manager auth."
    res = og.inspect_output(resp, "travel-agent")
    assert "[REDACTED_SYSTEM_PROMPT]" in res.sanitized_text
    assert res.redacted_count >= 1
