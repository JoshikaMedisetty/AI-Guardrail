import os
import re
from typing import Dict, Any, Optional
from app.utils.logger import logger

class AIProviderService:
    """
    AI Agent & Provider Abstraction Layer.
    
    Decouples the security guardrail and frontend agents from specific LLM providers.
    Supports:
    - Deterministic Demo Provider (default; agent-persona tailored, no external API keys required)
    - OpenAI Provider (if OPENAI_API_KEY is configured)
    - Gemini Provider (if GEMINI_API_KEY is configured)
    """

    AGENT_PERSONAS = {
        "general-assistant": {
            "name": "General AI Assistant",
            "role": "General Intelligence & Reasoning",
            "system_prompt": "You are a helpful, courteous, and knowledgeable general-purpose AI assistant. Provide concise, clear, and accurate answers.",
            "sample_topics": ["general knowledge", "daily planning", "explanations", "summaries"]
        },
        "coding-agent": {
            "name": "Coding Assistant",
            "role": "Software Engineering & Architecture",
            "system_prompt": "You are an expert software engineer and code reviewer. Write clean, idiomatic, robust code with syntax highlighting and explanations.",
            "sample_topics": ["Python", "JavaScript", "algorithms", "debugging", "system design"]
        },
        "travel-agent": {
            "name": "Travel Assistant",
            "role": "Travel Planning & Logistics",
            "system_prompt": "You are a professional travel coordinator. Assist with flight schedules, hotel recommendations, packing advice, and city itineraries.",
            "sample_topics": ["flights", "hotels", "itineraries", "visa requirements", "sightseeing"]
        },
        "finance-agent": {
            "name": "Finance Assistant",
            "role": "Financial Analytics & Budgeting",
            "system_prompt": "You are a financial information assistant. Explain financial concepts, market dynamics, and budgeting principles responsibly without giving legal investment advice.",
            "sample_topics": ["budgeting", "market concepts", "financial metrics", "compound interest"]
        },
        "research-agent": {
            "name": "Research Assistant",
            "role": "Academic & Scientific QA",
            "system_prompt": "You are an academic research assistant. Provide well-structured summaries, literature synthesis, and objective explanations.",
            "sample_topics": ["literature review", "methodology", "data analysis", "scientific papers"]
        },
        "banking-agent": {
            "name": "Banking Agent",
            "role": "Secure Banking Operations",
            "system_prompt": "You are a secure banking agent assistant. Facilitate account inquiries, balance overviews, and policy explanations safely.",
            "sample_topics": ["balance inquiries", "wire transfers", "account security", "cards"]
        },
        "shopping-agent": {
            "name": "Shopping Agent",
            "role": "E-Commerce & Product Discovery",
            "system_prompt": "You are an e-commerce shopping concierge. Provide product comparisons, budget picks, and feature breakdowns.",
            "sample_topics": ["laptops", "smartphones", "appliances", "deals", "reviews"]
        }
    }

    def __init__(self):
        self.provider_type = os.getenv("AI_PROVIDER", "demo").lower().strip()
        self.openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
        self.gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

    def generate_response(self, agent_id: str, prompt: str, conversation_history: Optional[list] = None) -> str:
        """
        Generate response from configured AI provider for the selected agent persona.
        """
        # Validate agent persona
        persona = self.AGENT_PERSONAS.get(agent_id, self.AGENT_PERSONAS["general-assistant"])

        # 1. OpenAI Provider if configured
        if self.provider_type == "openai" and self.openai_key:
            try:
                import openai
                client = openai.OpenAI(api_key=self.openai_key)
                messages = [{"role": "system", "content": persona["system_prompt"]}]
                if conversation_history:
                    for msg in conversation_history[-6:]:
                        role = "user" if msg.get("sender") == "user" else "assistant"
                        messages.append({"role": role, "content": msg.get("content", "")})
                messages.append({"role": "user", "content": prompt})

                res = client.chat.completions.create(
                    model=self.openai_model,
                    messages=messages,
                    max_tokens=600,
                    temperature=0.7
                )
                return res.choices[0].message.content.strip()
            except Exception as e:
                logger.warning(f"OpenAI call failed ({e}), falling back to deterministic demo response.")

        # 2. Gemini Provider if configured
        if self.provider_type == "gemini" and self.gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_key)
                model = genai.GenerativeModel(
                    model_name=self.gemini_model,
                    system_instruction=persona["system_prompt"]
                )
                res = model.generate_content(prompt)
                return res.text.strip()
            except Exception as e:
                logger.warning(f"Gemini call failed ({e}), falling back to deterministic demo response.")

        # 3. Deterministic Demo Provider
        return self._generate_demo_response(agent_id, persona, prompt)

    def _generate_demo_response(self, agent_id: str, persona: dict, prompt: str) -> str:
        """
        Produce high-quality, deterministic persona-based response for demonstration mode.
        """
        p_lower = prompt.lower()
        agent_name = persona["name"]

        # Coding Assistant
        if agent_id == "coding-agent":
            if "reverse" in p_lower and "string" in p_lower:
                return (
                    "Here is the standard Python implementation to reverse a string efficiently:\n\n"
                    "```python\n"
                    "def reverse_string(s: str) -> str:\n"
                    "    \"\"\"Reverses a string using Python slicing syntax.\"\"\"\n"
                    "    return s[::-1]\n\n"
                    "# Example usage:\n"
                    "text = \"Universal AI Guardrail\"\n"
                    "print(reverse_string(text)) # Output: liardrauG IA lasrevinU\n"
                    "```\n\n"
                    "**Complexity**:\n"
                    "- **Time Complexity**: $O(n)$ where $n$ is the length of the string.\n"
                    "- **Space Complexity**: $O(n)$ for creating the reversed string copy."
                )
            elif "binary search" in p_lower or "search" in p_lower:
                return (
                    "Here is a clean implementation of Binary Search in Python:\n\n"
                    "```python\n"
                    "def binary_search(arr: list[int], target: int) -> int:\n"
                    "    left, right = 0, len(arr) - 1\n"
                    "    while left <= right:\n"
                    "        mid = (left + right) // 2\n"
                    "        if arr[mid] == target:\n"
                    "            return mid\n"
                    "        elif arr[mid] < target:\n"
                    "            left = mid + 1\n"
                    "        else:\n"
                    "            right = mid - 1\n"
                    "    return -1\n"
                    "```\n\n"
                    "**Time Complexity**: $O(\\log n)$."
                )
            elif "hello" in p_lower or "hi" in p_lower or len(prompt) < 15:
                return f"Hello! I am your {agent_name}. What programming language or architecture problem can I assist you with today?"
            else:
                return (
                    f"### {agent_name} Analysis\n\n"
                    f"Regarding your query: *\"{prompt.strip()}\"*\n\n"
                    "1. **Architecture & Approach**: Break down the task into modular components with well-defined inputs and outputs.\n"
                    "2. **Implementation Best Practices**: Ensure strict input validation, proper error handling, and type annotations.\n"
                    "3. **Security**: Validate all external inputs before processing to prevent injection vulnerabilities.\n\n"
                    "Let me know if you would like me to generate specific code or test cases for this."
                )

        # Travel Assistant
        elif agent_id == "travel-agent":
            if "delhi" in p_lower or "flight" in p_lower or "tokyo" in p_lower:
                return (
                    f"✈️ **Travel Itinerary & Booking Overview**\n\n"
                    f"Based on your query: *\"{prompt.strip()}\"*\n\n"
                    "Here are the recommended travel options:\n"
                    "- **Direct Flight**: Departure at 08:30 AM (Est. Duration: 2h 15m) — ₹4,850\n"
                    "- **Flexible Option**: Departure at 04:45 PM (Est. Duration: 2h 20m) — ₹5,200\n"
                    "- **Recommended Hotel**: Grand Central Regency (4.7★, 1.2km from city center)\n\n"
                    "💡 *Tip: Ensure your government ID is up to date and check in 24 hours prior to departure.*"
                )
            else:
                return (
                    f"✈️ **{agent_name} Recommendations**\n\n"
                    f"I have received your travel request: *\"{prompt.strip()}\"*\n\n"
                    "• **Recommended Duration**: 4 to 6 days for optimal exploration.\n"
                    "• **Key Attractions**: Historic landmarks, central culinary district, and cultural museums.\n"
                    "• **Logistics**: Local metro cards and ride-sharing are highly recommended for seamless transit.\n\n"
                    "Would you like me to find specific hotel accommodations or flight schedules?"
                )

        # Finance Assistant
        elif agent_id == "finance-agent":
            return (
                f"📈 **{agent_name} Information Summary**\n\n"
                f"Regarding: *\"{prompt.strip()}\"*\n\n"
                "1. **Core Principle**: Maintaining a diversified asset allocation across equities, fixed-income, and liquid cash mitigates overall volatility.\n"
                "2. **Risk Management**: Always maintain an emergency fund covering 3 to 6 months of baseline living expenses.\n"
                "3. **Cost Efficiency**: Favor low-expense index funds and dollar-cost averaging for long-term horizons.\n\n"
                "*Note: This information is for educational purposes and does not constitute personalized financial advice.*"
            )

        # Research Assistant
        elif agent_id == "research-agent":
            return (
                f"📚 **{agent_name} Synthesis**\n\n"
                f"**Research Topic**: {prompt.strip()}\n\n"
                "### Summary of Findings:\n"
                "- **Background & Context**: Recent literature emphasizes systematic benchmarking, empirical ablation studies, and reproducibility.\n"
                "- **Key Methodologies**: Multi-stage evaluation combining quantitative metrics (F1-score, Precision, Recall) with domain-specific stress testing.\n"
                "- **Future Directions**: Exploring lightweight neural architectures and rule-ensemble hybrids to balance defense accuracy with sub-millisecond inference latency."
            )

        # Banking Agent
        elif agent_id == "banking-agent":
            return (
                f"🏦 **Secure Banking Agent Response**\n\n"
                f"Request Processed: *\"{prompt.strip()}\"*\n\n"
                "• **Transaction Status**: Account verified and in good standing.\n"
                "• **Available Balance**: ₹1,48,250.00 (Checking Account ending in -4819).\n"
                "• **Security Note**: Multi-factor authentication is active on all outbound transfers.\n\n"
                "Please confirm if you would like an official transaction statement generated."
            )

        # Shopping Agent
        elif agent_id == "shopping-agent":
            return (
                f"🛒 **{agent_name} Product Selection**\n\n"
                f"Search Query: *\"{prompt.strip()}\"*\n\n"
                "Top Verified Recommendations:\n"
                "1. **Best Overall**: UltraBook Pro 15 (16GB RAM, 512GB SSD, Intel i7) — ₹54,999 (4.8★)\n"
                "2. **Best Budget**: SlimBook Air 14 (16GB RAM, 512GB SSD, Ryzen 5) — ₹42,500 (4.6★)\n"
                "3. **Performance Pick**: CreatorStudio X (32GB RAM, 1TB SSD, RTX 4050) — ₹69,990 (4.7★)\n\n"
                "Price comparison shows lowest price available today with free express delivery."
            )

        # Default General Assistant
        else:
            return (
                f"Hello! I am your {agent_name}.\n\n"
                f"Regarding your query: *\"{prompt.strip()}\"*\n\n"
                "I am here to assist you with comprehensive explanations, problem solving, and analytical workflows. "
                "All interactions are continuously monitored and secured by the Universal AI Guardrail middleware in real time.\n\n"
                "How else can I assist you with this topic?"
            )

# Global singleton
ai_provider_service = AIProviderService()
