from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL, 
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def ensure_schema_migrations():
    """Ensure newly added tables and columns exist in database."""
    try:
        # Import models so Base has all metadata
        import app.models.log
        Base.metadata.create_all(bind=engine)

        with engine.connect() as conn:
            # Check users columns
            user_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(users);").fetchall()]
            if user_cols and "is_active" not in user_cols:
                conn.exec_driver_sql("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1;")

            # Check guardrail_audit_logs columns
            cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(guardrail_audit_logs);").fetchall()]
            if cols:
                if "website_url" not in cols:
                    conn.exec_driver_sql("ALTER TABLE guardrail_audit_logs ADD COLUMN website_url VARCHAR(256);")
                if "source_domain" not in cols:
                    conn.exec_driver_sql("ALTER TABLE guardrail_audit_logs ADD COLUMN source_domain VARCHAR(128);")
                if "resource_type" not in cols:
                    conn.exec_driver_sql("ALTER TABLE guardrail_audit_logs ADD COLUMN resource_type VARCHAR(64) DEFAULT 'user_input';")
                if "scan_status" not in cols:
                    conn.exec_driver_sql("ALTER TABLE guardrail_audit_logs ADD COLUMN scan_status VARCHAR(32) DEFAULT 'CLEAN';")
                if "action_taken" not in cols:
                    conn.exec_driver_sql("ALTER TABLE guardrail_audit_logs ADD COLUMN action_taken VARCHAR(32) DEFAULT 'ALLOWED';")
                if "user_id" not in cols:
                    conn.exec_driver_sql("ALTER TABLE guardrail_audit_logs ADD COLUMN user_id VARCHAR(64);")
                if "conversation_id" not in cols:
                    conn.exec_driver_sql("ALTER TABLE guardrail_audit_logs ADD COLUMN conversation_id VARCHAR(64);")

            # Check security_alerts columns
            cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(security_alerts);").fetchall()]
            if cols:
                if "website_url" not in cols:
                    conn.exec_driver_sql("ALTER TABLE security_alerts ADD COLUMN website_url VARCHAR(256);")
                if "attack_type" not in cols:
                    conn.exec_driver_sql("ALTER TABLE security_alerts ADD COLUMN attack_type VARCHAR(64);")
                if "action_taken" not in cols:
                    conn.exec_driver_sql("ALTER TABLE security_alerts ADD COLUMN action_taken VARCHAR(32) DEFAULT 'BLOCKED';")

            # Check agents columns
            cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(agents);").fetchall()]
            if cols:
                if "api_key" not in cols:
                    conn.exec_driver_sql("ALTER TABLE agents ADD COLUMN api_key VARCHAR(128) DEFAULT 'ag_live_key_default';")
                if "api_key_hash" not in cols:
                    conn.exec_driver_sql("ALTER TABLE agents ADD COLUMN api_key_hash VARCHAR(128);")
                if "user_id" not in cols:
                    conn.exec_driver_sql("ALTER TABLE agents ADD COLUMN user_id VARCHAR(64);")
                if "integration_method" not in cols:
                    conn.exec_driver_sql("ALTER TABLE agents ADD COLUMN integration_method VARCHAR(32) DEFAULT 'API';")
                if "protection_mode" not in cols:
                    conn.exec_driver_sql("ALTER TABLE agents ADD COLUMN protection_mode VARCHAR(32) DEFAULT 'AUTOMATIC_BLOCK';")
                if "slug" not in cols:
                    conn.exec_driver_sql("ALTER TABLE agents ADD COLUMN slug VARCHAR(64);")
                if "category" not in cols:
                    conn.exec_driver_sql("ALTER TABLE agents ADD COLUMN category VARCHAR(64) DEFAULT 'General AI';")
                if "enabled" not in cols:
                    conn.exec_driver_sql("ALTER TABLE agents ADD COLUMN enabled BOOLEAN DEFAULT 1;")
            conn.commit()
    except Exception as e:
        print(f"Notice: schema migration skipped or already applied: {e}")

def get_db():
    """Database session generator."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
