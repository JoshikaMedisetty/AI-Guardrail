# 📡 Universal AI Guardrail: API Reference Specification (Full Production)

Base URL: `http://localhost:8000/api/v1`

---

## 1. Primary Security Endpoints

### `POST /api/v1/guardrail/check` (Input Guardrail)
Analyzes user input prompt before forwarding to downstream AI agents.
```json
// Request
{
  "agent_id": "travel-agent",
  "request": "Book a flight from Hyderabad to Delhi for next Monday."
}

// Response (Safe)
{
  "request_id": "gr-da7407cf199a",
  "agent_id": "travel-agent",
  "decision": "ALLOW",
  "risk_score": 0.05,
  "confidence": 0.95,
  "attack_type": null,
  "severity": "LOW",
  "detected_indicators": [],
  "explanation": "Request analyzed by Guardrail. No malicious patterns or instruction overrides detected. Request appears safe.",
  "recommended_actions": [],
  "processing_time_ms": 0.78,
  "timestamp": "2026-08-24T18:00:00Z"
}
```

### `POST /api/v1/guardrail/check-output` (Output Guardrail)
Inspects agent generated response for credentials, system prompt leaks, and PII.
```json
// Request
{
  "agent_id": "banking-agent",
  "response_text": "Payment processed with key STRIPE_KEY_PLACEHOLDER."
}

// Response
{
  "verdict": "BLOCK",
  "original_text": "Payment processed with key STRIPE_KEY_PLACEHOLDER.",
  "sanitized_text": "Payment processed with key [REDACTED_STRIPE_KEY].",
  "risk_score": 0.95,
  "leakage_types": ["stripe_live_secret_key"],
  "redacted_count": 1,
  "processing_time_ms": 0.12,
  "explanation": "Output Guardrail: Redacted 1 sensitive token(s) (stripe_live_secret_key) to prevent data disclosure."
}
```

---

## 2. Telemetry, Alerts, & Agents Endpoints

- `GET /api/v1/alerts?limit=20`: Returns list of real-time security alerts from SQLite DB.
- `GET /api/v1/alerts/{alert_id}`: Returns complete forensic details for a specific incident.
- `GET /api/v1/agents`: Returns list of connected protected agents and live statistics.
- `POST /api/v1/agents`: Registers a new AI agent.
- `GET /api/v1/analytics`: Returns live threat category breakdown and risk distributions.
- `GET /api/v1/model-info`: Returns active ML model version, metrics, and comparisons.
- `GET /api/v1/benchmarks/run`: Executes the 10-scenario AgentDojo benchmark suite.
- `GET /api/v1/config`: Fetches active thresholds and module toggles.
- `PUT /api/v1/config`: Updates thresholds and module toggles dynamically.
