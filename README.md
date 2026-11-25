<<<<<<< HEAD
# Universal AI Guardrail

## Project Overview

Universal AI Guardrail is an agent-independent security system designed
to protect AI agents from malicious prompts and unsafe external content.
It acts as a security layer between an AI agent and the information it
processes, helping identify potential threats before they affect the
agent.

The system examines user inputs and retrieved website content to detect
suspicious instructions, prompt-injection attempts, and possible
data-exfiltration activities.

## Key Features

-   **Prompt Injection Detection:** Identifies attempts to override an
    AI agent's original instructions or manipulate its behaviour.
-   **Machine Learning Detection:** Uses TF-IDF feature extraction and a
    Linear Support Vector Machine (SVM) classifier to classify
    potentially malicious content.
-   **Rule-Based Detection:** Applies security rules and indicators
    alongside machine-learning predictions.
-   **Website Content Inspection:** Examines retrieved webpage content,
    DOM data, and supported external resource content.
-   **Input and Output Guardrails:** Provides security checks for user
    prompts and AI-generated responses.
-   **Risk Assessment:** Assigns risk scores and provides explanations
    for detected activity.
-   **Security Decisions:** Classifies requests as ALLOW, WARN, or BLOCK
    according to the detection result and configured policies.
-   **Audit Logging:** Maintains records of inspected requests and their
    corresponding decisions.
-   **Security Alerts:** Presents detected threats with severity levels,
    payload details, and recommended actions.
-   **Analytics and Monitoring:** Displays request statistics, threat
    categories, agent activity, and security trends.
-   **Agent Integration:** Supports the registration and protection of
    AI agents through API-based integration.
-   **Policy Configuration:** Allows users to manage detection modules,
    risk thresholds, and enforcement modes.

## Technology Stack

  -----------------------------------------------------------------------
  Component                           Technology
  ----------------------------------- -----------------------------------
  Frontend                            React, JavaScript, CSS

  Backend                             Python, FastAPI

  Machine Learning                    scikit-learn, TF-IDF, Linear SVM

  Detection Approach                  Machine learning and rule-based
                                      detection

  Database Layer                      SQLAlchemy with the database
                                      configured by the application

  Browser Automation                  Playwright, where enabled
  -----------------------------------------------------------------------

## System Architecture

The application is organized into two main parts:

-   **Frontend:** Provides the user interface for authentication,
    dashboard monitoring, agent management, security alerts, analytics,
    history, and guardrail configuration.
-   **Backend:** Handles API requests, content inspection, threat
    detection, risk assessment, security decisions, and persistence of
    audit information.

The machine-learning component analyses submitted content, while
rule-based checks identify known suspicious patterns. Their results
contribute to the final guardrail decision.

## Working Process

1.  The user submits a prompt or an AI agent retrieves content from an
    external website.
2.  The content is passed to the guardrail system for inspection.
3.  The machine-learning model and rule-based detection mechanisms
    analyse the content.
4.  The system evaluates the detected indicators and calculates a risk
    score.
5.  A security decision is generated: ALLOW, WARN, or BLOCK.
6.  The result and relevant security information are made available for
    monitoring and review.

## Main Application Modules

### 1. Authentication

Provides user login and registration interfaces for accessing the
application.

### 2. Executive Security Dashboard

Displays an overview of inspected requests, blocked threats, warnings,
average risk, and traffic activity. It also includes a live guardrail
testing interface.

### 3. Protected AI Agents

Displays registered AI agents, their protection status, request counts,
and detected threats.

### 4. Security Alerts

Lists detected security incidents and provides information about their
threat categories and severity levels.

### 5. Threat Forensics

Presents detailed information about detected threats, including the
suspicious payload, risk score, detection reason, triggered indicators,
and recommended actions.

### 6. Audit Log History

Maintains a record of inspected requests, including timestamps, agent
details, input content, threat information, risk scores, and final
decisions.

### 7. Security Analytics

Provides visual summaries of attack categories, severity distribution,
targeted external websites, requests by agent, and resource types.

### 8. Connect AI Agent

Provides the interface for registering agents and viewing API
integration information.

### 9. Guardrail Configuration

Allows users to manage security detection policies, enable or disable
detection modules, select enforcement modes, and configure risk
thresholds.

### 10. Profile and Theme Settings

Provides user account and security settings, along with the option to
change the application appearance between light and dark themes.

## Machine Learning Approach

The project uses a TF-IDF feature-extraction method to convert text into
numerical features suitable for classification. A Linear Support Vector
Machine (SVM) classifier is used to distinguish potentially malicious
content from benign content. Rule-based detection is also incorporated
to identify suspicious patterns and strengthen the overall inspection
process.

The system combines these detection results to support risk assessment
and security decisions.

## Expected Outcome

Universal AI Guardrail aims to provide an additional security layer for
AI agents by identifying malicious instructions and unsafe retrieved
content. It supports safer agent interactions through content
inspection, configurable enforcement, audit records, security alerts,
and monitoring dashboards.
=======
# AI-Guardrail
>>>>>>> b0496e10c318e8f7103ab4debf1425b44b1c7cbb
