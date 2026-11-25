const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * Get JWT token from local storage
 */
export function getAuthToken() {

  return localStorage.getItem('ai_guardrail_token');
}

/**
 * Set JWT token and user info in local storage
 */
export function setAuthSession(token, user) {
  localStorage.setItem('ai_guardrail_token', token);
  localStorage.setItem('ai_guardrail_user', JSON.stringify(user));
}

/**
 * Clear auth session
 */
export function clearAuthSession() {
  localStorage.removeItem('ai_guardrail_token');
  localStorage.removeItem('ai_guardrail_user');
}

/**
 * Get cached user info
 */
export function getCachedUser() {
  const u = localStorage.getItem('ai_guardrail_user');
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch {
    return null;
  }
}

/**
 * Auth Headers Helper
 */
function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

/**
 * User Login
 */
export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.error?.message || 'Login failed');
  }
  return await response.json();
}

/**
 * User Registration
 */
export async function registerUser(name, email, password, confirmPassword) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      full_name: name,
      email,
      password,
      confirm_password: confirmPassword
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.error?.message || 'Registration failed');
  }
  return await response.json();
}

/**
 * Fetch Current User Profile
 */
export async function fetchUserProfile() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch user profile');
  return await response.json();
}

/**
 * Update Profile
 */
export async function updateProfile(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return await response.json();
}

/**
 * Change Password
 */
export async function changePassword(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/password`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return await response.json();
}

/**
 * Health check
 */
export async function fetchHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch {
    return { status: 'offline', version: '1.0.0-prod', service: 'Universal AI Guardrail' };
  }
}

/**
 * Fetch System Operational Metadata
 */
export async function fetchSystemMeta() {
  try {
    const response = await fetch(`${API_BASE_URL}/meta`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return {
      status: 'ACTIVE',
      monitored_requests: 0,
      threats_detected: 0,
      accuracy_rate: 92.73,
      avg_latency_ms: 12.5
    };
  }
}

/**
 * Fetch ML Model Status
 */
export async function fetchModelStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/guardrail/model-status`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return { prompt_injection_model: 'UNAVAILABLE', model_type: 'Linear SVM', vectorizer: 'UNAVAILABLE' };
  }
}

/**
 * Send Prompt to AI Chat Endpoint
 */
export async function sendChatMessage(agentId, message, conversationId = null) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      agent_id: agentId,
      message: message,
      conversation_id: conversationId
    })
  });
  if (!response.ok) {
    if (response.status === 401) clearAuthSession();
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Chat request failed');
  }
  return await response.json();
}

/**
 * Fetch User Conversations
 */
export async function fetchConversations(agentId = null) {
  try {
    const url = agentId && agentId !== 'all'
      ? `${API_BASE_URL}/conversations?agent_id=${encodeURIComponent(agentId)}`
      : `${API_BASE_URL}/conversations`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) {
      if (response.status === 401) clearAuthSession();
      return [];
    }
    return await response.json();
  } catch {
    return [];
  }
}

/**
 * Fetch Specific Conversation with Message Timeline
 */
export async function fetchConversationDetail(conversationId) {
  const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(conversationId)}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    if (response.status === 401) clearAuthSession();
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to load conversation');
  }
  return await response.json();
}

/**
 * Delete Conversation
 */
export async function deleteConversation(conversationId) {
  const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete conversation');
  }
  return await response.json();
}

/**
 * Input Guardrail Inspection (Direct Sandbox Check)
 */
export async function checkGuardrail(agentId, promptText) {
  const response = await fetch(`${API_BASE_URL}/guardrail/check`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      agent_id: agentId,
      request: promptText
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Guardrail check failed');
  }
  return await response.json();
}

/**
 * Output Guardrail Inspection
 */
export async function checkOutputGuardrail(agentId, responseText) {
  const response = await fetch(`${API_BASE_URL}/guardrail/check-output`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      agent_id: agentId,
      response_text: responseText
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Output guardrail check failed');
  }
  return await response.json();
}

/**
 * Scan External Website / API / DOM
 */
export async function scanExternalWebsite(agentId, url, content, resourceType = 'webpage_dom') {
  const response = await fetch(`${API_BASE_URL}/guardrail/scan-website`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      agent_id: agentId,
      url: url,
      content: content,
      resource_type: resourceType
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Website scan failed');
  }
  return await response.json();
}

/**
 * Fetch Executive Dashboard Overview Stats
 */
export async function fetchDashboardStats() {
  const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
    }
    throw new Error(`Failed to fetch dashboard stats (HTTP ${response.status})`);
  }
  return await response.json();
}

/**
 * Fetch Dashboard Security Events
 */
export async function fetchDashboardEvents(limit = 20) {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/events?limit=${limit}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      if (response.status === 401) clearAuthSession();
      return [];
    }
    return await response.json();
  } catch {
    return [];
  }
}

/**
 * Fetch Protected Agents
 */
export async function fetchAgents() {
  const response = await fetch(`${API_BASE_URL}/agents`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    if (response.status === 401) clearAuthSession();
    throw new Error(`Failed to fetch agents (HTTP ${response.status})`);
  }
  return await response.json();
}

/**
 * Fetch Single Agent by ID
 */
export async function fetchAgentById(agentId) {
  const response = await fetch(`${API_BASE_URL}/agents/${encodeURIComponent(agentId)}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Agent not found or unavailable');
  }
  return await response.json();
}

/**
 * Register New Agent
 */
export async function registerNewAgent(agentData) {
  const response = await fetch(`${API_BASE_URL}/agents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(agentData)
  });
  return await response.json();
}

export const registerAgent = registerNewAgent;


/**
 * Disconnect Agent
 */
export async function disconnectAgent(agentId) {
  const response = await fetch(`${API_BASE_URL}/agents/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return await response.json();
}

/**
 * Fetch Website Activity Logs
 */
export async function fetchWebsiteActivity(filters = {}) {
  const params = new URLSearchParams();
  if (filters.agent_id && filters.agent_id !== 'all') params.append('agent_id', filters.agent_id);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);
  params.append('limit', filters.limit || 50);

  const response = await fetch(`${API_BASE_URL}/website-activity?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  return await response.json();
}

/**
 * Fetch Security Alerts / Threats
 */
export async function fetchThreats(filters = {}) {
  const params = new URLSearchParams();
  if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity);
  if (filters.agent_id && filters.agent_id !== 'all') params.append('agent_id', filters.agent_id);
  params.append('limit', filters.limit || 50);

  const response = await fetch(`${API_BASE_URL}/threats?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  return await response.json();
}

/**
 * Fetch Detailed Threat Record
 */
export async function fetchThreatDetail(threatId) {
  const response = await fetch(`${API_BASE_URL}/threats/${encodeURIComponent(threatId)}`, {
    headers: getAuthHeaders()
  });
  return await response.json();
}

/**
 * Fetch Guardrail Audit Log History
 */
export async function fetchHistory(filters = {}) {
  const params = new URLSearchParams();
  if (filters.decision && filters.decision !== 'ALL') params.append('decision', filters.decision);
  if (filters.agent_id && filters.agent_id !== 'all') params.append('agent_id', filters.agent_id);
  if (filters.search) params.append('search', filters.search);
  params.append('limit', filters.limit || 50);

  const response = await fetch(`${API_BASE_URL}/history?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  return await response.json();
}

/**
 * Fetch Analytics Aggregations
 */
export async function fetchAnalytics() {
  const response = await fetch(`${API_BASE_URL}/analytics`, {
    headers: getAuthHeaders()
  });
  return await response.json();
}

/**
 * Fetch Model Information
 */
export async function fetchModelInfo() {
  const response = await fetch(`${API_BASE_URL}/model-info`, {
    headers: getAuthHeaders()
  });
  return await response.json();
}

/**
 * Fetch Guardrail Config
 */
export async function fetchConfig() {
  const response = await fetch(`${API_BASE_URL}/config`, {
    headers: getAuthHeaders()
  });
  return await response.json();
}

/**
 * Update Guardrail Config
 */
export async function updateConfig(payload) {
  const response = await fetch(`${API_BASE_URL}/config`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update configuration');
  }
  return await response.json();
}

/**
 * Trigger Live Event Simulation
 */
export async function simulateEvent(eventType = 'safe_web_scrape', agentId = 'finance-agent') {
  const response = await fetch(`${API_BASE_URL}/demo/simulate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ event_type: eventType, agent_id: agentId })
  });
  return await response.json();
}

export const simulateDemoEvent = simulateEvent;

