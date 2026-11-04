import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Send, Shield, ShieldAlert, ShieldCheck, AlertTriangle,
  Plus, Sparkles, Lock, Cpu, ArrowLeft, Trash2,
  MessageSquare, Clock, X, Bot, ChevronDown
} from 'lucide-react';

import {
  fetchAgentById,
  fetchAgents,
  fetchOllamaModels,
  sendChatMessage,
  runBrowserAgent,
  fetchConversations,
  fetchConversationDetail,
  deleteConversation
} from '../services/api';

const formatTime = () =>
  new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

function getDecisionClass(decision) {
  if (decision === 'ALLOW') return 'risk-allow';
  if (decision === 'BLOCK') return 'risk-block';
  if (decision === 'WARN') return 'risk-warn';
  return 'risk-analyzing';
}

function getModelLabel(name) {
  return String(name || '')
    .replace(/:latest$/, '')
    .replace(/:(\d+)b$/i, ' · $1B');
}

function RiskBadge({ message, onClick }) {
  if (!message.decision) return null;

  const decision = message.decision;

  return (
    <button
      type="button"
      className={`risk-badge-tag ${getDecisionClass(decision)}`}
      onClick={() => onClick(message)}
      title="View guardrail inspection details"
    >
      {decision === 'ALLOW' && <ShieldCheck size={12} />}
      {decision === 'BLOCK' && <ShieldAlert size={12} />}
      {decision === 'WARN' && <AlertTriangle size={12} />}

      <span>
        {decision === 'ANALYZING'
          ? 'Scanning...'
          : `${decision} · Risk: ${Math.round((message.risk_score || 0) * 100)}%`}
      </span>
    </button>
  );
}

export function ChatWorkspacePage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);

  const [currentAgent, setCurrentAgent] = useState(null);
  const [allAgents, setAllAgents] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const [selectedModel, setSelectedModel] = useState(
    location.state?.selectedModel || 'llama3.2:3b'
  );
  const [availableModels, setAvailableModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  const [browserAgentMode, setBrowserAgentMode] = useState(false);
  const [userConversations, setUserConversations] = useState([]);
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);
  const [selectedRiskDetail, setSelectedRiskDetail] = useState(null);
  const [loadError, setLoadError] = useState('');

  // --------------------------------------------------
  // Start a new conversation
  // --------------------------------------------------
  const startNewConversation = (agent = currentAgent) => {
    setConversationId(null);

    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        content:
          `Hello! I am ${agent?.name || 'your AI assistant'}. ` +
          'How can I help you today? Your messages are protected by the Universal AI Guardrail.',
        risk_score: 0,
        risk_level: 'LOW',
        decision: 'ALLOW',
        detection_reason: 'Welcome message initialized.',
        output_guardrail: {
          verdict: 'SAFE',
          sanitized: false
        },
        time: formatTime()
      }
    ]);

    setInputText('');
  };

  // --------------------------------------------------
  // Load installed Ollama models dynamically
  // --------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      setModelsLoading(true);

      try {
        const result = await fetchOllamaModels();

        const installed = (result?.models || result || [])
          .map((item) =>
            typeof item === 'string' ? item : item.name || item.model
          )
          .filter(Boolean);

        if (cancelled) return;

        setAvailableModels(installed);

        if (installed.length > 0 && !installed.includes(selectedModel)) {
          setSelectedModel(installed[0]);
        }
      } catch (error) {
        console.error('Failed to load installed Ollama models:', error);

        if (!cancelled) {
          setLoadError(
            'Could not load Ollama models. Make sure Ollama is running and refresh the page.'
          );
        }
      } finally {
        if (!cancelled) {
          setModelsLoading(false);
        }
      }
    }

    loadModels();

    return () => {
      cancelled = true;
    };

    // Load once when the workspace mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------
  // Change model and reset the active conversation
  // --------------------------------------------------
  const handleModelChange = (event) => {
    const model = event.target.value;

    if (!model || model === selectedModel) return;

    if (sending) return;

    setSelectedModel(model);
    setConversationId(null);
    setUserConversations([]);
    setSelectedRiskDetail(null);
    setInputText('');

    // Prevent the previous model's messages from remaining visible.
    startNewConversation();

    navigate(location.pathname, {
      replace: true,
      state: {
        ...(location.state || {}),
        selectedModel: model
      }
    });
  };

  // --------------------------------------------------
  // Load agent and history for the selected model
  // --------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    
    async function loadWorkspace() {
      setLoadError('');

  try {
    const agents = await fetchAgents();

    if (cancelled) return;

    setAllAgents(agents || []);

    const selectedAgentId =
      agentId || agents?.[0]?.id;

    if (!selectedAgentId) {
      throw new Error('No AI agents are configured.');
    }

    const agent = await fetchAgentById(selectedAgentId);

if (cancelled) return;

if (!agent?.id) {
  throw new Error("The selected agent was not returned correctly.");
}

setCurrentAgent(agent);

const conversations = await fetchConversations(
  selectedAgentId,
  selectedModel
);

if (cancelled) return;

setUserConversations(conversations || []);

    if (conversations?.length) {
      const firstConversation = conversations[0];

      const detail = await fetchConversationDetail(
        firstConversation.id
      );

      if (cancelled) return;

      setConversationId(firstConversation.id);
      setMessages(detail?.messages || []);
    } else {
      setConversationId(null);
      startNewConversation(agent);
    }
  } catch (error) {
    if (!cancelled) {
      console.error('Failed to load chat workspace:', error);

      setLoadError(
        error.message ||
          'Could not load the chat workspace. Check that the backend is running.'
      );
    }
  }
}


    
    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [agentId, selectedModel]);

  // --------------------------------------------------
  // Scroll to newest message
  // --------------------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, sending]);

  // --------------------------------------------------
  // Select a saved conversation
  // --------------------------------------------------
  const handleSelectConversation = async (conversation) => {
    try {
      const detail = await fetchConversationDetail(conversation.id);

      setConversationId(conversation.id);
      setMessages(detail?.messages || []);

      if (window.innerWidth < 768) {
        setShowHistorySidebar(false);
      }
    } catch (error) {
      console.error('Failed to open conversation:', error);
      setLoadError('Could not open this conversation.');
    }
  };

  // --------------------------------------------------
  // Delete a saved conversation
  // --------------------------------------------------
  const handleDeleteConversation = async (event, id) => {
    event.stopPropagation();

    try {
      await deleteConversation(id);

      const remaining = userConversations.filter(
        (conversation) => conversation.id !== id
      );

      setUserConversations(remaining);

      if (conversationId === id) {
        startNewConversation();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      setLoadError('Could not delete this conversation.');
    }
  };

  // --------------------------------------------------
  // Send message
  // --------------------------------------------------
  const handleSendMessage = async (event) => {
    event?.preventDefault();

    const prompt = inputText.trim();

    if (!prompt || sending) return;

    setInputText('');
    setSending(true);
    setLoadError('');

    const temporaryId = `user-${Date.now()}`;

    setMessages((previous) => [
      ...previous,
      {
        id: temporaryId,
        sender: 'user',
        content: browserAgentMode ? `🌐 ${prompt}` : prompt,
        decision: 'ANALYZING',
        risk_score: null,
        risk_level: 'PENDING',
        time: formatTime()
      }
    ]);

    try {
      // Browser-agent requests use the existing browser API.
      if (browserAgentMode) {
        const response = await runBrowserAgent({
          task: prompt,
          agentId: currentAgent?.id,
          model: selectedModel
        });

        const blocked = Boolean(response?.blocked);

        setMessages((previous) => [
          ...previous.map((message) =>
            message.id === temporaryId
              ? {
                  ...message,
                  decision: blocked
                    ? 'BLOCK'
                    : response?.success
                      ? 'ALLOW'
                      : 'WARN',
                  risk_score: blocked ? 1 : 0,
                  risk_level: blocked ? 'CRITICAL' : 'LOW',
                  detection_reason:
                    response?.guardrail?.message ||
                    response?.error ||
                    'Browser-agent inspection completed.'
                }
              : message
          ),
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            content: blocked
              ? `🛑 Website blocked by the guardrail.\n\n${
                  response?.guardrail?.message ||
                  'Potentially malicious content detected.'
                }`
              : response?.success
                ? `✅ Website processed successfully.\n\nTitle: ${
                    response?.title || 'Unknown'
                  }\nURL: ${
                    response?.planned_url ||
                    response?.url ||
                    'Unknown'
                  }`
                : `⚠️ The browser agent could not complete the request.\n\n${
                    response?.error || 'Unknown error.'
                  }`,
            decision: blocked
              ? 'BLOCK'
              : response?.success
                ? 'ALLOW'
                : 'WARN',
            risk_score: blocked ? 1 : 0,
            risk_level: blocked ? 'CRITICAL' : 'LOW',
            detection_reason:
              response?.guardrail?.message ||
              response?.error ||
              'Browser-agent task completed.',
            time: formatTime()
          }
        ]);

        return;
      }

      // Send the selected model to the backend for actual inference.
      if (!currentAgent?.id) {
        throw new Error("No AI agent selected. Please select an available agent.");
      }

      const response = await sendChatMessage(
        currentAgent.id,
        prompt,
        conversationId,
        selectedModel
      );

      setMessages((previous) => {
        const updated = previous.map((message) =>
          message.id === temporaryId
            ? {
                ...message,
                id: response?.message_id || message.id,
                risk_score: response?.risk_score ?? 0,
                risk_level: response?.risk_level || 'LOW',
                decision: response?.decision || 'ALLOW',
                triggered_rules: response?.triggered_rules || [],
                detection_reason: response?.reason || ''
              }
            : message
        );

        updated.push({
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          content:
            response?.assistant_response ||
            'The backend returned an empty response.',
          risk_score: response?.risk_score ?? 0,
          risk_level: response?.risk_level || 'LOW',
          decision: response?.decision || 'ALLOW',
          triggered_rules: response?.triggered_rules || [],
          detection_reason: response?.reason || '',
          output_guardrail: response?.output_guardrail,
          time: formatTime()
        });

        return updated;
      });

      if (response?.conversation_id) {
        setConversationId(response.conversation_id);
      }

      // Refresh history for this model, including existing conversations.
      const conversations = await fetchConversations(
        agentId,
        selectedModel
      );

      setUserConversations(conversations || []);
    } catch (error) {
      console.error('Message request failed:', error);

      setMessages((previous) => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          content: `⚠️ Error: ${
            error?.message ||
            'Unable to communicate with the backend.'
          }`,
          decision: 'ERROR',
          risk_score: 0,
          detection_reason:
            error?.message || 'Backend request failed.',
          time: formatTime()
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  // --------------------------------------------------
  // Risk-detail modal
  // --------------------------------------------------
  const closeRiskDetail = () => setSelectedRiskDetail(null);

  const riskDetail = selectedRiskDetail;
  const riskPercent = Math.round(
    (riskDetail?.risk_score || 0) * 100
  );

  return (
    <div className="chat-workspace-container chat-workspace-fullscreen">
      {/* Workspace header */}
      <header className="chat-header-bar glass-card">
        <div className="chat-workspace-brand">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/agents')}
            title="Back to agents"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="agent-avatar-box">
            <span>{currentAgent?.icon || '🤖'}</span>
          </div>

          <div className="chat-agent-heading">
            <div className="chat-agent-title">
              <h3>{currentAgent?.name || 'AI Assistant'}</h3>

              <span className="category-pill">
                {currentAgent?.category || 'General'}
              </span>
            </div>

          </div>
        </div>

        <div className="chat-header-controls">
          {/* Dynamic Ollama model selector */}
          <div className="model-selector-wrap">
            <label
              htmlFor="model-selector"
              className="model-selector-label"
            >
              <Cpu size={13} />
              AI MODEL
            </label>

            <div className="model-select-control">
              <select
                id="model-selector"
                className="form-select form-select-sm model-selector"
                value={selectedModel}
                onChange={handleModelChange}
                disabled={
                  modelsLoading ||
                  availableModels.length === 0 ||
                  sending
                }
                aria-label="Select AI model"
              >
                {availableModels.length === 0 ? (
                  <option value={selectedModel}>
                    {modelsLoading
                      ? 'Loading models…'
                      : 'No Ollama models found'}
                  </option>
                ) : (
                  availableModels.map((model) => (
                    <option key={model} value={model}>
                      {getModelLabel(model)}
                    </option>
                  ))
                )}
              </select>

              <ChevronDown size={14} />
            </div>
          </div>


          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => startNewConversation()}
            title="Start a new conversation"
          >
            <Plus size={14} />
            <span>New Chat</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${
              showHistorySidebar ? 'btn-primary' : 'btn-secondary'
            }`}
            onClick={() =>
              setShowHistorySidebar((previous) => !previous)
            }
            title="Toggle conversation history"
            aria-label="Toggle conversation history"
          >
            <MessageSquare size={14} />
          </button>
        </div>
      </header>

      {loadError && (
        <div className="chat-error-banner" role="alert">
          <AlertTriangle size={16} />
          {loadError}
        </div>
      )}

      {/* Main workspace */}
      <div className="chat-layout-body">
        {/* Conversation history */}
        {showHistorySidebar && (
          <aside className="chat-history-sidebar glass-card">
            <div className="chat-history-heading">
              <span>
                {currentAgent?.name || 'Agent'} · {getModelLabel(selectedModel)}
              </span>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => startNewConversation()}
                title="New conversation"
              >
                <Plus size={13} />
              </button>
            </div>

            <div className="history-conv-list">
              {userConversations.length === 0 ? (
                <div className="chat-history-empty">
                  No saved conversations for this model.
                </div>
              ) : (
                userConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    role="button"
                    tabIndex={0}
                    className={`history-conv-item ${
                      conversationId === conversation.id
                        ? 'active'
                        : ''
                    }`}
                    onClick={() =>
                      handleSelectConversation(conversation)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleSelectConversation(conversation);
                      }
                    }}
                  >
                    <div className="history-conv-info">
                      <div className="conv-item-title">
                        {conversation.title || 'Untitled conversation'}
                      </div>

                      <div className="conv-item-time">
                        {conversation.time || ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="conv-item-delete"
                      onClick={(event) =>
                        handleDeleteConversation(
                          event,
                          conversation.id
                        )
                      }
                      title="Delete conversation"
                      aria-label="Delete conversation"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Chat panel */}
        <main className="chat-main-panel">
          {/* Browser-agent controls */}
          <section className="chat-mode-toolbar">
            <button
              type="button"
              className={`btn btn-sm ${
                browserAgentMode ? 'btn-primary' : 'btn-secondary'
              }`}
              onClick={() =>
                setBrowserAgentMode((previous) => !previous)
              }
              aria-pressed={browserAgentMode}
            >
              🌐 {browserAgentMode
                ? 'Browser Agent ON'
                : 'Browser Agent OFF'}
            </button>

            <div className="chat-mode-description">
              {browserAgentMode
                ? 'Browser-agent tasks are processed through your existing browser API.'
                : 'Messages are checked by your configured Universal AI Guardrail.'}
            </div>
          </section>

          {/* Messages */}
          <section
            className="chat-messages-area"
            aria-label="Chat messages"
            aria-live="polite"
          >
            {messages.map((message, index) => {
              const isUser = message.sender === 'user';
              const isBlocked = message.decision === 'BLOCK';

              return (
                <div
                  key={message.id || index}
                  className={`chat-message-row ${
                    isUser ? 'user-row' : 'assistant-row'
                  }`}
                >
                  {!isUser && (
                    <div className="chat-msg-avatar assistant-avatar">
                      {currentAgent?.icon || <Bot size={17} />}
                    </div>
                  )}

                  <article
                    className={`chat-message-bubble ${
                      isUser ? 'user-bubble' : 'assistant-bubble'
                    } ${isBlocked ? 'blocked-bubble' : ''}`}
                  >
                    <div className="message-bubble-header">
                      <span className="bubble-sender-name">
                        {isUser
                          ? 'You'
                          : currentAgent?.name || 'AI Assistant'}
                      </span>

                      {isUser && message.decision && (
                        <RiskBadge
                          message={message}
                          onClick={setSelectedRiskDetail}
                        />
                      )}

                      {!isUser && message.output_guardrail && (
                        <span
                          className={`output-badge-tag ${
                            message.output_guardrail.sanitized
                              ? 'sanitized'
                              : 'clean'
                          }`}
                        >
                          <Lock size={11} />
                          {message.output_guardrail.sanitized
                            ? 'Output Sanitized'
                            : 'Output Verified'}
                        </span>
                      )}
                    </div>

                    <div className="message-content-text">
                      {(message.content || '')
                        .split('\n')
                        .map((line, lineIndex) => (
                          <p key={lineIndex}>
                            {line || '\u00A0'}
                          </p>
                        ))}
                    </div>

                    {message.triggered_rules?.length > 0 && (
                      <div className="triggered-rules-box">
                        <strong>Detected Security Indicators</strong>

                        <div className="chat-indicator-list">
                          {message.triggered_rules.map(
                            (rule, ruleIndex) => (
                              <span
                                className="indicator-chip"
                                key={ruleIndex}
                              >
                                <AlertTriangle size={10} />
                                {String(rule)}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {message.detection_reason && (
                      <div className="chat-detection-reason">
                        {message.detection_reason}
                      </div>
                    )}

                    <div className="message-timestamp">
                      <Clock size={10} />
                      <span>{message.time || 'Now'}</span>
                    </div>
                  </article>

                  {isUser && (
                    <div className="chat-msg-avatar user-avatar">
                      👤
                    </div>
                  )}
                </div>
              );
            })}

            {sending && (
              <div className="chat-message-row assistant-row">
                <div className="chat-msg-avatar assistant-avatar">
                  {currentAgent?.icon || '🤖'}
                </div>

                <div className="chat-message-bubble assistant-bubble analyzing-bubble">
                  <div className="chat-loading-label">
                    <Cpu size={16} className="spin" />
                    <span>
                      {browserAgentMode
                        ? 'Browser agent is processing your task...'
                        : `Sending to ${getModelLabel(selectedModel)} through the guardrail...`}
                    </span>
                  </div>

                  <div className="guardrail-scan-bar">
                    <div className="guardrail-scan-progress" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </section>

          {/* Message input */}
          <footer className="chat-input-footer glass-card">
            <form
              className="chat-input-form"
              onSubmit={handleSendMessage}
            >
              <textarea
                className="chat-textarea"
                placeholder={
                  browserAgentMode
                    ? 'Describe the browser task you want to perform...'
                    : `Ask ${currentAgent?.name || 'your agent'} a question...`
                }
                value={inputText}
                onChange={(event) =>
                  setInputText(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                disabled={sending}
                aria-label="Message"
              />

              <button
                type="submit"
                className="btn btn-primary chat-send-btn"
                disabled={!inputText.trim() || sending}
              >
                <Send size={16} />
                <span>{sending ? 'Sending...' : 'Send'}</span>
              </button>
            </form>

            <div className="chat-security-disclaimer">
              <ShieldCheck size={13} />
              <span>
                Universal AI Guardrail · Input and output protection depends on
                your configured backend pipeline.
              </span>
            </div>
          </footer>
        </main>
      </div>

      {/* Guardrail forensics modal */}
      {riskDetail && (
        <div
          className="modal-overlay"
          onClick={closeRiskDetail}
          role="presentation"
        >
          <section
            className="modal-card glass-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="risk-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <div className="chat-modal-title">
                <Shield size={20} />
                <h3 id="risk-modal-title">
                  Guardrail Inspection
                </h3>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={closeRiskDetail}
                aria-label="Close inspection"
              >
                <X size={16} />
              </button>
            </header>

            <div className="modal-body">
              <div className="forensic-row">
                <span className="forensic-label">Decision</span>

                <span
                  className={`status-pill-badge ${
                    riskDetail.decision === 'ALLOW'
                      ? 'allow'
                      : riskDetail.decision === 'WARN'
                        ? 'warn'
                        : 'block'
                  }`}
                >
                  {riskDetail.decision || 'UNKNOWN'}
                </span>
              </div>

              <div className="forensic-row">
                <span className="forensic-label">Risk Score</span>

                <strong
                  className={
                    riskPercent > 40
                      ? 'chat-risk-high'
                      : 'chat-risk-low'
                  }
                >
                  {riskPercent}%
                </strong>
              </div>

              <div className="forensic-row">
                <span className="forensic-label">Severity</span>
                <span>{riskDetail.risk_level || 'LOW'}</span>
              </div>

              <div className="forensic-row forensic-explanation">
                <span className="forensic-label">Explanation</span>

                <p>
                  {riskDetail.detection_reason ||
                    'No explanation was returned by the backend.'}
                </p>
              </div>

              {riskDetail.triggered_rules?.length > 0 && (
                <div className="forensic-row forensic-explanation">
                  <span className="forensic-label">
                    Triggered Rules
                  </span>

                  <div className="chat-indicator-list">
                    {riskDetail.triggered_rules.map(
                      (rule, index) => (
                        <span
                          className="indicator-chip"
                          key={index}
                        >
                          <AlertTriangle size={10} />
                          {String(rule)}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <footer className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={closeRiskDetail}
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Scoped styles */}
      <style>{`
        .chat-workspace-brand,
        .chat-header-controls,
        .chat-agent-title,
        .chat-mode-toolbar,
        .chat-loading-label,
        .chat-modal-title {
          display: flex;
          align-items: center;
        }

        .chat-workspace-brand { gap: 12px; min-width: 0; }
        .chat-header-controls { gap: 10px; flex-wrap: wrap; }
        .chat-agent-heading { min-width: 0; }
        .chat-agent-title { gap: 8px; flex-wrap: wrap; }
        .chat-agent-title h3 { margin: 0; color: #fff; font-size: 16px; }
        .model-selector-wrap, .chat-agent-selector { display: flex; flex-direction: column; gap: 4px; }
        .model-selector-label, .chat-agent-selector label { display: flex; gap: 5px; align-items: center; color: #94a3b8; font-size: 9px; font-weight: 700; letter-spacing: .1em; }
        .model-selector-label svg { color: #06b6d4; }
        .model-select-control { position: relative; }
        .model-select-control > svg { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94a3b8; }
        .model-selector { width: 170px; min-height: 34px; padding: 7px 28px 7px 10px; color: #e2e8f0; background: #0d1322; border: 1px solid rgba(6,182,212,.3); border-radius: 8px; font-size: 11px; appearance: none; }
        .model-selector option { color: #e2e8f0; background: #0d1322; }
        .chat-agent-selector select { width: 175px; font-size: 12px; }
        .chat-error-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; margin: 10px 0; border: 1px solid rgba(239,68,68,.3); border-radius: 8px; background: rgba(239,68,68,.08); color: #fca5a5; font-size: 12px; }
        .chat-mode-toolbar { flex-wrap: wrap; gap: 10px; padding: 10px 12px; margin-bottom: 10px; border: 1px solid rgba(6,182,212,.25); border-radius: 10px; background: rgba(6,182,212,.06); }
        .chat-mode-description { color: #94a3b8; font-size: 11px; }
        .chat-history-heading { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 14px; color: #e2e8f0; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .chat-history-empty { padding: 20px 0; color: var(--text-secondary); font-size: 12px; text-align: center; }
        .history-conv-info { flex: 1; min-width: 0; }
        .chat-message-bubble { min-width: 0; overflow-wrap: anywhere; }
        .chat-message-bubble p { margin: 0 0 6px; white-space: pre-wrap; }
        .message-bubble-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
        .risk-badge-tag { display: inline-flex; align-items: center; gap: 4px; border-radius: 99px; padding: 3px 8px; font-size: 10px; font-weight: 700; cursor: pointer; }
        .risk-allow { color: #6ee7b7; background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.3); }
        .risk-block { color: #fca5a5; background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); }
        .risk-warn { color: #fde68a; background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.3); }
        .risk-analyzing { color: #a5b4fc; background: rgba(99,102,241,.12); border: 1px solid rgba(99,102,241,.3); }
        .chat-indicator-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
        .chat-detection-reason { margin-top: 8px; color: #94a3b8; font-size: 11px; }
        .chat-input-form { display: flex; align-items: flex-end; gap: 10px; }
        .chat-textarea { flex: 1; min-width: 0; }
        .chat-send-btn { display: flex; align-items: center; justify-content: center; gap: 7px; }
        .chat-security-disclaimer { display: flex; align-items: center; gap: 6px; margin-top: 8px; color: var(--text-muted); font-size: 11px; }
        .chat-security-disclaimer svg { flex-shrink: 0; color: #10b981; }
        .chat-loading-label { gap: 10px; font-size: 12px; color: #cbd5e1; }
        .chat-modal-title { gap: 8px; }
        .chat-modal-title svg { color: #06b6d4; }
        .chat-modal-title h3 { margin: 0; color: #fff; font-size: 16px; }
        .forensic-explanation { align-items: flex-start; flex-direction: column; gap: 7px; }
        .forensic-explanation p { margin: 0; color: #cbd5e1; font-size: 13px; overflow-wrap: anywhere; }
        .chat-risk-high { color: #f87171; }
        .chat-risk-low { color: #34d399; }

        .chat-workspace-fullscreen {
          height: 100vh;
          max-width: none;
          width: 100%;
          margin: 0;
          padding: 12px 16px 14px;
          box-sizing: border-box;
        }
        .chat-workspace-fullscreen .chat-layout-body { flex: 1; min-height: 0; }
        .chat-workspace-fullscreen .chat-history-sidebar { width: 270px; }
        .chat-workspace-fullscreen .chat-main-panel { min-height: 0; }

        @media (max-width: 900px) {
          .chat-header-bar { flex-wrap: wrap; gap: 12px; }
          .chat-header-controls { width: 100%; }
        }

        @media (max-width: 600px) {
          .chat-header-controls { align-items: stretch; }
          .model-selector-wrap, .model-select-control, .model-selector,
          .chat-agent-selector, .chat-agent-selector select { width: 100%; }
          .chat-input-form { align-items: stretch; }
          .chat-send-btn { padding: 0 12px; }
        }
      `}</style>
    </div>
  );
}

export default ChatWorkspacePage;