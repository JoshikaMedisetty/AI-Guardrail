# 🛡️ Universal AI Guardrail: System Architecture (Full Production)

## 1. High-Level Architecture Diagram

```
                             USER REQUEST
                                  │
                                  ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                  INPUT GUARDRAIL SECURITY LAYER                 │
 │                                                                 │
 │   1. Text Normalization (Unicode NFKC, Whitespace cleanup)      │
 │   2. Multi-Vector Threat Analysis Pipeline                      │
 │      ├── 📋 Rule-Based Security Engine (6 Modular Rules)        │
 │      │   ├── Prompt Injection Rule                              │
 │      │   ├── Jailbreak & DAN Rule                               │
 │      │   ├── System Prompt Extraction Rule                      │
 │      │   ├── Data Exfiltration Rule                             │
 │      │   ├── Obfuscation & Decoding Rule (Base64/Hex/ROT13)     │
 │      │   └── Indirect Prompt Injection Rule                     │
 │      └── 🤖 Trained Machine Learning Classifier                 │
 │          ├── Pure TF-IDF N-gram Vectorizer (1-3 ngrams)         │
 │          └── Calibrated Multinomial Naive Bayes (94.6% Acc)     │
 │   3. Centralized Risk Scoring & Decision Engine                 │
 │      ├── Risk Formula: R = min(1.0, w_ml*P + w_rule*S + w_sev)  │
 │      └── Thresholds: LOW (<0.40), MEDIUM (0.40-0.70), HIGH (>0.70)
 └─────────────────┬─────────────────────────────┬─────────────────┘
                   │                             │
          [Safe / Warn Decision]          [Block Decision]
                   │                             │
                   ▼                             ▼
 ┌──────────────────────────────────┐ ┌────────────────────────────┐
 │     PROTECTED AI AGENT LAYER     │ │  SECURITY ALERT DASHBOARD  │
 │  - ✈️ Travel Booking Agent        │ │  - Incident Breakdown      │
 │  - 🛒 Shopping Agent             │ │  - Extracted Indicators    │
 │  - 🏦 Banking Agent              │ │  - Mitigation Checklist    │
 │  - 💻 Coding Agent               │ └────────────────────────────┘
 │  - 📚 Research Agent             │
 └─────────────────┬────────────────┘
                   │ Raw Agent Response
                   ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                 OUTPUT GUARDRAIL SECURITY LAYER                 │
 │                                                                 │
 │   1. PII & Secret Credential Redaction (Stripe, AWS, RSA, Cards)│
 │   2. System Prompt Reflection & Instruction Leakage Protection  │
 │   3. Verdict Assignment (SAFE / SANITIZED / BLOCK)              │
 └─────────────────┬───────────────────────────────────────────────┘
                   │ Sanitized & Verified Content
                   ▼
            FINAL RESPONSE TO USER
```

---

## 2. Universal Agent Integration Flow

```
                      +-------------------+
                      |   Any LLM Agent   |
                      +---------+---------+
                                |
                    guardrail.protect_agent()
                                |
                                v
               +---------------------------------+
               | POST /api/v1/guardrail/check    |
               +----------------+----------------+
                                |
                   +------------+------------+
                   |                         |
              [ decision ]              [ decision ]
                == ALLOW                  == BLOCK
                   |                         |
                   v                         v
           Execute LLM Agent           Halt Execution
                   |                   Dispatch Alert
                   v
   +------------------------------------+
   | POST /api/v1/guardrail/check-output|
   +---------------+--------------------+
                   |
                   v
        Return Verified Output
```

---

## 3. Machine Learning Pipeline

```
  Curated Dataset (287 samples, 10 attack classes)
                      │
                      ▼
       Stratified Train / Test Partition (80/20)
                      │
                      ▼
   Pure TF-IDF N-gram Feature Extraction (1-3 ngrams)
                      │
                      ▼
   Candidate Classifiers Comparison & Evaluation
   ├── Multinomial Naive Bayes (94.6% Acc, 96.4% Recall) ──> Selected
   ├── Logistic Regression (91.1% Acc)
   ├── Linear SVM (87.5% Acc)
   └── Random Forest (87.5% Acc)
                      │
                      ▼
  Versioned Model Serialization (model.json & metadata.json)
```
