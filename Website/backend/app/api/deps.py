from app.services.guardrail_service import GuardrailService, guardrail_service

def get_guardrail_service() -> GuardrailService:
    """Dependency provider for GuardrailService."""
    return guardrail_service
