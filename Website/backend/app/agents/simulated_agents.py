from typing import Dict, Any
from ai_guardrail_sdk import GuardrailClient

class BaseSimulatedAgent:
    """Base class for all simulated AI agents demonstrating universal integration."""
    
    def __init__(self, agent_id: str, name: str, domain: str):
        self.agent_id = agent_id
        self.name = name
        self.domain = domain
        self.sdk = GuardrailClient()

    def process(self, prompt: str) -> Dict[str, Any]:
        """
        Standard Agent execution pipeline with dual Input/Output guardrail protection.
        """
        # 1. Input Guardrail Inspection
        input_verdict = self.sdk.check(self.agent_id, prompt)
        if input_verdict.get("decision") == "BLOCK":
            return {
                "agent_id": self.agent_id,
                "agent_name": self.name,
                "status": "BLOCKED",
                "message": f"Security Guardrail blocked request: {input_verdict.get('attack_type')}",
                "input_guardrail": input_verdict,
                "agent_response": None,
                "output_guardrail": None
            }

        # 2. Agent Execution (Domain reasoning simulation)
        raw_response = self._generate_response(prompt)

        # 3. Output Guardrail Inspection
        output_verdict = self.sdk.check_output(self.agent_id, raw_response)

        return {
            "agent_id": self.agent_id,
            "agent_name": self.name,
            "status": "SUCCESS",
            "message": "Request processed and verified safely.",
            "input_guardrail": input_verdict,
            "agent_response": output_verdict.get("sanitized_text", raw_response),
            "output_guardrail": output_verdict
        }

    def _generate_response(self, prompt: str) -> str:
        raise NotImplementedError()

class TravelBookingAgent(BaseSimulatedAgent):
    def __init__(self):
        super().__init__("travel-agent", "Travel Booking Agent", "Travel & Hospitality")

    def _generate_response(self, prompt: str) -> str:
        return f"Flight options retrieved: Non-stop flights matching '{prompt[:40]}...' starting at $280. Seat 14A held for reservation."

class ShoppingAgent(BaseSimulatedAgent):
    def __init__(self):
        super().__init__("shopping-agent", "Shopping Agent", "E-Commerce")

    def _generate_response(self, prompt: str) -> str:
        return f"Top 3 product matches found for '{prompt[:40]}...'. Best rated: 4.8/5 stars with free 2-day delivery."

class BankingAgent(BaseSimulatedAgent):
    def __init__(self):
        super().__init__("banking-agent", "Banking Agent", "Financial Services")

    def _generate_response(self, prompt: str) -> str:
        return f"Account balance and transaction inquiry processed for '{prompt[:40]}...'. Authorization verified."

class CodingAgent(BaseSimulatedAgent):
    def __init__(self):
        super().__init__("coding-agent", "Coding Agent", "Software Development")

    def _generate_response(self, prompt: str) -> str:
        return f"```python\n# Solution for query\ndef handle_task():\n    return 'Executed safely for {prompt[:30]}...'\n```"

class ResearchAgent(BaseSimulatedAgent):
    def __init__(self):
        super().__init__("research-agent", "Research Agent", "Academic & Knowledge")

    def _generate_response(self, prompt: str) -> str:
        return f"Academic summary compiled from 5 peer-reviewed sources regarding '{prompt[:40]}...'. Findings synthesized."
