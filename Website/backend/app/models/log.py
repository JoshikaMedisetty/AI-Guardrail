import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, JSON, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    """User account for cybersecurity SaaS dashboard authentication."""
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(32), default="Security Administrator")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        return self.name

    @property
    def hashed_password(self) -> str:
        return self.password_hash

class Agent(Base):
    """Registered Protected AI Agents."""
    __tablename__ = "agents"

    id = Column(String(64), primary_key=True, index=True)
    slug = Column(String(64), nullable=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(128), nullable=False)
    icon = Column(String(16), default="🤖")
    category = Column(String(64), default="General AI")
    status = Column(String(32), default="Protected")  # Protected, Standby, Disconnected
    enabled = Column(Boolean, default=True)
    integration_method = Column(String(32), default="API")  # API, Python SDK, REST API
    request_count = Column(Integer, default=0)
    threat_count = Column(Integer, default=0)
    avg_latency_ms = Column(Float, default=12.5)
    description = Column(Text, default="")
    api_key = Column(String(128), default="ag_live_key_default")
    api_key_hash = Column(String(128), nullable=True)
    protection_mode = Column(String(32), default="AUTOMATIC_BLOCK")  # AUTOMATIC_BLOCK, WARN_ONLY
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_activity = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversations = relationship("Conversation", back_populates="agent", cascade="all, delete-orphan")

class Conversation(Base):
    """Interactive Chat Session with a specific protected AI Agent."""
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id"), nullable=False, index=True)
    title = Column(String(256), default="New Security Guarded Chat")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="conversations")
    agent = relationship("Agent", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at.asc()")

class Message(Base):
    """Individual user prompt or AI response with attached Guardrail analysis."""
    __tablename__ = "messages"

    id = Column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(64), ForeignKey("conversations.id"), nullable=False, index=True)
    sender = Column(String(32), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(16), default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    decision = Column(String(16), default="ALLOW")  # ALLOW, WARN, BLOCK
    detection_reason = Column(Text, nullable=True)
    triggered_rules = Column(JSON, default=list)
    ml_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    conversation = relationship("Conversation", back_populates="messages")

class ApiKey(Base):
    """API Keys for agent integration and authentication."""
    __tablename__ = "api_keys"

    id = Column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id"), nullable=True, index=True)
    name = Column(String(128), default="Default Agent Key")
    key_prefix = Column(String(32), nullable=False)  # e.g. "grd_live_a1b2..."
    key_hash = Column(String(128), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)

class GuardrailAuditLog(Base):
    """Audit log table recording each intercepted and inspected agent transaction."""
    __tablename__ = "guardrail_audit_logs"

    id = Column(String(64), primary_key=True, index=True)
    agent_id = Column(String(64), index=True, nullable=False)
    user_id = Column(String(64), nullable=True, index=True)
    conversation_id = Column(String(64), nullable=True, index=True)
    website_url = Column(String(256), nullable=True)
    source_domain = Column(String(128), nullable=True, index=True)
    resource_type = Column(String(64), default="user_input")  # user_input, webpage_dom, api_response, tool_output
    scan_status = Column(String(32), default="CLEAN")  # CLEAN, THREAT_DETECTED
    action_taken = Column(String(32), default="ALLOWED")  # ALLOWED, BLOCKED, WARNED
    request_text = Column(Text, nullable=False)
    decision = Column(String(16), nullable=False)  # ALLOW, WARN, BLOCK
    risk_score = Column(Float, nullable=False)
    confidence = Column(Float, nullable=True)
    attack_type = Column(String(64), nullable=True)
    severity = Column(String(16), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    model_prediction = Column(String(32), nullable=True)
    model_score = Column(Float, nullable=True)
    detected_indicators = Column(JSON, default=list)
    explanation = Column(Text, nullable=False)
    processing_time_ms = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class SecurityAlert(Base):
    """Forensic Security Alert records generated upon high/critical threat detection."""
    __tablename__ = "security_alerts"

    id = Column(String(64), primary_key=True, index=True)
    request_id = Column(String(64), index=True, nullable=False)
    agent_id = Column(String(64), index=True, nullable=False)
    agent_name = Column(String(128), nullable=False)
    website_url = Column(String(256), nullable=True)
    attack_type = Column(String(64), nullable=True)
    threat = Column(String(64), nullable=False)
    severity = Column(String(16), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    risk_score = Column(Float, nullable=False)
    confidence = Column(Float, nullable=True)
    model_name = Column(String(64), default="Linear SVM")
    model_prediction = Column(String(32), nullable=True)
    model_score = Column(Float, nullable=True)
    status = Column(String(16), default="BLOCKED")
    action_taken = Column(String(32), default="BLOCKED")
    detected_input = Column(Text, nullable=False)
    what_detected = Column(Text, nullable=False)
    why_blocked = Column(Text, nullable=False)
    indicators = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class GuardrailSettingsModel(Base):
    """Dynamic persistent user/system configuration and feature toggles."""
    __tablename__ = "guardrail_settings"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), nullable=True, index=True)
    prompt_injection_enabled = Column(Boolean, default=True)
    jailbreak_enabled = Column(Boolean, default=True)
    system_prompt_protection = Column(Boolean, default=True)
    data_leakage_detection = Column(Boolean, default=True)
    output_validation = Column(Boolean, default=True)
    webpage_scanning = Column(Boolean, default=True)
    dom_scanning = Column(Boolean, default=True)
    api_response_scanning = Column(Boolean, default=True)
    tool_output_scanning = Column(Boolean, default=True)
    block_mode = Column(String(32), default="BLOCK")  # BLOCK, WARN
    low_threshold = Column(Float, default=0.40)
    medium_threshold = Column(Float, default=0.70)
    high_threshold = Column(Float, default=0.85)
    notify_critical = Column(Boolean, default=True)
    notify_blocked = Column(Boolean, default=True)
    notify_warnings = Column(Boolean, default=False)
    notify_agent_changes = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class SystemConfigModel(Base):
    """Key-value dynamic system configurations."""
    __tablename__ = "system_configs"

    key = Column(String(64), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(256), default="")
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    """Audit log for system management events (connect agent, api key changes, etc)."""
    __tablename__ = "audit_events"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), nullable=True, index=True)
    event_type = Column(String(64), nullable=False)  # AGENT_CONNECTED, API_KEY_GENERATED, CONFIG_CHANGED, etc.
    description = Column(Text, nullable=False)
    ip_address = Column(String(64), default="127.0.0.1")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
