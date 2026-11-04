
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Search,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';

import { fetchOllamaModels } from '../services/api';

const MODEL_DETAILS = {
  llama: {
    icon: '🦙',
    description: 'A versatile model for everyday conversations and coding.'
  },
  mistral: {
    icon: '🌪️',
    description: 'A general-purpose model for writing and reasoning.'
  },
  qwen: {
    icon: '🧠',
    description: 'Useful for coding, reasoning, and problem-solving.'
  },
  deepseek: {
    icon: '🔍',
    description: 'A reasoning-focused model for complex questions.'
  },
  gemma: {
    icon: '✨',
    description: 'A compact model for general assistance.'
  }
};

function getModelDetails(modelName) {
  const name = modelName.toLowerCase();
  const match = Object.keys(MODEL_DETAILS).find((key) =>
    name.includes(key)
  );

  return (
    MODEL_DETAILS[match] || {
      icon: '🤖',
      description: 'An installed local Ollama model.'
    }
  );
}

function formatModelName(modelName) {
  return modelName
    .replace(/:latest$/, '')
    .replace(/[-_:]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatModelSize(bytes) {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) {
    return '';
  }

  const gb = Number(bytes) / (1024 ** 3);

  return gb >= 1
    ? `${gb.toFixed(1)} GB`
    : `${(Number(bytes) / (1024 ** 2)).toFixed(0)} MB`;
}

export function AgentSelectionPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  const loadModels = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetchOllamaModels();
      const installedModels = Array.isArray(response)
        ? response
        : response?.models || [];

      setModels(
        installedModels
          .filter((item) => item?.name || item?.model)
          .map((item) => {
            const model = item.name || item.model;
            const details = getModelDetails(model);

            return {
              model,
              name: formatModelName(model),
              icon: details.icon,
              description: details.description,
              size: formatModelSize(item.size)
            };
          })
      );
    } catch (err) {
      console.error('Failed to load Ollama models:', err);
      setError(
        err.message ||
          'Could not load installed models. Check that the backend and Ollama are running.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const filteredModels = models.filter((item) => {
    const query = searchQuery.trim().toLowerCase();

    return (
      item.name.toLowerCase().includes(query) ||
      item.model.toLowerCase().includes(query)
    );
  });

  const openWorkspace = (item) => {
    // Keep the exact installed Ollama model name for inference.
    // A stable agent ID is used for the protected chat workspace.
    navigate('/chat/general-assistant', {
      state: {
        selectedModel: item.model,
        modelName: item.name
      }
    });
  };

  return (
    <div className="content-page">
      <div
        className="page-header-banner glass-card"
        style={{ marginBottom: 24 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div
              className="section-badge"
              style={{ marginBottom: 10 }}
            >
              <ShieldCheck size={14} color="#10b981" />
              <span>UNIVERSAL AI GUARDRAIL</span>
            </div>

            <h2
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#fff',
                marginBottom: 8
              }}
            >
              Choose Your AI Model
            </h2>

            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary, #94a3b8)',
                maxWidth: 700,
                lineHeight: 1.6
              }}
            >
              Select an installed Ollama model. Each model has its own
              conversation history, while prompts and responses continue
              through your existing guardrail pipeline.
            </p>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={loadModels}
            disabled={loading}
            title="Refresh installed models"
          >
            <RefreshCw
              size={14}
              className={loading ? 'spin' : ''}
            />
            Refresh
          </button>
        </div>

        <div
          className="input-with-icon"
          style={{ marginTop: 20, maxWidth: 500 }}
        >
          <Search size={16} className="input-icon" />
          <input
            type="text"
            placeholder="Search installed models..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            style={{
              paddingLeft: 38,
              height: 42,
              width: '100%'
            }}
          />
        </div>
      </div>

      {loading ? (
        <div
          className="glass-card"
          style={{ textAlign: 'center', padding: 50 }}
        >
          <RefreshCw
            size={30}
            className="spin"
            style={{ color: '#06b6d4', marginBottom: 12 }}
          />
          <p>Loading installed Ollama models...</p>
        </div>
      ) : error ? (
        <div
          className="glass-card"
          style={{ padding: 24, textAlign: 'center' }}
        >
          <p style={{ color: '#f87171', marginBottom: 16 }}>
            {error}
          </p>

          <button
            className="btn btn-primary"
            onClick={loadModels}
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              color: 'var(--text-secondary, #94a3b8)',
              fontSize: 13
            }}
          >
            <Cpu size={16} />
            <span>
              {models.length} installed model
              {models.length === 1 ? '' : 's'} available
            </span>
          </div>

          <div className="agent-selection-grid">
            {filteredModels.map((item) => (
              <div
                key={item.model}
                className="agent-select-card glass-card"
              >
                <div className="agent-card-top">
                  <div className="agent-select-icon">
                    {item.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="agent-select-title">
                      {item.name}
                    </h3>

                    <span className="agent-select-id">
                      {item.model}
                    </span>
                  </div>
                </div>

                <p
                  className="agent-select-desc"
                  style={{ marginTop: 16 }}
                >
                  {item.description}
                </p>

                {item.size && (
                  <p
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: 'var(--text-secondary, #94a3b8)'
                    }}
                  >
                    Model size: {item.size}
                  </p>
                )}

                <div
                  className="agent-security-status-box"
                  style={{ marginTop: 16 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <span
                      className="pulse-dot"
                      style={{ backgroundColor: '#10b981' }}
                    />

                    <span
                      style={{
                        fontSize: 12,
                        color: '#10b981'
                      }}
                    >
                      Installed in Ollama
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-primary agent-launch-btn"
                  style={{
                    width: '100%',
                    marginTop: 16,
                    justifyContent: 'center'
                  }}
                  onClick={() => openWorkspace(item)}
                >
                  <span>Open Workspace</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>

          {filteredModels.length === 0 && (
            <div
              className="glass-card"
              style={{ padding: 30, textAlign: 'center' }}
            >
              <Bot size={32} />
              <p style={{ marginTop: 12 }}>
                {models.length === 0
                  ? 'No Ollama models are installed. Install one with the ollama pull command.'
                  : 'No models match your search.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
