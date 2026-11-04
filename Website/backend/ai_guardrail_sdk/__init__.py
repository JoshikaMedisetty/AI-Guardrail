import time
from typing import Dict, Any, Optional, Callable

class GuardrailClient:
    """
    Universal AI Guardrail Python SDK.
    
    Provides standard middleware wrapper for connecting any LLM agent to the Guardrail.
    """

    def __init__(self, endpoint_url: str = "http://127.0.0.1:8000/api/v1"):
        self.endpoint_url = endpoint_url.rstrip("/")

    def check(self, agent_id: str, request: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Inspect incoming user request prior to agent inference.
        """
        try:
            import httpx
            resp = httpx.post(
                f"{self.endpoint_url}/guardrail/check",
                json={"agent_id": agent_id, "request": request, "metadata": metadata or {}},
                timeout=5.0
            )
            return resp.json()
        except Exception:
            # Local in-process fallback
            from app.services.guardrail_service import guardrail_service
            from app.schemas.request import GuardrailCheckRequest
            res = guardrail_service.check_request(GuardrailCheckRequest(agent_id=agent_id, request=request))
            return res.model_dump()

    def check_output(self, agent_id: str, response_text: str) -> Dict[str, Any]:
        """
        Inspect generated agent output before returning to user.
        """
        try:
            import httpx
            resp = httpx.post(
                f"{self.endpoint_url}/guardrail/check-output",
                json={"agent_id": agent_id, "response_text": response_text},
                timeout=5.0
            )
            return resp.json()
        except Exception:
            from app.services.output_guardrail import output_guardrail
            res = output_guardrail.inspect_output(response_text, agent_id)
            return res.model_dump()

    def scan_website(
        self,
        agent_id: str,
        url: str,
        content: str,
        resource_type: str = "webpage_dom",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Inspect external website content, scraped DOM, or 3rd-party API responses before passing to LLM.
        Detects indirect prompt injection, hidden instructions, zero-width text, and exfiltration attempts.
        """
        try:
            import httpx
            resp = httpx.post(
                f"{self.endpoint_url}/guardrail/scan-website",
                json={
                    "agent_id": agent_id,
                    "url": url,
                    "content": content,
                    "resource_type": resource_type,
                    "metadata": metadata or {}
                },
                timeout=5.0
            )
            return resp.json()
        except Exception:
            from app.services.guardrail_service import guardrail_service
            from app.schemas.request import WebsiteScanRequest
            res = guardrail_service.scan_external_resource(
                WebsiteScanRequest(agent_id=agent_id, url=url, content=content, resource_type=resource_type, metadata=metadata)
            )
            return res.model_dump()

    def protect_tool(self, agent_id: str, tool_name: str, tool_fn: Optional[Callable] = None):
        """
        Decorator / wrapper for agent tools (scrapers, API fetchers, search tools).
        Scans output before delivering to LLM context.
        """
        def decorator(fn):
            def wrapped(*args, **kwargs):
                raw_result = fn(*args, **kwargs)
                url_str = kwargs.get("url") or (args[0] if args and isinstance(args[0], str) and (args[0].startswith("http") or "." in args[0]) else f"tool://{tool_name}")
                scan = self.scan_website(
                    agent_id=agent_id,
                    url=str(url_str),
                    content=str(raw_result),
                    resource_type="tool_output"
                )
                if scan.get("decision") == "BLOCK":
                    return f"[GUARDRAIL BLOCKED: {tool_name} returned malicious payload - {scan.get('attack_type', 'Security Violation')}]"
                return scan.get("sanitized_content", raw_result)
            return wrapped

        if tool_fn is not None:
            return decorator(tool_fn)
        return decorator

    def protect_agent(self, agent_id: str, agent_fn: Optional[Callable] = None):
        """
        Decorator / wrapper that wraps an agent function with dual Input & Output guardrails.
        Supports both @sdk.protect_agent("agent-id") and sdk.protect_agent("agent-id", fn).
        """
        def decorator(fn):
            def wrapped(user_prompt: str, *args, **kwargs):
                # 1. Input Guardrail
                in_check = self.check(agent_id, user_prompt)
                if in_check.get("decision") == "BLOCK":
                    return {
                        "status": "BLOCKED",
                        "error": f"Security Threat Blocked: {in_check.get('attack_type')}",
                        "details": in_check
                    }
                
                # 2. Execute Agent
                raw_output = fn(user_prompt, *args, **kwargs)

                # 3. Output Guardrail
                out_check = self.check_output(agent_id, str(raw_output))
                return {
                    "status": "SUCCESS",
                    "response": out_check.get("sanitized_text", raw_output),
                    "guardrail": {
                        "input": in_check,
                        "output": out_check
                    }
                }
            return wrapped

        if agent_fn is not None:
            return decorator(agent_fn)
        return decorator

