from datetime import datetime, timezone

from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.services.guardrail_service import GuardrailService, guardrail_service
from app.database.session import get_db
from app.models.log import ApiKey, Agent
from app.core.security import hash_api_key


def get_guardrail_service() -> GuardrailService:
    """Dependency provider for GuardrailService."""
    return guardrail_service


def get_agent_from_api_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db)
) -> Agent:
    """Authenticate an external AI agent using its API key."""

    key_hash = hash_api_key(x_api_key)

    api_key = (
        db.query(ApiKey)
        .filter(
            ApiKey.key_hash == key_hash,
            ApiKey.revoked_at.is_(None)
        )
        .first()
    )

    if api_key:
        agent = db.query(Agent).filter(
            Agent.id == api_key.agent_id,
            Agent.enabled == True
        ).first()

        if agent:
            api_key.last_used_at = datetime.now(timezone.utc)
            db.commit()
            return agent

    # Backward compatibility with existing agent.api_key records
    agent = db.query(Agent).filter(
        Agent.api_key == x_api_key,
        Agent.enabled == True
    ).first()

    if agent:
        return agent

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or revoked API key"
    )