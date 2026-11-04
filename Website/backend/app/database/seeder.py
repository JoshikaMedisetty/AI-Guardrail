from datetime import datetime, timezone
from app.database.session import SessionLocal
from app.models.log import User, Agent, SystemConfigModel, SecurityAlert
from app.core.security import get_password_hash

def seed_database():
    """Seed initial protected agents, admin user, and system configurations."""
    db = SessionLocal()
    try:
        # 1. Seed Default Security Administrator User
        admin_user = db.query(User).filter(User.email == "security@guardrail.ai").first()
        if not admin_user:
            admin_user = User(
                id="usr-admin-sec-01",
                name="Security Administrator",
                email="security@guardrail.ai",
                password_hash=get_password_hash("Admin@12345"),
                role="Security Administrator",
                is_active=True
            )
            db.add(admin_user)
            db.commit()

        # 2. Seed Default AI Agents
        desired_agents = [
            {
                "id": "general-assistant",
                "slug": "general-assistant",
                "name": "General AI Assistant",
                "icon": "🤖",
                "category": "General",
                "status": "Protected",
                "enabled": True,
                "request_count": 1450,
                "threat_count": 14,
                "avg_latency_ms": 11.5,
                "description": "General questions, reasoning, and comprehensive conversational assistance."
            },
            {
                "id": "coding-agent",
                "slug": "coding-agent",
                "name": "Coding Assistant",
                "icon": "💻",
                "category": "Development",
                "status": "Protected",
                "enabled": True,
                "request_count": 2431,
                "threat_count": 42,
                "avg_latency_ms": 14.6,
                "description": "Programming, code generation, debugging, refactoring, and security reviews."
            },
            {
                "id": "travel-agent",
                "slug": "travel-agent",
                "name": "Travel Assistant",
                "icon": "✈️",
                "category": "Travel",
                "status": "Protected",
                "enabled": True,
                "request_count": 1245,
                "threat_count": 18,
                "avg_latency_ms": 13.4,
                "description": "Travel planning, itinerary design, flight search, and destination queries."
            },
            {
                "id": "finance-agent",
                "slug": "finance-agent",
                "name": "Finance Assistant",
                "icon": "📈",
                "category": "Finance",
                "status": "Protected",
                "enabled": True,
                "request_count": 2180,
                "threat_count": 35,
                "avg_latency_ms": 12.8,
                "description": "General financial information, market research, and investment analytics."
            },
            {
                "id": "research-agent",
                "slug": "research-agent",
                "name": "Research Assistant",
                "icon": "📚",
                "category": "Research",
                "status": "Protected",
                "enabled": True,
                "request_count": 1834,
                "threat_count": 12,
                "avg_latency_ms": 12.9,
                "description": "Scientific inquiries, document synthesis, factual QA, and literature review."
            },
            {
                "id": "banking-agent",
                "slug": "banking-agent",
                "name": "Banking Agent",
                "icon": "🏦",
                "category": "Banking",
                "status": "Protected",
                "enabled": True,
                "request_count": 3120,
                "threat_count": 94,
                "avg_latency_ms": 15.2,
                "description": "Transactional workflows, account balance inquiries, and financial ops."
            },
            {
                "id": "shopping-agent",
                "slug": "shopping-agent",
                "name": "Shopping Agent",
                "icon": "🛒",
                "category": "E-Commerce",
                "status": "Protected",
                "enabled": True,
                "request_count": 856,
                "threat_count": 9,
                "avg_latency_ms": 11.8,
                "description": "Assists with product discovery, cart operations, and price comparisons."
            }
        ]

        for ag in desired_agents:
            existing = db.query(Agent).filter(Agent.id == ag["id"]).first()
            if not existing:
                new_ag = Agent(
                    id=ag["id"],
                    slug=ag["slug"],
                    name=ag["name"],
                    icon=ag["icon"],
                    category=ag["category"],
                    status=ag["status"],
                    enabled=ag["enabled"],
                    request_count=ag["request_count"],
                    threat_count=ag["threat_count"],
                    avg_latency_ms=ag["avg_latency_ms"],
                    description=ag["description"],
                    user_id=admin_user.id if admin_user else None
                )
                db.add(new_ag)
            else:
                # Update slug/category/enabled if missing
                if not getattr(existing, "slug", None):
                    existing.slug = ag["slug"]
                if not getattr(existing, "category", None):
                    existing.category = ag["category"]
                if getattr(existing, "enabled", None) is None:
                    existing.enabled = True

        # 3. Seed Initial Configs
        if db.query(SystemConfigModel).count() == 0:
            initial_configs = [
                SystemConfigModel(key="RISK_THRESHOLD_LOW", value="0.40", description="Threshold for transparent ALLOW decision"),
                SystemConfigModel(key="RISK_THRESHOLD_HIGH", value="0.70", description="Threshold for BLOCK decision and alert trigger"),
                SystemConfigModel(key="MODULE_PROMPT_INJECTION", value="true", description="Enable prompt injection detection"),
                SystemConfigModel(key="MODULE_JAILBREAK", value="true", description="Enable jailbreak & DAN detection"),
                SystemConfigModel(key="MODULE_SYSTEM_PROMPT", value="true", description="Enable system prompt extraction protection"),
                SystemConfigModel(key="MODULE_DATA_LEAKAGE", value="true", description="Enable data exfiltration and callback detection"),
                SystemConfigModel(key="MODULE_OUTPUT_VALIDATION", value="true", description="Enable output guardrail response scanning")
            ]
            db.add_all(initial_configs)

        # 4. Seed sample data
        from app.data.sample_data import seed_rich_operational_data
        seed_rich_operational_data(db)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Database seeding note: {e}")
    finally:
        db.close()
