from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class GuardrailCheckRequest(BaseModel):
    agent_id: str = Field(
        ..., 
        description="Unique identifier of the calling AI Agent (e.g., 'travel-agent', 'banking-agent', 'shopping-agent')",
        examples=["travel-agent", "banking-agent", "shopping-agent", "coding-agent", "research-agent"]
    )
    content: Optional[str] = Field(
        default=None,
        description="Content to analyze (input prompt, external website, tool output)"
    )
    request: Optional[str] = Field(
        default=None,
        description="Alias for content to maintain backwards compatibility"
    )
    source: Optional[str] = Field(
        default="user_input",
        description="Source of content: user_input, website, api, tool, external_website"
    )
    source_url: Optional[str] = Field(
        default=None,
        description="Optional source URL or external API domain if applicable"
    )
    content_type: Optional[str] = Field(
        default="text",
        description="Content format: text, webpage, api_response, tool_output"
    )
    user_id: Optional[str] = Field(default=None, description="Optional caller user identifier")
    session_id: Optional[str] = Field(default=None, description="Optional agent session identifier")
    tool_name: Optional[str] = Field(default=None, description="Optional tool name invoking guardrail")
    model: Optional[str] = Field(default=None, description="Optional target LLM model name")
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional execution context or agent session metadata"
    )

    def get_text_content(self) -> str:
        """Helper to retrieve content from either content or request field."""
        return (self.content or self.request or "").strip()

class WebsiteScanRequest(BaseModel):
    agent_id: str = Field(..., description="Unique identifier of the calling AI Agent")
    url: str = Field(..., description="Target website URL or API endpoint domain accessed")
    content: str = Field(..., min_length=1, description="Fetched HTML, DOM text, API response, or tool output payload to inspect")
    resource_type: Optional[str] = Field(default="webpage_dom", description="Type of resource: webpage_dom, api_response, tool_output")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Optional metadata (HTTP method, headers, etc.)")

class OutputCheckRequest(BaseModel):
    agent_id: str = Field(..., description="Target Agent ID")
    content: Optional[str] = Field(default=None, description="Generated LLM/Agent response text to validate")
    response_text: Optional[str] = Field(default=None, description="Alias for content")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Optional context")

    def get_text_content(self) -> str:
        return (self.content or self.response_text or "").strip()
