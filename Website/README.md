# 🛡️ Universal AI Guardrail: Securing LLM-Based Agents Against Prompt Injection and Malicious Attacks

> **Final-Year Capstone Project — Production-Ready Full-Stack AI Security SaaS Platform**  
> *Developed as an integrated, multi-tenant cybersecurity system protecting autonomous AI agents from adversarial inputs, prompt injections, and data exfiltration.*

---

## 📑 Table of Contents
1. [Project Overview & Problem Statement](#-project-overview--problem-statement)
2. [Key Capabilities & Features](#-key-capabilities--features)
3. [System Architecture & Data Flow](#-system-architecture--data-flow)
4. [Dual-Pipeline Guardrail Architecture](#-dual-pipeline-guardrail-architecture)
5. [Role-Based Access Control (RBAC) & Authentication](#-role-based-access-control-rbac--authentication)
6. [Protected AI Agents Ecosystem](#-protected-ai-agents-ecosystem)
7. [Cybersecurity Dashboard & Telemetry](#-cybersecurity-dashboard--telemetry)
8. [Machine Learning Pipeline & Evaluation](#-machine-learning-pipeline--evaluation)
9. [Technology Stack](#-technology-stack)
10. [Repository Structure](#-repository-structure)
11. [Environment Setup & Configuration](#-environment-setup--configuration)
12. [How to Run the Application](#-how-to-run-the-application)
13. [Automated Testing & Verification](#-automated-testing--verification)
14. [Downstream AI Provider Modes](#-downstream-ai-provider-modes)
15. [Security & Viva Evaluation Notes](#-security--viva-evaluation-notes)

---

## 🎯 Project Overview & Problem Statement

### The Problem
Large Language Models (LLMs) and autonomous AI agents integrated into enterprise workflows are vulnerable to **Adversarial Prompt Injections**, **Jailbreak Exploits**, **Instruction Overrides**, **System Prompt Extraction**, and **Indirect Web-based Injections**. Unchecked agent interactions can lead to unauthorized database operations, confidential data exfiltration, and downstream model compromise (OWASP Top 10 for LLMs: LLM01:2025 Prompt Injection, LLM02:2025 Sensitive Information Disclosure).

### The Solution
The **Universal AI Guardrail** is a production-grade, agent-agnostic security middleware and full-stack platform. Every interaction is inspected by a real-time **Dual-Pipeline Guardrail** combining:
- **Rule-Based Heuristic Analyzers**: 6 deterministic pattern scanners for delimiters, role overrides, exfiltration channels, and encoding anomalies.
- **Machine Learning Detector**: Pure-Python TF-IDF N-Gram Vectorizer + Linear SVM classifier delivering sub-millisecond inference.
- **Risk Decision Engine**: Quantifies confidence scores into dynamic risk ratings (`ALLOW`, `WARN/REVIEW`, `BLOCK`).
- **Output Guardrail**: Sanitizes AI model outputs before presentation to prevent API key leaks, JWT leaks, and system prompt disclosure.

---

## ⚡ Key Capabilities & Features

- **Unified Single-Server Architecture**: The entire React 18 SPA is built and served natively by the FastAPI backend on **`http://localhost:8000`**.
- **Agent Selection Directory**: Users can choose between multiple enabled AI personas (Coding, Finance, Travel, Banking, Shopping, Research, General AI).
- **Hardened Chat Workspace**: Live messaging with real-time risk scores, decision verdicts, and output sanitization indicators.
- **Immediate Attack Interception**: High-risk prompt injections are intercepted and blocked immediately without calling downstream LLM providers.
- **Multi-Tenant Isolation**: Normal users only access their own conversations, messages, and personal telemetry.
- **Enterprise RBAC**: Clear distinction between `USER` and `SECURITY_ADMIN` roles with protected administrative endpoints.
- **Full-Stack Persistence**: Persistent SQLite database with SQLAlchemy ORM tracking users, agents, conversations, messages, security audit logs, and alerts.
- **Executive Security Dashboard**: Real-time KPI cards, interactive Recharts time-series graphs, live threat telemetry stream, and forensic inspection modals.

---

## 🏛️ System Architecture & Data Flow

```
                      [ Client Web Browser ]
                                │
                                ▼
                   [ Unified FastAPI Gateway ]
                     (http://localhost:8000)
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
       [ Static SPA Router ]             [ API Router /api/v1 ]
     (React 18 Production UI)         (JWT Auth & Route Protection)
                                                │
                                                ▼
                                      [ Input Guardrail ]
                                ┌───────────────┴───────────────┐
                                ▼                               ▼
                     [ 6 Deterministic Rules ]     [ Linear SVM + TF-IDF ML ]
                                └───────────────┬───────────────┘
                                                ▼
                                    [ Risk Decision Engine ]
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
               🟢 LOW RISK (< 0.40)                              🔴 HIGH RISK (≥ 0.70)
             [ Decision = ALLOW ]                              [ Decision = BLOCK ]
                       │                                                 │
                       ▼                                                 ▼
             [ Selected AI Agent ]                             [ Intercept & Log Threat ]
          (Dispatch to Provider/Demo)                         (Halt downstream LLM calls)
                       │                                                 │
                       ▼                                                 ▼
             [ Output Guardrail ]                              [ Store Security Alert ]
         (PII & Secret Sanitization)                                     │
                       │                                                 │
                       ▼                                                 ▼
             [ Store Conversation ]                            [ Update Dashboard Stats ]
                       │                                                 │
                       └────────────────────────┬────────────────────────┘
                                                ▼
                                   [ SQLite DB: guardrail.db ]
```

---

## 🛡️ Dual-Pipeline Guardrail Architecture

### 1. Input Guardrail (Ensemble Detection)
Every inbound user message is evaluated concurrently:
- **Heuristic Rule Analyzers**:
  1. `DirectInstructionOverrideRule`: Detects patterns like `"ignore previous instructions"`, `"disregard all rules"`.
  2. `DelimiterOverrideRule`: Detects XML/Markdown framing exploits (`<system>`, `[ADMIN_OVERRIDE]`, `---BEGIN NEW INSTRUCTION---`).
  3. `SystemPromptExfiltrationRule`: Catches attempts to dump instructions or configuration (`"reveal system prompt"`, `"show initial instructions"`).
  4. `DataExfiltrationRule`: Detects C2 webhook exfiltration URLs and outbound credential leakage directives.
  5. `ObfuscationEncodingRule`: Unpacks Base64, Hex, and Leetspeak evasions.
  6. `IndirectPromptInjectionRule`: Analyzes embedded instructions in 3rd-party web pages or tool outputs.
- **Machine Learning Classifier**:
  - Model: **Linear SVM** (LinearSVC) + **TF-IDF N-gram (1-3) Vectorizer**.
  - Evaluated Performance: **92.73% Accuracy**, **92.68% Recall**, **90.48% F1-Score**.
  - Latency: **< 0.01ms inference per prompt**.

### 2. Risk Decision Engine Thresholds
- **`Risk Score < 0.40`** ➔ **`ALLOW`** (Green): Traffic is forwarded to the AI Agent.
- **`0.40 ≤ Risk Score < 0.70`** ➔ **`WARN / REVIEW`** (Yellow): Flagged with telemetry warning.
- **`Risk Score ≥ 0.70`** ➔ **`BLOCK`** (Red): Immediately blocked; downstream AI is **never** invoked.

### 3. Output Guardrail
Before sending the model output back to the user, the response is scanned for:
- API Keys (AWS, OpenAI, Stripe, Google, GitHub, Slack tokens).
- JWT Tokens and Bearer Credentials.
- Accidental System Instruction Leaks.
- Matches are redacted with `[REDACTED_SECRET]` or blocked if severity exceeds threshold.

---

## 👥 Role-Based Access Control (RBAC) & Authentication

| Feature / Action | Normal User (`USER`) | Security Admin (`SECURITY_ADMIN`) |
| :--- | :---: | :---: |
| Account Registration & Login | ✅ | ✅ |
| View Enabled Agents | ✅ | ✅ |
| Send Chat Prompts | ✅ | ✅ |
| Access Own Conversations & History | ✅ | ✅ |
| Delete Own Conversations | ✅ | ✅ |
| View Personal Security Telemetry | ✅ | ✅ |
| View System-Wide Global Analytics | ❌ (Scoped to user) | ✅ (Full System View) |
| Register / Connect New Agents | ❌ (HTTP 403) | ✅ |
| Disconnect / Disable Agents | ❌ (HTTP 403) | ✅ |
| Modify Global Risk Policies & Modules | ❌ (HTTP 403) | ✅ |
| View Unmasked Master API Keys | ❌ (Masked) | ✅ |

---

## 🤖 Protected AI Agents Ecosystem

The platform comes pre-configured with 7 distinct domain-specific agents:
1. 💻 **Coding Assistant** (`coding-agent`): Python/JS development, debugging, and secure code review.
2. 🏦 **Banking Agent** (`banking-agent`): Account queries, transfer workflows, and financial transactions.
3. ✈️ **Travel Assistant** (`travel-agent`): Trip planning, flight search, and hotel recommendations.
4. 📈 **Finance Assistant** (`finance-agent`): Budget analysis, portfolio insights, and market data.
5. 📚 **Research Assistant** (`research-agent`): Document summarization and scientific QA.
6. 🛒 **Shopping Agent** (`shopping-agent`): Product discovery and cart management.
7. 🤖 **General AI Assistant** (`general-assistant`): Open-domain conversational assistant.

*Security Note: Direct URL navigation to disabled or non-existent agents is rejected by the backend with HTTP 404.*

---

## 📊 Cybersecurity Dashboard & Telemetry

The dashboard provides real-time security observability:
- **Operational Metrics**: Total Monitored Requests, Verified Safe Requests, Blocked Attacks, Threat Percentage.
- **Live Telemetry Stream**: Real-time event feed with Risk Scores, Agent Personas, Target URLs, and Inspection Verdicts.
- **Forensic Modal**: Click "View" on any event to inspect triggered rule IDs, detection explanations, and exact payload extracts.
- **Visual Analytics**: Interactive Recharts traffic timelines and threat category distributions.

---

## 💻 Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.10+) with Uvicorn ASGI
- **Security**: PyJWT (HMAC-SHA256) & Bcrypt password hashing
- **ORM & Database**: SQLAlchemy with SQLite (`guardrail.db`)
- **Machine Learning**: Scikit-Learn (Linear SVM) & NumPy
- **Testing**: Pytest with HTTPX TestClient (66 automated tests passing 100%)

### Frontend
- **Framework**: React 18 + Vite
- **Routing**: React Router 7 with full SPA fallback
- **State Management**: React Context API (`AuthContext`)
- **Icons & Charts**: Lucide React Icons & Recharts
- **Styling**: Modern dark cybersecurity glassmorphism theme (`frontend/src/styles/index.css`)

---

## 📁 Repository Structure

```
Capstone/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py             # JWT registration, login, and RBAC dependencies
│   │   │   └── routes.py           # REST APIs (Agents, Chat, Dashboard, History, Config)
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic Settings & environment variables
│   │   │   ├── constants.py        # Enums (Decision, RiskLevel, AttackType)
│   │   │   └── security.py         # Bcrypt hashing & JWT token creation/decoding
│   │   ├── database/
│   │   │   ├── session.py          # SQLAlchemy engine, session maker, and schema migrations
│   │   │   └── seeder.py           # Automatic database initialization & seeders
│   │   ├── detectors/
│   │   │   ├── base.py             # BaseDetector abstract base class
│   │   │   └── rules/              # 6 Modular Rule Detectors (Regex & Heuristics)
│   │   ├── ml/
│   │   │   ├── ml_detector.py      # Linear SVM ML Detector integration
│   │   │   └── model_manager.py    # Singleton model artifact loader
│   │   ├── models/
│   │   │   └── log.py              # Database ORM models (User, Agent, Conversation, Message, Log, Alert)
│   │   ├── risk/
│   │   │   └── decision_engine.py  # Risk scoring & dynamic threshold evaluation
│   │   ├── services/
│   │   │   ├── chat_service.py     # End-to-end Chat & Guardrail orchestration
│   │   │   └── output_guardrail.py # Response sanitization & secret leak redaction
│   │   └── main.py                 # FastAPI application & Vite SPA static mounting
│   ├── models/guardrail_model/     # Trained ML classifier artifacts
│   └── tests/                      # Automated test suite (66 tests)
│       ├── test_security_rbac.py   # RBAC, tenant isolation & secret leak tests
│       ├── test_full_stack_chat_flow.py # End-to-end chat flow tests
│       ├── test_cybersecurity_dashboard.py # Dashboard & telemetry tests
│       ├── test_rule_detector.py   # Rule engine tests
│       ├── test_ml_detector.py     # ML classifier tests
│       └── verify_e2e.py           # Self-contained 10-step E2E verification script
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable UI components (Sidebar, Header, MetricCards, Badges)
│   │   ├── context/                # AuthContext & Session management
│   │   ├── pages/                  # Landing, Login, Register, Agents, Chat, Dashboard, History, Threats
│   │   ├── services/               # Centralized api.js service
│   │   └── styles/                 # Dark cybersecurity CSS design system
│   ├── package.json
│   └── vite.config.js
├── .env.example                    # Production configuration template
├── .gitignore                      # Complete ignore rules for Python, Node, and secrets
├── requirements.txt                # Backend Python dependencies
└── README.md                       # Comprehensive Capstone documentation
```

---

## ⚙️ Environment Setup & Configuration

Copy `.env.example` to create your local `.env`:

```bash
cp .env.example .env
```

### Key Configuration Variables:
```env
# Server & Database
PORT=8000
HOST="0.0.0.0"
DATABASE_URL="sqlite:///./guardrail.db"

# Security Secrets (Generate random string in production)
JWT_SECRET="guardrail-production-secure-jwt-secret-key-2026-xyz"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Guardrail Risk Thresholds
RISK_THRESHOLD_LOW=0.40
RISK_THRESHOLD_HIGH=0.70

# Operational Mode (Set false for strict production)
DEMO_MODE=false
SEED_DEMO_DATA=false

# Downstream AI Provider ('demo', 'openai', 'gemini')
AI_PROVIDER="demo"
OPENAI_API_KEY=""
GEMINI_API_KEY=""
```

---

## 🚀 How to Run the Application

### Method 1: Unified Single-Server Production Mode (Recommended)
Runs both the compiled React frontend and FastAPI backend under one main website URL:

```bash
# 1. Build the React frontend production bundle
cd frontend
npm install
npm run build
cd ..

# 2. Start the unified FastAPI server
python -m uvicorn app.main:app --app-dir backend --port 8000 --reload
```

- **Main Website**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **OpenAPI JSON**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

### Method 2: Dual-Process Development Mode
For active frontend development with Hot-Module Replacement (HMR):

```bash
# Terminal 1 - Backend Server
python -m uvicorn app.main:app --app-dir backend --port 8000 --reload

# Terminal 2 - Frontend Dev Server
cd frontend
npm run dev
```

- **Frontend Dev URL**: [http://localhost:5173](http://localhost:5173)
- **Backend API URL**: [http://localhost:8000](http://localhost:8000)

---

## 🧪 Automated Testing & Verification

Run the full automated test suite using pytest:

```bash
# Execute all 66 backend unit & integration test suites
python -m pytest backend/tests -v
```

Execute the 10-step End-to-End lifecycle verification script:

```bash
python backend/tests/verify_e2e.py
```

### Verification Highlights:
- ✅ **Registration & Auth**: Registers user, validates JWT token, tests duplicate rejection.
- ✅ **Agent Availability**: Validates all active agents, rejects disabled/non-existent agents.
- ✅ **Safe Prompt**: Successfully allows clean prompts, returns assistant response, verifies output safety.
- ✅ **Malicious Prompt**: Detects prompt injection, halts AI provider, persists BLOCK event.
- ✅ **Tenant Isolation**: Confirms User B cannot access or delete User A's conversations.
- ✅ **RBAC Protection**: Confirms normal users receive HTTP 403 on admin agent and config endpoints.
- ✅ **Database Persistence**: Confirms real record persistence across all database tables.

---

## 🌐 Downstream AI Provider Modes

1. **Demo Provider (`AI_PROVIDER="demo"`)**:
   - Built-in intelligent persona generator that dynamically handles coding, financial, travel, and research queries.
   - Requires zero external API keys.
   - Ideal for viva demonstrations and offline evaluation.
2. **OpenAI Provider (`AI_PROVIDER="openai"`)**:
   - Requires valid `OPENAI_API_KEY`.
   - Calls models such as `gpt-4o-mini` or `gpt-4o`.
3. **Google Gemini Provider (`AI_PROVIDER="gemini"`)**:
   - Requires valid `GEMINI_API_KEY`.
   - Calls models such as `gemini-1.5-flash` or `gemini-1.5-pro`.

---

## 🔒 Security & Viva Evaluation Notes

- **No Secret Leakage**: `GET /api/v1/agents` and `GET /api/v1/config` strictly mask all API keys and credentials.
- **Fail-Safe Policy**: On `BLOCK` decision, the downstream AI provider is bypassed entirely to conserve quota and prevent LLM compromise.
- **Input & Output Coverage**: Prevents adversarial prompt ingestion into the agent and halts leakage of system secrets in generated replies.
- **Production Standard**: Clean architecture following standard FastAPI dependency injection, separation of concerns, and modern React best practices.
