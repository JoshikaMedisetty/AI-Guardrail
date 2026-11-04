
import React, { useState } from 'react';
import {
  PlugZap,
  Key,
  Copy,
  Check,
  Terminal,
  Code,
  Globe,
  Zap,
  Eye,
  EyeOff,
  ShieldCheck,
  Bot,
  Link2
} from 'lucide-react';

import { registerNewAgent } from '../services/api';

const AGENT_MODELS = [
  { value: 'llama', label: 'Llama', model: 'llama3.2:3b' },
  { value: 'mistral', label: 'Mistral', model: 'mistral:7b' },
  { value: 'qwen', label: 'Qwen', model: 'qwen3:4b' },
  { value: 'deepseek', label: 'DeepSeek', model: 'deepseek-r1:7b' },
  { value: 'gemma', label: 'Gemma', model: 'gemma3:4b' }
];

export function ConnectAgentPage({ onEventSimulated }) {
  const [activeTab, setActiveTab] = useState('python');

  const [agentName, setAgentName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [agentType, setAgentType] = useState('');

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const guardrailEndpoint =
    'http://localhost:8000/api/v1/guardrail/proxy';

  const selectedModel = AGENT_MODELS.find(
    (model) => model.value === agentType
  );

  const handleCopy = async (text, type) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);

      if (type === 'key') {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }

      if (type === 'endpoint') {
        setCopiedEndpoint(true);
        setTimeout(() => setCopiedEndpoint(false), 2000);
      }

      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch (err) {
      console.error('Copy failed:', err);
      setError('Could not copy to clipboard. Please copy it manually.');
    }
  };

  const handleConnect = async (event) => {
    event.preventDefault();
    setError('');

    if (!agentName.trim()) {
      setError('Please enter your agent name.');
      return;
    }

    if (!agentId.trim()) {
      setError('Please enter an agent ID.');
      return;
    }

    if (!agentType) {
      setError('Please select an AI model.');
      return;
    }

    setIsConnecting(true);

    try {
      const result = await registerNewAgent({
        id: agentId.trim(),
        name: agentName.trim(),
        category: agentType,
        description: `External ${selectedModel.label} agent using Ollama model ${selectedModel.model}`
      });

      if (!result?.api_key) {
        throw new Error(
          result?.detail || 'Guardrail API key was not generated.'
        );
      }

      setApiKey(result.api_key);
      setShowKey(true);
      setConnected(true);

      if (onEventSimulated) {
        onEventSimulated({
          type: 'external_agent_connected',
          agent_id: agentId.trim(),
          agent_type: agentType
        });
      }
    } catch (err) {
      console.error('External agent connection failed:', err);
      setError(
        err.message || 'Unable to connect external AI agent.'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const codeSnippets = {
    python: `import requests

GUARDRAIL_URL = "${guardrailEndpoint}"
GUARDRAIL_API_KEY = "${apiKey || 'YOUR_GUARDRAIL_API_KEY'}"

def check_guardrail(prompt):
    response = requests.post(
        GUARDRAIL_URL,
        headers={
            "X-API-Key": GUARDRAIL_API_KEY,
            "Content-Type": "application/json"
        },
        json={"content": prompt},
        timeout=30
    )

    response.raise_for_status()
    return response.json()["guardrail"]

def run_my_agent(user_prompt):
    result = check_guardrail(user_prompt)

    if result["action"] == "BLOCK":
        return "Request blocked by Universal AI Guardrail."

    # Call your selected model only after the prompt is allowed.
    return my_llm_agent(user_prompt)

def my_llm_agent(prompt):
    # Add your Ollama model call here.
    return "Your AI response"
`,

    javascript: `const GUARDRAIL_URL = "${guardrailEndpoint}";
const GUARDRAIL_API_KEY =
  "${apiKey || 'YOUR_GUARDRAIL_API_KEY'}";

async function checkGuardrail(prompt) {
  const response = await fetch(GUARDRAIL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": GUARDRAIL_API_KEY
    },
    body: JSON.stringify({ content: prompt })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Guardrail request failed"
    );
  }

  return data.guardrail;
}

async function runMyAgent(userPrompt) {
  const result = await checkGuardrail(userPrompt);

  if (result.action === "BLOCK") {
    return "Request blocked by Universal AI Guardrail.";
  }

  // Call your selected Ollama model after approval.
  return await myLLMAgent(userPrompt);
}
`,

    rest: `curl -X POST \\
"${guardrailEndpoint}" \\
-H "Content-Type: application/json" \\
-H "X-API-Key: ${apiKey || 'YOUR_GUARDRAIL_API_KEY'}" \\
-d '{
  "content": "Hello"
}'

# ALLOW -> Continue to your AI model
# BLOCK -> Stop the request
`,

    ollama: `import requests

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "${selectedModel?.model || 'llama3.2:3b'}"

def run_ollama(prompt):
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "stream": False
        },
        timeout=120
    )

    response.raise_for_status()
    return response.json()["message"]["content"]

# Check the prompt with Guardrail first.
# Call run_ollama(prompt) only if the decision is ALLOW.
`
  };

  return (
    <div className="content-page">
      {/* Page heading and description */}
      <div
        className="glass-card"
        style={{ marginBottom: '24px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              minWidth: '42px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(99,102,241,0.15)'
            }}
          >
            <Bot size={26} strokeWidth={1.8} />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                color: '#fff',
                fontSize: '20px'
              }}
            >
              Connect External AI Agent
            </h2>

            <p
              style={{
                marginTop: '8px',
                marginBottom: 0,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                maxWidth: '850px'
              }}
            >
              Enjoy your AI experience with greater peace of mind. AI Guardrail adds an extra layer of security to help protect your interactions from indirect prompt injections and potential threats, so you can focus on what matters while your AI stays safer.
            </p>
          </div>
        </div>
      </div>

      {/* Connection form */}
      {!connected && (
        <div
          className="glass-card"
          style={{ marginBottom: '24px' }}
        >
          <h3
            style={{
              color: '#fff',
              marginTop: 0,
              marginBottom: '8px'
            }}
          >
            Connect Your AI Model
          </h3>

          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '13px',
              marginTop: 0,
              marginBottom: '22px'
            }}
          >
            Register your model with Guardrail to generate
            credentials for protected requests.
          </p>

          <form onSubmit={handleConnect}>
            {/* Three fields in the same row */}
            <div className="external-agent-form-row">
              <div className="external-agent-field">
                <label htmlFor="agent-name">
                  Agent Name
                </label>

                <input
                  id="agent-name"
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="My Llama Agent"
                  className="form-input"
                  required
                />
              </div>

              <div className="external-agent-field">
                <label htmlFor="agent-id">
                  Agent ID
                </label>

                <input
                  id="agent-id"
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="my-llama-agent"
                  className="form-input"
                  required
                />
              </div>

              <div className="external-agent-field">
                <label htmlFor="agent-type">
                  External Agent Type
                </label>

                <select
                  id="agent-type"
                  value={agentType}
                  onChange={(e) => setAgentType(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="" disabled>
                    Select
                  </option>

                  {AGENT_MODELS.map((model) => (
                    <option
                      key={model.value}
                      value={model.value}
                    >
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedModel && (
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  marginTop: '12px'
                }}
              >
                Selected model: {selectedModel.model}
                {' · '}Ollama
              </p>
            )}

            {error && (
              <div
                role="alert"
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#ef4444',
                  fontSize: '13px'
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                marginTop: '22px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              disabled={isConnecting}
            >
              <Link2 size={15} />
              {isConnecting
                ? 'Connecting...'
                : 'Connect External Agent'}
            </button>
          </form>
        </div>
      )}

      {/* Connected agent details */}
      {connected && (
        <>
          <div
            className="glass-card"
            style={{ marginBottom: '24px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap'
              }}
            >
              <div>
                <h3
                  style={{
                    color: '#fff',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px'
                  }}
                >
                  <Check size={18} />
                  Agent Connected
                </h3>

                <p
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '13px'
                  }}
                >
                  {agentName} · {selectedModel?.label}
                </p>

                <p
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '12px'
                  }}
                >
                  Agent ID: {agentId}
                </p>

                <p
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '12px'
                  }}
                >
                  Ollama model: {selectedModel?.model}
                </p>
              </div>

              <span className="badge-pill">
                Guardrail Registered
              </span>
            </div>

            {/* API key */}
            <div style={{ marginTop: '22px' }}>
              <label
                style={{
                  display: 'block',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  marginBottom: '7px'
                }}
              >
                Guardrail API Key
              </label>

              <div
                className="credential-box"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Key size={15} />

                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  readOnly
                  aria-label="Guardrail API key"
                  className="credential-value font-mono"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none'
                  }}
                />

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                >
                  {showKey
                    ? <EyeOff size={14} />
                    : <Eye size={14} />}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCopy(apiKey, 'key')}
                >
                  {copiedKey
                    ? <Check size={14} />
                    : <Copy size={14} />}
                  {copiedKey ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* API endpoint */}
            <div style={{ marginTop: '16px' }}>
              <label
                style={{
                  display: 'block',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  marginBottom: '7px'
                }}
              >
                Guardrail API Endpoint
              </label>

              <div
                className="credential-box"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}
              >
                <Globe size={15} />

                <code
                  className="font-mono"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflowWrap: 'anywhere'
                  }}
                >
                  {guardrailEndpoint}
                </code>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    handleCopy(guardrailEndpoint, 'endpoint')
                  }
                >
                  {copiedEndpoint
                    ? <Check size={14} />
                    : <Copy size={14} />}
                  {copiedEndpoint ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Integration examples */}
          <div
            className="glass-card"
            style={{
              padding: 0,
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '18px',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <h3
                style={{
                  color: '#fff',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px'
                }}
              >
                <Code size={17} />
                Integrate Your AI Model
              </h3>

              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '13px'
                }}
              >
                Check prompts with Guardrail before sending
                them to your selected model.
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                  marginTop: '15px'
                }}
              >
                {[
                  ['python', 'Python'],
                  ['javascript', 'JavaScript'],
                  ['rest', 'REST / cURL'],
                  ['ollama', 'Ollama']
                ].map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    className={
                      activeTab === tab
                        ? 'btn btn-primary btn-sm'
                        : 'btn btn-secondary btn-sm'
                    }
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'python' && <Terminal size={13} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  position: 'absolute',
                  right: '15px',
                  top: '15px',
                  zIndex: 2
                }}
                onClick={() =>
                  handleCopy(codeSnippets[activeTab], 'code')
                }
              >
                {copiedCode
                  ? <Check size={14} />
                  : <Copy size={14} />}
                {copiedCode ? 'Copied' : 'Copy Code'}
              </button>

              <pre
                style={{
                  margin: 0,
                  padding: '24px',
                  paddingTop: '65px',
                  overflowX: 'auto',
                  background: 'rgba(0,0,0,0.25)',
                  color: '#e5e7eb',
                  fontSize: '12px',
                  lineHeight: 1.7
                }}
              >
                <code>{codeSnippets[activeTab]}</code>
              </pre>
            </div>

            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                borderTop: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <ShieldCheck size={18} />

              <span
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  lineHeight: 1.6
                }}
              >
                <strong style={{ color: '#fff' }}>
                  How it works:
                </strong>{' '}
                incoming prompts are checked by Universal AI
                Guardrail. Requests classified as BLOCK are
                stopped; allowed requests can continue to the
                selected AI model when the integration calls it.
              </span>
            </div>
          </div>
        </>
      )}

      {/* Responsive form styling */}
      <style>{`
        .external-agent-form-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
          align-items: end;
          margin-top: 20px;
        }

        .external-agent-field {
          display: flex;
          flex-direction: column;
          min-width: 0;
          gap: 7px;
        }

        .external-agent-field label {
          display: block;
          color: var(--text-secondary);
          font-size: 12px;
        }

        .external-agent-field .form-input {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .external-agent-form-row {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
}
